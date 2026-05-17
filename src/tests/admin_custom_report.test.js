import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminCustomReport from '../components/admin_custom_report/admin_custom_report.js'
import { generate_custom_report } from '../backend/admin_custom_report_service.js'

// ── Mock Dependencies ───────────────────────────────────────────────

jest.mock('../backend/admin_custom_report_service.js', () => ({
	generate_custom_report: jest.fn(),
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

// Mock URL object for CSV export testing
beforeAll(() => {
	global.URL.createObjectURL = jest.fn(() => 'blob:mock_url')
	global.URL.revokeObjectURL = jest.fn()
})

const mock_report_data = [
	{
		group_id: 'water | Ward 15',
		category: 'water',
		ward_name: 'Ward 15',
		count: 50,
		resolved_count: 45,
		resolution_rate: 90,
		avg_resolution_hours: 24.5,
	},
	{
		group_id: 'electricity | Ward 10',
		category: 'electricity',
		ward_name: 'Ward 10',
		count: 10,
		resolved_count: 2,
		resolution_rate: 20,
		avg_resolution_hours: 72.0,
	},
]

describe('AdminCustomReport Component', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('1. renders initial prompt state successfully', () => {
		render(<AdminCustomReport />)

		expect(screen.getByText('Custom Report Builder')).toBeInTheDocument()
		expect(
			screen.getByText(/Configure your report above/i)
		).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /Run Report/i })
		).toBeInTheDocument()
	})

	test('2. allows toggling dimensions and updating filters', () => {
		render(<AdminCustomReport />)

		// 'Category' is default. Let's toggle 'Ward' on.
		const ward_btn = screen.getByRole('button', { name: /📍 Ward/i })
		fireEvent.click(ward_btn)

		// Verify summary text updates instantly
		expect(screen.getByText(/Category, Ward/i)).toBeInTheDocument()

		// Change a filter
		const status_select = screen.getAllByRole('combobox')[0] // First select is status
		fireEvent.change(status_select, { target: { value: 'RESOLVED' } })

		expect(screen.getByText(/Status: RESOLVED/i)).toBeInTheDocument()
	})

	test('3. generates report, shows loading state, and renders table results', async () => {
		generate_custom_report.mockResolvedValueOnce(mock_report_data)
		render(<AdminCustomReport />)

		const run_btn = screen.getByRole('button', { name: /Run Report/i })
		fireEvent.click(run_btn)

		// Loading state should appear
		expect(
			screen.getByText(/Querying Firestore and aggregating results/i)
		).toBeInTheDocument()

		// Wait for results
		await waitFor(() => {
			expect(
				screen.queryByText(
					/Querying Firestore and aggregating results/i
				)
			).not.toBeInTheDocument()
			expect(screen.getByText('Groups Found')).toBeInTheDocument() // Summary card
		})

		// Check table contents
		// Use getAllByText because "water" is also in the category dropdown filter
		expect(screen.getAllByText('water').length).toBeGreaterThan(0)
		expect(screen.getByText('90%')).toBeInTheDocument()

		// Formatted hours check (72 hours -> 3.0d)
		expect(screen.getByText('3.0d')).toBeInTheDocument()
	})

	test('4. handles CSV export button click safely', async () => {
		generate_custom_report.mockResolvedValueOnce(mock_report_data)
		render(<AdminCustomReport />)

		fireEvent.click(screen.getByRole('button', { name: /Run Report/i }))

		await waitFor(() => {
			expect(screen.getByText('Groups Found')).toBeInTheDocument()
		})

		const export_btn = screen.getByRole('button', { name: /Export CSV/i })

		// Selectively mock document.createElement to intercept only the 'a' tag.
		// This prevents JSDOM from trying to actually navigate the browser window and throwing an error.
		const mock_click = jest.fn()
		const originalCreateElement = document.createElement.bind(document)
		const createElementSpy = jest
			.spyOn(document, 'createElement')
			.mockImplementation((tagName) => {
				if (tagName.toLowerCase() === 'a') {
					return { click: mock_click, href: '', download: '' }
				}
				return originalCreateElement(tagName)
			})

		fireEvent.click(export_btn)

		expect(createElementSpy).toHaveBeenCalledWith('a')
		expect(global.URL.createObjectURL).toHaveBeenCalled()
		expect(mock_click).toHaveBeenCalled() // verifies the download was triggered

		createElementSpy.mockRestore()
	})

	test('5. renders error state and allows reset', async () => {
		generate_custom_report.mockRejectedValueOnce(new Error('Network error'))
		render(<AdminCustomReport />)

		fireEvent.click(screen.getByRole('button', { name: /Run Report/i }))

		await waitFor(() => {
			expect(
				screen.getByText(/Report generation failed/i)
			).toBeInTheDocument()
		})

		// Reset the form
		fireEvent.click(screen.getByRole('button', { name: /Reset/i }))

		// Should return to the prompt state
		expect(
			screen.getByText(/Configure your report above/i)
		).toBeInTheDocument()
		expect(
			screen.queryByText(/Report generation failed/i)
		).not.toBeInTheDocument()
	})
})
