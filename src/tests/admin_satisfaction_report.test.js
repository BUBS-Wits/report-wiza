/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminSatisfactionReport from '../components/admin_satisfaction_report/admin_satisfaction_report.js'
import {
	fetch_rated_requests,
	fetch_assignments,
	subscribe_to_workers,
} from '../backend/admin_firebase.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../backend/admin_firebase.js', () => ({
	fetch_rated_requests: jest.fn(),
	fetch_assignments: jest.fn(),
	subscribe_to_workers: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

jest.mock('react-router-dom', () => ({
	MemoryRouter: ({ children }) => <div>{children}</div>,
	NavLink: ({ to, children }) => <a href={to}>{children}</a>,
	useLocation: () => ({ pathname: '/' }),
}))

jest.mock('../components/admin_sidebar/admin_sidebar.js', () => {
	const MockSidebar = () => <div data-testid="sidebar" />
	MockSidebar.displayName = 'MockSidebar'
	return MockSidebar
})
jest.mock('../components/top_bar/top_bar.js', () => {
	const MockTopBar = () => <div data-testid="top-bar" />
	MockTopBar.displayName = 'MockTopBar'
	return MockTopBar
})

/* ─────────────────────────────────────────────────────────────────────────────
   Helper Data
───────────────────────────────────────────────────────────────────────────── */

const mock_rated_requests = [
	{ id: 'req_001', category: 'water', rating: 4, status: 'resolved' },
	{ id: 'req_002', category: 'water', rating: 2, status: 'resolved' },
	{ id: 'req_003', category: 'electricity', rating: 3, status: 'closed' },
]

const mock_assignments = [
	{ id: 'asgn_001', request_uid: 'req_001', worker_uid: 'worker_123' },
	{ id: 'asgn_002', request_uid: 'req_002', worker_uid: 'worker_123' },
	{ id: 'asgn_003', request_uid: 'req_003', worker_uid: 'worker_456' },
]

const mock_workers = [
	{ id: 'worker_123', display_name: 'Alice Dlamini', role: 'worker' },
	{ id: 'worker_456', display_name: 'Bob Nkosi', role: 'worker' },
]

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('AdminSatisfactionReport', () => {
	let consoleErrorSpy

	beforeEach(() => {
		jest.clearAllMocks()
		consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})
	})

	afterEach(() => {
		consoleErrorSpy.mockRestore()
	})

	// -------------------------------------------------------------------------
	// 1. Loading State
	// -------------------------------------------------------------------------
	describe('Given the component is mounted', () => {
		describe('When data is still loading', () => {
			it('Then it should display the loading message', () => {
				fetch_rated_requests.mockReturnValue(new Promise(() => {}))
				fetch_assignments.mockReturnValue(new Promise(() => {}))
				// Listener never fires — simulates waiting for Firestore snapshot
				subscribe_to_workers.mockImplementation(() => jest.fn())

				render(<AdminSatisfactionReport />)

				expect(
					screen.getByText('Loading satisfaction report...')
				).toBeInTheDocument()
			})
		})
	})

	// -------------------------------------------------------------------------
	// 2. Empty State
	// -------------------------------------------------------------------------
	describe('Given the component successfully fetches data', () => {
		describe('When there are no rated requests', () => {
			it('Then it should display the empty state message', async () => {
				fetch_rated_requests.mockResolvedValue([])
				fetch_assignments.mockResolvedValue([])
				subscribe_to_workers.mockImplementation((on_update) => {
					on_update([])
					return jest.fn()
				})

				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(
						screen.getByText('No rated requests found.')
					).toBeInTheDocument()
				})
			})
		})

		// -----------------------------------------------------------------------
		// 3. Successful Render
		// -----------------------------------------------------------------------
		describe('When rated requests, assignments, and workers are returned', () => {
			beforeEach(() => {
				fetch_rated_requests.mockResolvedValue(mock_rated_requests)
				fetch_assignments.mockResolvedValue(mock_assignments)
				subscribe_to_workers.mockImplementation((on_update) => {
					// Defer so init() has time to resolve first
					setTimeout(() => on_update(mock_workers), 0)
					return jest.fn()
				})
			})

			it('Then it should display the report title', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(
						screen.getByText('Resident Satisfaction Report')
					).toBeInTheDocument()
				})
			})

			it('Then it should display the correct total rating count', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(
						screen.getByText('Total Ratings')
					).toBeInTheDocument()
				})

				const total_label = screen.getByText('Total Ratings')
				expect(total_label.previousSibling).toHaveTextContent('3')
			})

			it('Then it should display the correct overall average rating', async () => {
				// (4 + 2 + 3) / 3 = 3.0
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(
						screen.getByText('Overall Avg / 4')
					).toBeInTheDocument()
				})

				const avg_label = screen.getByText('Overall Avg / 4')
				expect(avg_label.previousSibling).toHaveTextContent('3')
			})

			it('Then it should display the By Worker section', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(screen.getByText('By Worker')).toBeInTheDocument()
				})
			})

			it('Then it should display worker names from the assignments lookup', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(
						screen.getByText('Alice Dlamini')
					).toBeInTheDocument()
					expect(screen.getByText('Bob Nkosi')).toBeInTheDocument()
				})
			})

			it('Then it should display the correct average for Alice (4+2)/2 = 3.0', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(
						screen.getByText('Alice Dlamini')
					).toBeInTheDocument()
				})

				const alice_row = screen
					.getByText('Alice Dlamini')
					.closest('tr')
				expect(alice_row).toHaveTextContent('3')
				expect(alice_row).toHaveTextContent('2')
			})

			it('Then it should display the By Category section', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(screen.getByText('By Category')).toBeInTheDocument()
				})
			})

			it('Then it should display the correct category labels', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(screen.getByText('Water')).toBeInTheDocument()
					expect(screen.getByText('Electricity')).toBeInTheDocument()
				})
			})

			it('Then categories should be sorted highest average first', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(screen.getByText('Water')).toBeInTheDocument()
				})

				const category_section = screen.getByText('By Category')
				const category_table = category_section
					.closest('section')
					.querySelector('table')
				const first_data_row =
					category_table.querySelectorAll('tbody tr')[0]
				expect(first_data_row).toHaveTextContent('Water')
			})
		})

		// -----------------------------------------------------------------------
		// 4. No Assignments State
		// -----------------------------------------------------------------------
		describe('When requests are rated but none are assigned', () => {
			it('Then it should show the empty worker message', async () => {
				fetch_rated_requests.mockResolvedValue(mock_rated_requests)
				fetch_assignments.mockResolvedValue([])
				subscribe_to_workers.mockImplementation((on_update) => {
					setTimeout(() => on_update(mock_workers), 0)
					return jest.fn()
				})

				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(
						screen.getByText(
							'No assigned requests have been rated yet.'
						)
					).toBeInTheDocument()
				})
			})
		})
	})

	// -------------------------------------------------------------------------
	// 5. Error State
	// -------------------------------------------------------------------------
	describe('Given the data fetch fails', () => {
		describe('When fetch_rated_requests throws an error', () => {
			it('Then it should display the error message', async () => {
				fetch_rated_requests.mockRejectedValue(
					new Error('Firestore error')
				)
				fetch_assignments.mockResolvedValue([])
				subscribe_to_workers.mockImplementation(() => jest.fn()) // silent

				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(
						screen.getByText(
							'Could not load report. Please try again.'
						)
					).toBeInTheDocument()
				})

				expect(consoleErrorSpy).toHaveBeenCalled()
			})
		})
	})
})