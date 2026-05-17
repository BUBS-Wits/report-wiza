import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminWorkerPerformance from '../components/admin_worker_performance/admin_worker_performance.js'
import { fetch_aggregate_worker_performance } from '../backend/admin_worker_performance_service.js'

// ── Mock Dependencies ───────────────────────────────────────────────

jest.mock('../backend/admin_worker_performance_service.js', () => ({
	fetch_aggregate_worker_performance: jest.fn(),
}))

jest.mock('../components/admin_sidebar/admin_sidebar.js', () => {
	return function MockSidebar() {
		return <div data-testid="mock-sidebar">Sidebar</div>
	}
})

jest.mock('../components/top_bar/top_bar.js', () => {
	return function MockTopBar() {
		return <div data-testid="mock-topbar">TopBar</div>
	}
})

const mock_workers = [
	{
		worker_uid: 'w_001',
		display_name: 'John Doe',
		email: 'john@wardwatch.co.za',
		total_assigned: 10,
		total_resolved: 9,
		active_tasks: 1,
		avg_resolution_hours: 2.5,
		completion_rate: 90,
	},
	{
		worker_uid: 'w_002',
		display_name: 'Jane Smith',
		email: 'jane@wardwatch.co.za',
		total_assigned: 4,
		total_resolved: 1,
		active_tasks: 3,
		avg_resolution_hours: 48,
		completion_rate: 25,
	},
]

describe('AdminWorkerPerformance Component', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('1. renders loading state initially', () => {
		fetch_aggregate_worker_performance.mockImplementationOnce(
			() => new Promise(() => {})
		)

		render(<AdminWorkerPerformance />)
		expect(
			screen.getByText(/Loading worker performance data/i)
		).toBeInTheDocument()
	})

	test('2. renders error state and allows retry', async () => {
		fetch_aggregate_worker_performance.mockRejectedValueOnce(
			new Error('Database offline')
		)
		render(<AdminWorkerPerformance />)

		await waitFor(() => {
			expect(
				screen.getByText(/Failed to load worker performance data/i)
			).toBeInTheDocument()
		})

		fetch_aggregate_worker_performance.mockResolvedValueOnce(mock_workers)

		const retry_btn = screen.getByRole('button', { name: /^Retry$/ })
		fireEvent.click(retry_btn)

		await waitFor(() => {
			expect(
				screen.queryByText(/Failed to load worker performance data/i)
			).not.toBeInTheDocument()
			expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
		})
	})

	test('3. renders layout, summary cards, and table data successfully', async () => {
		fetch_aggregate_worker_performance.mockResolvedValueOnce(mock_workers)
		render(<AdminWorkerPerformance />)

		await waitFor(() => {
			expect(
				screen.queryByText(/Loading worker performance data/i)
			).not.toBeInTheDocument()
		})

		expect(screen.getByText('Total Workers')).toBeInTheDocument()

		// Changed to getAllByText because "2" appears in the Summary Card AND as a rank badge
		expect(screen.getAllByText('2').length).toBeGreaterThan(0)

		expect(screen.getByText('Tasks Assigned')).toBeInTheDocument()
		expect(screen.getByText('14')).toBeInTheDocument()

		expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
		expect(screen.getByText('jane@wardwatch.co.za')).toBeInTheDocument()

		expect(screen.getByText('2.5h')).toBeInTheDocument()
		expect(screen.getByText('2.0d')).toBeInTheDocument()
	})

	test('4. filters table data based on search input', async () => {
		fetch_aggregate_worker_performance.mockResolvedValueOnce(mock_workers)
		render(<AdminWorkerPerformance />)

		await waitFor(() => {
			expect(
				screen.queryByText(/Loading worker performance data/i)
			).not.toBeInTheDocument()
		})

		const search_input = screen.getByPlaceholderText(
			/Search by name or email/i
		)

		fireEvent.change(search_input, { target: { value: 'Jane' } })

		expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
		expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0)

		fireEvent.change(search_input, { target: { value: 'Zebra' } })
		expect(
			screen.getByText(/No workers match your search/i)
		).toBeInTheDocument()
	})

	test('5. toggles sorting criteria correctly', async () => {
		fetch_aggregate_worker_performance.mockResolvedValueOnce(mock_workers)
		render(<AdminWorkerPerformance />)

		await waitFor(() => {
			expect(
				screen.queryByText(/Loading worker performance data/i)
			).not.toBeInTheDocument()
		})

		const sort_dropdown = screen.getByRole('combobox')

		// Initial state is completion_rate_desc
		expect(sort_dropdown.value).toBe('completion_rate_desc')

		// 1st Click on "Completion" -> Toggles to ASC
		const completion_header = screen.getByRole('columnheader', {
			name: /Completion/i,
		})
		fireEvent.click(completion_header)
		expect(sort_dropdown.value).toBe('completion_rate_asc')

		// 2nd Click on "Completion" -> Toggles back to DESC
		// Re-query the DOM node because the up/down arrow icon changes inside it
		const updated_completion_header = screen.getByRole('columnheader', {
			name: /Completion/i,
		})
		fireEvent.click(updated_completion_header)
		expect(sort_dropdown.value).toBe('completion_rate_desc')
	})
})
