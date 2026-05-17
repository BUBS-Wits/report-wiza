/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminSatisfactionReport from '../pages/admin_satisfaction_report/admin_satisfaction_report.js'
import { fetch_rated_requests } from '../backend/admin_firebase.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../backend/admin_firebase.js', () => ({
	fetch_rated_requests: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Helper Data
───────────────────────────────────────────────────────────────────────────── */

const mock_rated_requests = [
	{
		id: 'req_001',
		category: 'water',
		rating: 4,
		status: 'resolved',
	},
	{
		id: 'req_002',
		category: 'water',
		rating: 2,
		status: 'resolved',
	},
	{
		id: 'req_003',
		category: 'electricity',
		rating: 3,
		status: 'closed',
	},
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
		describe('When rated requests are returned', () => {
			beforeEach(() => {
				fetch_rated_requests.mockResolvedValue(mock_rated_requests)
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

			it('Then it should display the correct average for Water (4+2)/2 = 3.0', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(screen.getByText('Water')).toBeInTheDocument()
				})

				const water_row = screen.getByText('Water').closest('tr')
				expect(water_row).toHaveTextContent('3')
			})

			it('Then it should display the correct count for each category', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(screen.getByText('Water')).toBeInTheDocument()
				})

				const water_row = screen.getByText('Water').closest('tr')
				expect(water_row).toHaveTextContent('2')

				const electricity_row = screen
					.getByText('Electricity')
					.closest('tr')
				expect(electricity_row).toHaveTextContent('1')
			})

			it('Then categories should be sorted highest average first', async () => {
				render(<AdminSatisfactionReport />)

				await waitFor(() => {
					expect(screen.getByText('Water')).toBeInTheDocument()
				})

				const rows = screen.getAllByRole('row')
				// row[0] is thead, row[1] is first data row
				expect(rows[1]).toHaveTextContent('Water')
			})
		})
	})

	// -------------------------------------------------------------------------
	// 4. Error State
	// -------------------------------------------------------------------------
	describe('Given the data fetch fails', () => {
		describe('When fetch_rated_requests throws an error', () => {
			it('Then it should display the error message', async () => {
				fetch_rated_requests.mockRejectedValue(
					new Error('Firestore error')
				)

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
