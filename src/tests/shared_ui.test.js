import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CategoryPill, StatusChip } from '../components/shared_ui/shared_ui.js'

// Mock the utils to provide the STATUS_LABELS mapping
jest.mock('../utils/amr_untils.js', () => ({
	STATUS_LABELS: {
		open: 'Open',
		acknowledged: 'Assigned',
		in_progress: 'In Progress',
		resolved: 'Resolved',
		closed: 'Closed',
	},
}))

describe('Shared UI Components', () => {
	describe('CategoryPill', () => {
		test('renders properly formatted category string', () => {
			render(<CategoryPill category="water" />)
			const pill = screen.getByText('water')
			expect(pill).toBeInTheDocument()
			expect(pill).toHaveClass('amr_cat_water')
		})

		test('returns null if no category provided', () => {
			const { container } = render(<CategoryPill category={null} />)
			expect(container.firstChild).toBeNull()
		})
	})

	describe('StatusChip', () => {
		test('renders mapped status label', () => {
			render(<StatusChip status="acknowledged" />)
			const chip = screen.getByText('Assigned')
			expect(chip).toBeInTheDocument()
			expect(chip).toHaveClass('amr_status_acknowledged')
		})

		test('returns null if no status provided', () => {
			const { container } = render(<StatusChip status={null} />)
			expect(container.firstChild).toBeNull()
		})
	})
})
