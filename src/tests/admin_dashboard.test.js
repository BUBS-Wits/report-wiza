import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminDashboard from '../pages/admin/admin_dashboard.js'

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------
import { fetch_workers, revoke_worker_role } from '../backend/admin_firebase.js'

jest.mock('../backend/admin_firebase.js', () => ({
	fetch_workers: jest.fn(),
	revoke_worker_role: jest.fn(),
}))

jest.mock('../pages/admin/admin_dashboard.css', () => ({}))

// Updated to match the new src/components/ folder structure
jest.mock('../components/top_bar/top_bar.js', () => {
	return function MockTopBar() {
		return <div data-testid="mock-top-bar" />
	}
})

jest.mock('../components/stat_cards/stat_cards.js', () => {
	return function MockStatCards({ total }) {
		return <div data-testid="mock-stat-cards">Total: {total}</div>
	}
})

jest.mock('../components/register_worker/register_worker.js', () => {
	return function MockRegisterWorker({ on_registered }) {
		return (
			<button data-testid="mock-register-btn" onClick={on_registered}>
				Simulate Registration
			</button>
		)
	}
})

jest.mock('../components/workers_list/workers_list.js', () => {
	return function MockWorkersList({ workers, on_revoke }) {
		return (
			<div data-testid="mock-workers-list">
				{workers.map((w) => (
					<button
						key={w.id}
						data-testid={`revoke-btn-${w.id}`}
						onClick={() => on_revoke(w.id, w.email)}
					>
						Revoke {w.email}
					</button>
				))}
			</div>
		)
	}
})

jest.mock('../components/sidebar/sidebar.js', () => {
	return function MockSidebar({ on_change }) {
		return (
			<div data-testid="mock-sidebar">
				<button onClick={() => on_change('workers')}>Workers</button>
				<button onClick={() => on_change('requests')}>Requests</button>
				<button onClick={() => on_change('messaging')}>
					Messaging
				</button>
				<button onClick={() => on_change('residents')}>
					Residents
				</button>
				<button onClick={() => on_change('analytics')}>
					Analytics
				</button>
				<button onClick={() => on_change('settings')}>Settings</button>
				<button onClick={() => on_change('unknown_section')}>
					Unknown
				</button>
			</div>
		)
	}
})

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('AdminDashboard', () => {
	const mock_worker_data = [
		{ id: 'w1', email: 'worker1@city.gov' },
		{ id: 'w2', email: 'worker2@city.gov' },
	]

	beforeEach(() => {
		jest.clearAllMocks()
		fetch_workers.mockResolvedValue(mock_worker_data)
	})

	// Helper to ensure tests wait for the initial async load to finish
	const wait_for_initial_load = async () => {
		await waitFor(() => {
			expect(screen.getByTestId('mock-stat-cards')).toHaveTextContent(
				'Total: 2'
			)
		})
	}

	// -----------------------------------------------------------------------
	// 1. Initial Mount & Data Fetching
	// -----------------------------------------------------------------------
	describe('Given the AdminDashboard is mounted', () => {
		describe('When the component initializes successfully', () => {
			it('Then it should fetch workers and render the workers section by default', async () => {
				render(<AdminDashboard />)

				// Wait for DOM to reflect the fetched data
				await wait_for_initial_load()

				expect(fetch_workers).toHaveBeenCalledTimes(1)
				expect(screen.getByTestId('mock-top-bar')).toBeInTheDocument()
				expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument()
				expect(screen.getByTestId('revoke-btn-w1')).toBeInTheDocument()
			})
		})

		describe('When the worker fetch request fails', () => {
			it('Then it should catch the error and log it to the console', async () => {
				const console_spy = jest
					.spyOn(console, 'error')
					.mockImplementation(() => {})
				fetch_workers.mockRejectedValueOnce(new Error('Firebase Error'))

				render(<AdminDashboard />)

				await waitFor(() => {
					expect(console_spy).toHaveBeenCalledWith(expect.any(Error))
				})

				console_spy.mockRestore()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 2. Child Component Interactions
	// -----------------------------------------------------------------------
	describe('Given the Workers section is active', () => {
		describe('When a new worker is successfully registered', () => {
			it('Then it should trigger a reload of the workers list', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByTestId('mock-register-btn'))

				await waitFor(() => {
					expect(fetch_workers).toHaveBeenCalledTimes(2)
				})
			})
		})
	})

	// -----------------------------------------------------------------------
	// 3. Worker Revocation Logic
	// -----------------------------------------------------------------------
	describe('Given the AdminDashboard is loaded with workers', () => {
		describe('When the admin successfully revokes a worker role', () => {
			it('Then it should remove the worker from the list and show a success message', async () => {
				revoke_worker_role.mockResolvedValueOnce()

				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByTestId('revoke-btn-w1'))

				// Wait for the specific DOM element to disappear!
				await waitFor(() => {
					expect(
						screen.queryByTestId('revoke-btn-w1')
					).not.toBeInTheDocument()
				})

				expect(revoke_worker_role).toHaveBeenCalledWith('w1')
				expect(screen.getByTestId('revoke-btn-w2')).toBeInTheDocument()

				const message_div = screen.getByText(
					'Worker role revoked for worker1@city.gov'
				)
				expect(message_div).toBeInTheDocument()
				expect(message_div).toHaveClass('admin_message success')
			})
		})

		describe('When revoking a worker role fails', () => {
			it('Then it should display an error message', async () => {
				revoke_worker_role.mockRejectedValueOnce(
					new Error('Permission Denied')
				)

				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByTestId('revoke-btn-w2'))

				// Use findByText to automatically wait for the message to appear
				const message_div = await screen.findByText('Permission Denied')
				expect(message_div).toBeInTheDocument()
				expect(message_div).toHaveClass('admin_message error')

				expect(revoke_worker_role).toHaveBeenCalledWith('w2')
				expect(screen.getByTestId('revoke-btn-w2')).toBeInTheDocument()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 4. Sidebar Navigation & Rendering
	// -----------------------------------------------------------------------
	describe('Given the Sidebar is rendered', () => {
		describe('When the Requests section is clicked', () => {
			it('Then it should render the requests placeholder', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load() // Wait to prevent act warnings

				fireEvent.click(screen.getByText('Requests'))
				expect(
					screen.getByText('Requests section — coming soon')
				).toBeInTheDocument()
			})
		})

		describe('When the Messaging section is clicked', () => {
			it('Then it should render the messaging placeholder', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByText('Messaging'))
				expect(
					screen.getByText('Messaging section — coming soon')
				).toBeInTheDocument()
			})
		})

		describe('When the Residents section is clicked', () => {
			it('Then it should render the residents placeholder', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByText('Residents'))
				expect(
					screen.getByText('Residents section — coming soon')
				).toBeInTheDocument()
			})
		})

		describe('When the Analytics section is clicked', () => {
			it('Then it should render the analytics placeholder', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByText('Analytics'))
				expect(
					screen.getByText('Analytics section — coming soon')
				).toBeInTheDocument()
			})
		})

		describe('When the Settings section is clicked', () => {
			it('Then it should render the settings placeholder', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByText('Settings'))
				expect(
					screen.getByText('Settings section — coming soon')
				).toBeInTheDocument()
			})
		})

		describe('When an unknown section is passed to the state', () => {
			it('Then it should return null for the content area safely', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByText('Unknown'))

				expect(
					screen.queryByTestId('mock-workers-list')
				).not.toBeInTheDocument()
				expect(
					screen.queryByText(/coming soon/i)
				).not.toBeInTheDocument()
			})
		})
	})
})
