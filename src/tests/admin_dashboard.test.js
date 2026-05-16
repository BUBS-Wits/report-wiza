import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminDashboard from '../pages/admin_dashboard/admin_dashboard.js'

// ---------------------------------------------------------------------------
// Global Mocks
// ---------------------------------------------------------------------------
// Bypass the JSDOM window.confirm error by automatically clicking "Yes"
window.confirm = jest.fn(() => true)

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------
import { fetch_workers, revoke_worker_role } from '../backend/admin_firebase.js'

jest.mock('../backend/admin_firebase.js', () => ({
	fetch_workers: jest.fn(),
	revoke_worker_role: jest.fn(),
}))

// Prevent the messaging component from crashing the test by mocking its backend
jest.mock('../backend/admin_messaging_service.js', () => ({
	subscribe_to_admin_threads: jest.fn(() => jest.fn()),
	subscribe_to_thread_messages: jest.fn(() => jest.fn()),
	admin_toggle_thread_messaging: jest.fn(),
	invalidate_request_cache: jest.fn(),
}))

jest.mock('../pages/admin_dashboard/admin_dashboard.css', () => ({}))

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

jest.mock('../components/admin_sidebar/admin_sidebar.js', () => {
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

jest.mock('../components/admin_requests/admin_requests.js', () => {
	return function MockAdminRequests() {
		return <div>Requests section — coming soon</div>
	}
})

jest.mock(
	'../components/admin_public_dashboard_settings/admin_public_dashboard_settings.js',
	() => {
		function MockAdminPublicDashboardSettings() {
			return <div>Public dashboard field visibility</div>
		}
		return MockAdminPublicDashboardSettings
	}
)

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
		// 1. Properly mock the browser's confirm popup so it doesn't crash JSDOM
		jest.spyOn(window, 'confirm').mockImplementation(() => true)

		// 2. Prevent the Messaging tab from crashing when it mounts
		const {
			subscribe_to_admin_threads,
			subscribe_to_thread_messages,
		} = require('../backend/admin_messaging_service.js')
		subscribe_to_admin_threads.mockImplementation(() => jest.fn())
		subscribe_to_thread_messages.mockImplementation(() => jest.fn())

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

				// Mount with 2 workers, then reload with 1 worker after revoke!
				fetch_workers
					.mockResolvedValueOnce(mock_worker_data)
					.mockResolvedValueOnce([
						{ id: 'w2', email: 'worker2@city.gov' },
					])

				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByTestId('revoke-btn-w1'))

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

				const message_div =
					await screen.findByText(/Permission Denied/i)
				expect(message_div).toBeInTheDocument()
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

				// Check for the unique subtitle instead of the title to avoid "Found multiple elements" error
				expect(
					screen.getByText(
						'Monitor all conversations between workers and residents'
					)
				).toBeInTheDocument()
			})
		})

		describe('When the Residents section is clicked', () => {
			it('Then it should render the residents placeholder', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByText('Residents'))
				expect(
					screen.getByText('Residents Management')
				).toBeInTheDocument()
			})
		})

		describe('When the Analytics section is clicked', () => {
			it('Then it should render the analytics placeholder', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByText('Analytics'))
				expect(
					screen.getByText('Analytics Overview')
				).toBeInTheDocument()
			})
		})

		describe('When the Settings section is clicked', () => {
			it('Then it should render the public dashboard settings component', async () => {
				render(<AdminDashboard />)
				await wait_for_initial_load()

				fireEvent.click(screen.getByText('Settings'))

				expect(
					screen.getByText('Public dashboard field visibility')
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
