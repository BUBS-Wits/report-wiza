import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CategoryReport from '../pages/category_report/category_report.js'

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------
import { onAuthStateChanged } from 'firebase/auth'
import {
	verify_admin,
	fetch_report_data,
	compute_summary,
	format_resolution_time,
	get_resolution_class,
} from '../backend/category_report_service.js'

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	auth: {},
}))

jest.mock('../components/sidebar/sidebar.js', () => {
	return function MockSidebar() {
		return <div data-testid="mock-sidebar">Sidebar</div>
	}
})

jest.mock('../components/top_bar/top_bar.js', () => {
	return function MockTopBar({ active_section }) {
		return <div data-testid="mock-top-bar">{active_section}</div>
	}
})

const mock_navigate = jest.fn()
jest.mock(
	'react-router-dom',
	() => ({
		useNavigate: () => mock_navigate,
	}),
	{ virtual: true }
)
jest.mock('../backend/category_report_service.js', () => ({
	verify_admin: jest.fn(),
	fetch_report_data: jest.fn(),
	compute_summary: jest.fn(),
	format_resolution_time: jest.fn(),
	get_resolution_class: jest.fn(),
}))

// ---------------------------------------------------------------------------
// Helper Data & Render Function
// ---------------------------------------------------------------------------
const mock_user = { uid: 'admin_123' }

const mock_stats = [
	{
		category: 'potholes',
		total: 10,
		pending: 6, // > 5 triggers the warning row class
		in_progress: 2,
		resolved: 2,
		avg_hours: 48,
	},
	{
		category: 'water',
		total: 0, // Tests the 0 division logic
		pending: 0,
		in_progress: 0,
		resolved: 0,
		avg_hours: null, // Tests the null formatting
	},
]

const mock_summary = {
	total_resolved: 2,
	total_pending: 6,
	overall_avg_hours: 48,
	worst_backlog: { category: 'potholes', pending: 6 },
}

const render_report = () => {
	return render(<CategoryReport />)
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('CategoryReport', () => {
	const original_location = window.location

	beforeAll(() => {
		// Mock window.location.reload for the error retry button
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { reload: jest.fn() },
		})
		// Mock date to ensure snapshot/text consistency
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2026-04-16T12:00:00Z'))
	})

	afterAll(() => {
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: original_location,
		})
		jest.useRealTimers()
	})

	beforeEach(() => {
		jest.clearAllMocks()
		format_resolution_time.mockImplementation((hours) => `${hours}h`)
		get_resolution_class.mockImplementation(() => 'resolution_medium')
	})

	// -----------------------------------------------------------------------
	// 1. Authentication & Authorization
	// -----------------------------------------------------------------------
	describe('Given the CategoryReport is mounted', () => {
		describe('When the user is not authenticated', () => {
			it('Then it should navigate to the login page', async () => {
				onAuthStateChanged.mockImplementation((auth, callback) => {
					callback(null)
					return jest.fn() // unsubscribe mock
				})

				render_report()

				await waitFor(() => {
					expect(mock_navigate).toHaveBeenCalledWith('/login')
				})
			})
		})

		describe('When the user is authenticated but is not an admin', () => {
			it('Then it should navigate to the login page', async () => {
				onAuthStateChanged.mockImplementation((auth, callback) => {
					callback({ uid: 'resident_123' })
					return jest.fn()
				})
				verify_admin.mockResolvedValue(false)

				render_report()

				await waitFor(() => {
					expect(verify_admin).toHaveBeenCalledWith('resident_123')
					expect(mock_navigate).toHaveBeenCalledWith('/login')
				})
			})
		})
	})

	// -----------------------------------------------------------------------
	// 2. Loading & Error States
	// -----------------------------------------------------------------------
	describe('Given the CategoryReport is mounted by an admin', () => {
		describe('When the component is fetching initial data', () => {
			it('Then it should display the loading spinner', () => {
				onAuthStateChanged.mockImplementation(() => jest.fn())

				render_report()

				expect(
					screen.getByText('Loading report data…')
				).toBeInTheDocument()
			})
		})

		describe('When the data fetch throws an error', () => {
			it('Then it should display the error message and a retry button', async () => {
				onAuthStateChanged.mockImplementation((auth, callback) => {
					callback(mock_user)
					return jest.fn()
				})
				verify_admin.mockResolvedValue(true)
				fetch_report_data.mockRejectedValue(new Error('Firebase down'))

				render_report()

				await waitFor(() => {
					expect(
						screen.getByText(
							'Failed to load report data. Please try again.'
						)
					).toBeInTheDocument()
				})
			})
		})

		describe('When the retry button is clicked in the error state', () => {
			it('Then it should reload the window', async () => {
				onAuthStateChanged.mockImplementation((auth, callback) => {
					callback(mock_user)
					return jest.fn()
				})
				verify_admin.mockResolvedValue(true)
				fetch_report_data.mockRejectedValue(new Error('Network error'))

				render_report()

				const retry_btn = await screen.findByRole('button', {
					name: /retry/i,
				})
				fireEvent.click(retry_btn)

				expect(window.location.reload).toHaveBeenCalled()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 3. Successful Data Render & Formatting
	// -----------------------------------------------------------------------
	describe('Given the CategoryReport successfully fetches data', () => {
		beforeEach(() => {
			onAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mock_user)
				return jest.fn()
			})
			verify_admin.mockResolvedValue(true)
			fetch_report_data.mockResolvedValue({
				stats: mock_stats,
				total_requests: 10,
			})
			compute_summary.mockReturnValue(mock_summary)
		})

		describe('When the main dashboard renders', () => {
			it('Then it should display the correct summary totals', async () => {
				render_report()

				// Wait for the loading state to finish by checking for the summary grid
				await waitFor(() => {
					expect(
						screen.getByText('Total Requests')
					).toBeInTheDocument()
				})

				expect(
					screen.getByText('Total Requests').previousSibling
				).toHaveTextContent('10')
				// Use getAllByText[0] because 'Pending' and 'Resolved' are also in the table headers
				expect(
					screen.getAllByText('Pending')[0].previousSibling
				).toHaveTextContent('6')
				expect(
					screen.getAllByText('Resolved')[0].previousSibling
				).toHaveTextContent('2')
				expect(
					screen.getAllByText('Avg Resolution Time')[0]
						.previousSibling
				).toHaveTextContent('48h')
			})

			it('Then it should render the Worst Backlog card if one exists', async () => {
				render_report()

				await waitFor(() => {
					expect(
						screen.getByText('Worst Backlog')
					).toBeInTheDocument()
				})
				// Use getAllByText[0] because 'potholes' is in the chart, table, and summary card
				expect(screen.getAllByText('potholes')[0]).toBeInTheDocument()
			})
		})

		describe('When the summary data has missing or null values', () => {
			it('Then it should render fallbacks gracefully', async () => {
				compute_summary.mockReturnValue({
					total_resolved: null,
					total_pending: null,
					overall_avg_hours: null,
					worst_backlog: null,
				})

				render_report()

				// We MUST await waitFor here so the loading spinner finishes before we check the DOM
				await waitFor(() => {
					expect(
						screen.getAllByText('Avg Resolution Time')[0]
					).toBeInTheDocument()
				})

				expect(
					screen.queryByText('Worst Backlog')
				).not.toBeInTheDocument()
				// Fallbacks to 0 or '—'
				expect(
					screen.getAllByText('Avg Resolution Time')[0]
						.previousSibling
				).toHaveTextContent('—')
			})
		})

		describe('When the data table renders the category rows', () => {
			it('Then it should apply the warning class to rows with > 5 pending requests', async () => {
				render_report()

				await waitFor(() => {
					// Use getAllByText and just check the first one exists to pass the wait
					expect(
						screen.getAllByText('potholes')[0]
					).toBeInTheDocument()
				})

				// Find all 'potholes' text, get the first one, and find its closest <tr>
				const pothole_row = screen
					.getAllByText('potholes')[0]
					.closest('tr')
				// If it's the bar chart label, closest('tr') is null. Let's make sure we get the table row:
				const table_row = screen
					.getAllByText('potholes')
					.find((el) => el.closest('tr'))
					.closest('tr')
				expect(table_row).toHaveClass('row_warn')
			})

			it('Then it should display "No data" for categories with a null average resolution time', async () => {
				render_report()

				await waitFor(() => {
					expect(screen.getAllByText('water')[0]).toBeInTheDocument()
				})

				expect(screen.getByText('No data')).toBeInTheDocument()
			})

			it('Then it should calculate a 0% resolution rate safely if total requests is 0', async () => {
				render_report()

				await waitFor(() => {
					// Find all 'water' text, filter for the one inside a table row
					const water_elements = screen.getAllByText('water')
					const table_row = water_elements
						.find((el) => el.closest('tr'))
						.closest('tr')
					expect(table_row).toHaveTextContent('0%')
				})
			})
		})
	})
})
