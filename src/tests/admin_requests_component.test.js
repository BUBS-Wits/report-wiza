import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
	reopen_request,
	assign_request,
} from '../backend/admin_requests_service.js'

jest.mock('../firebase_config.js', () => ({
	auth: { currentUser: { uid: 'admin-uid' } },
	db: {},
}))

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	updateDoc: jest.fn(),
	collection: jest.fn(),
	getDocs: jest.fn(),
	addDoc: jest.fn(),
	serverTimestamp: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	orderBy: jest.fn(),
}))

jest.mock('../components/admin_requests/admin_requests.css', () => ({}))

jest.mock('../backend/admin_requests_service.js', () => ({
	fetch_admin_requests: jest.fn(),
	set_request_priority: jest.fn(),
	close_request: jest.fn(),
	reopen_request: jest.fn(),
	assign_request: jest.fn(),
	fetch_stale_requests: jest.fn(),
	assign_stale_request: jest.fn(),
	fetch_workers_for_assign: jest.fn(),
}))

jest.mock('../components/admin_categories/admin_categories.js', () => {
	return function MockAdminCategories() {
		return <div data-testid="admin-categories">Categories</div>
	}
})

import AdminRequests from '../components/admin_requests/admin_requests.js'
import {
	fetch_admin_requests,
	set_request_priority,
	close_request,
	fetch_stale_requests,
	assign_stale_request,
	fetch_workers_for_assign,
} from '../backend/admin_requests_service.js'

const mock_requests = [
	{
		id: 'req-001',
		category: 'water',
		description: 'Burst pipe',
		status: 'open',
		priority: 'Medium',
	},
	{
		id: 'req-002',
		category: 'road',
		description: 'Pothole',
		status: 'closed',
		priority: 'Low',
	},
]

const mock_workers = [
	{ id: 'w-001', display_name: 'Thabo Mokoena', email: 'thabo@test.com' },
	{ id: 'w-002', display_name: null, email: 'jane@test.com' },
]

const mock_stale = [
	{
		id: 'stale-001',
		category: 'sewage',
		description: 'Blocked drain',
		status: 'open',
		created_at: { toDate: () => new Date('2024-01-01') },
	},
]

// ── Helpers ────────────────────────────────────────────────────────────────

const setup = () => {
	fetch_admin_requests.mockResolvedValue(mock_requests)
	fetch_workers_for_assign.mockResolvedValue(mock_workers)
	fetch_stale_requests.mockResolvedValue(mock_stale)
	return render(<AdminRequests />)
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AdminRequests', () => {
	beforeEach(() => jest.clearAllMocks())

	// ── Loading ────────────────────────────────────────────────────────────

	describe('Given the component is loading', () => {
		it('Then it should show a loading message', () => {
			fetch_admin_requests.mockReturnValue(new Promise(() => {}))
			fetch_workers_for_assign.mockReturnValue(new Promise(() => {}))
			fetch_stale_requests.mockReturnValue(new Promise(() => {}))
			render(<AdminRequests />)
			expect(screen.getByText(/loading requests/i)).toBeInTheDocument()
		})
		describe('Given the status filter is used', () => {
			it('Then it should show all requests by default', async () => {
				setup()
				await waitFor(() => {
					expect(screen.getByText('Burst pipe')).toBeInTheDocument()
					expect(screen.getByText('Pothole')).toBeInTheDocument()
				})
			})

			it('Then clicking Closed filter should show only closed requests', async () => {
				setup()
				await waitFor(() => {
					expect(screen.getByText('Burst pipe')).toBeInTheDocument()
				})
				fireEvent.click(
					screen.getByRole('button', { name: /^Closed$/i })
				)
				await waitFor(() => {
					expect(
						screen.queryByText('Burst pipe')
					).not.toBeInTheDocument()
					expect(screen.getByText('Pothole')).toBeInTheDocument()
				})
			})

			it('Then clicking Open filter should show only open requests', async () => {
				setup()
				await waitFor(() => {
					expect(screen.getByText('Burst pipe')).toBeInTheDocument()
				})
				fireEvent.click(screen.getByRole('button', { name: /^Open$/i }))
				await waitFor(() => {
					expect(screen.getByText('Burst pipe')).toBeInTheDocument()
					expect(
						screen.queryByText('Pothole')
					).not.toBeInTheDocument()
				})
			})
		})

		describe('Given a closed request exists', () => {
			it('Then it should show a Reopen button', async () => {
				setup()
				await waitFor(() => {
					expect(screen.getByText('Reopen')).toBeInTheDocument()
				})
			})

			it('Then clicking Reopen should call reopen_request', async () => {
				reopen_request.mockResolvedValueOnce({ success: true })
				setup()
				await waitFor(() => {
					expect(screen.getByText('Reopen')).toBeInTheDocument()
				})
				fireEvent.click(screen.getByText('Reopen'))
				await waitFor(() => {
					expect(reopen_request).toHaveBeenCalledWith(
						'req-002',
						'admin-uid'
					)
				})
			})
		})

		describe('Given the Assign Worker button is clicked', () => {
			it('Then it should show the worker modal', async () => {
				setup()
				await waitFor(() => {
					expect(
						screen.getAllByText('Assign Worker').length
					).toBeGreaterThan(0)
				})
				fireEvent.click(screen.getAllByText('Assign Worker')[0])
				await waitFor(() => {
					expect(
						screen.getByText('Assign worker')
					).toBeInTheDocument()
				})
			})

			it('Then searching in the modal should filter workers', async () => {
				setup()
				await waitFor(() => {
					expect(
						screen.getAllByText('Assign Worker').length
					).toBeGreaterThan(0)
				})
				fireEvent.click(screen.getAllByText('Assign Worker')[0])
				await waitFor(() => {
					expect(
						screen.getByText('Thabo Mokoena')
					).toBeInTheDocument()
				})
				fireEvent.change(
					screen.getByPlaceholderText(/search by name/i),
					{
						target: { value: 'thabo' },
					}
				)
				await waitFor(() => {
					expect(
						screen.getByText('Thabo Mokoena')
					).toBeInTheDocument()
				})
			})

			it('Then closing the modal should hide it', async () => {
				setup()
				await waitFor(() => {
					expect(
						screen.getAllByText('Assign Worker').length
					).toBeGreaterThan(0)
				})
				fireEvent.click(screen.getAllByText('Assign Worker')[0])
				await waitFor(() => {
					expect(
						screen.getByText('Assign worker')
					).toBeInTheDocument()
				})
				fireEvent.click(screen.getByLabelText('Close'))
				await waitFor(() => {
					expect(
						screen.queryByText('Assign worker')
					).not.toBeInTheDocument()
				})
			})
		})
	})

	// ── Error state ────────────────────────────────────────────────────────

	describe('Given fetching requests fails', () => {
		it('Then it should show an error message', async () => {
			fetch_admin_requests.mockRejectedValueOnce(
				new Error('Could not load requests.')
			)
			fetch_workers_for_assign.mockResolvedValueOnce([])
			fetch_stale_requests.mockResolvedValueOnce([])
			render(<AdminRequests />)
			await waitFor(() =>
				expect(
					screen.getByText(/could not load requests/i)
				).toBeInTheDocument()
			)
		})
	})

	// ── Tabs ───────────────────────────────────────────────────────────────

	describe('Given the component has loaded', () => {
		it('Then it should render the All requests tab', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText(/all requests/i)).toBeInTheDocument()
			)
		})

		it('Then it should render the Stale requests tab', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText(/stale requests/i)).toBeInTheDocument()
			)
		})

		it('Then it should render the Categories tab', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText('Categories')).toBeInTheDocument()
			)
		})

		it('Then clicking Categories tab should show AdminCategories', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText('Categories')).toBeInTheDocument()
			)
			fireEvent.click(screen.getByText('Categories'))
			expect(screen.getByTestId('admin-categories')).toBeInTheDocument()
		})
	})

	// ── All requests ───────────────────────────────────────────────────────

	describe('Given the All requests tab is active', () => {
		it('Then it should display request rows', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText('Burst pipe')).toBeInTheDocument()
			)
			expect(screen.getByText('Pothole')).toBeInTheDocument()
		})

		it('Then it should show an empty state when there are no requests', async () => {
			fetch_admin_requests.mockResolvedValueOnce([])
			fetch_workers_for_assign.mockResolvedValueOnce([])
			fetch_stale_requests.mockResolvedValueOnce([])
			render(<AdminRequests />)
			await waitFor(() =>
				expect(
					screen.getByText(/no requests found/i)
				).toBeInTheDocument()
			)
		})
	})

	// ── US027 — Priority ───────────────────────────────────────────────────

	describe('US027 — Given the admin changes a request priority', () => {
		it('Then it should call set_request_priority', async () => {
			set_request_priority.mockResolvedValueOnce({ success: true })
			setup()
			await waitFor(() =>
				expect(screen.getByText('Burst pipe')).toBeInTheDocument()
			)
			const selects = screen.getAllByRole('combobox')
			fireEvent.change(selects[0], { target: { value: 'High' } })
			await waitFor(() =>
				expect(set_request_priority).toHaveBeenCalledWith(
					'req-001',
					'High'
				)
			)
		})

		it('Then it should show a success message', async () => {
			set_request_priority.mockResolvedValueOnce({ success: true })
			setup()
			await waitFor(() =>
				expect(screen.getByText('Burst pipe')).toBeInTheDocument()
			)
			const selects = screen.getAllByRole('combobox')
			fireEvent.change(selects[0], { target: { value: 'High' } })
			await waitFor(() =>
				expect(
					screen.getByText(/priority updated/i)
				).toBeInTheDocument()
			)
		})
	})

	// ── US028 — Close request ──────────────────────────────────────────────

	describe('US028 — Given the admin closes a request', () => {
		it('Then clicking Close should open the modal', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText('Burst pipe')).toBeInTheDocument()
			)
			fireEvent.click(screen.getByText('Close'))
			expect(screen.getByText(/close request/i)).toBeInTheDocument()
		})

		it('Then submitting without a comment should show a validation error', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText('Burst pipe')).toBeInTheDocument()
			)
			fireEvent.click(screen.getByText('Close'))
			fireEvent.click(screen.getByText('Confirm close'))
			expect(screen.getByText(/comment is required/i)).toBeInTheDocument()
		})

		it('Then submitting with a comment should call close_request', async () => {
			close_request.mockResolvedValueOnce({ success: true })
			setup()
			await waitFor(() =>
				expect(screen.getByText('Burst pipe')).toBeInTheDocument()
			)
			fireEvent.click(screen.getByText('Close'))
			fireEvent.change(screen.getByPlaceholderText(/enter reason/i), {
				target: { value: 'Duplicate request' },
			})
			fireEvent.click(screen.getByText('Confirm close'))
			await waitFor(() => expect(close_request).toHaveBeenCalled())
		})

		it('Then clicking Cancel should close the modal', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText('Burst pipe')).toBeInTheDocument()
			)
			fireEvent.click(screen.getByText('Close'))
			expect(screen.getByText(/close request/i)).toBeInTheDocument()
			fireEvent.click(screen.getByText('Cancel'))
			await waitFor(() =>
				expect(
					screen.queryByText(/close request/i)
				).not.toBeInTheDocument()
			)
		})

		it('Then closed requests should not show a Close button', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText('Pothole')).toBeInTheDocument()
			)
			// req-002 has status 'closed' — only one Close button should exist (for req-001)
			const closeBtns = screen.getAllByText('Close')
			expect(closeBtns).toHaveLength(1)
		})
	})

	// ── US030 — Stale requests ─────────────────────────────────────────────

	describe('US030 — Given the admin views stale requests', () => {
		it('Then clicking Stale requests tab should show stale content', async () => {
			setup()
			await waitFor(() =>
				expect(screen.getByText(/stale requests/i)).toBeInTheDocument()
			)
			fireEvent.click(screen.getByText(/stale requests/i))
			await waitFor(() =>
				expect(screen.getByText('Blocked drain')).toBeInTheDocument()
			)
		})

		it('Then it should show an empty state when no stale requests', async () => {
			fetch_admin_requests.mockResolvedValueOnce(mock_requests)
			fetch_workers_for_assign.mockResolvedValueOnce(mock_workers)
			fetch_stale_requests.mockResolvedValueOnce([])
			render(<AdminRequests />)
			await waitFor(() =>
				expect(screen.getByText(/stale requests/i)).toBeInTheDocument()
			)
			fireEvent.click(screen.getByText(/stale requests/i))
			await waitFor(() =>
				expect(
					screen.getByText(/no stale requests/i)
				).toBeInTheDocument()
			)
		})

		it('Then assigning a worker should call assign_stale_request', async () => {
			assign_stale_request.mockResolvedValueOnce({ success: true })
			setup()
			await waitFor(() =>
				expect(screen.getByText(/stale requests/i)).toBeInTheDocument()
			)
			fireEvent.click(screen.getByText(/stale requests/i))
			await waitFor(() =>
				expect(screen.getByText('Blocked drain')).toBeInTheDocument()
			)
			const assignSelect = screen.getByRole('combobox')
			fireEvent.change(assignSelect, { target: { value: 'w-001' } })
			await waitFor(() =>
				expect(assign_stale_request).toHaveBeenCalledWith(
					'stale-001',
					'w-001'
				)
			)
		})
	})
})
