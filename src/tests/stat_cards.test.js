import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import StatCards from '../components/stat_cards/stat_cards.js'

jest.mock('../components/stat_cards/stat_cards.css', () => ({}))

describe('StatCards component', () => {
	describe('Given the component renders with values', () => {
		it('Then it should display total workers', () => {
			render(<StatCards total={5} pending={2} revoked={1} />)
			expect(screen.getByText('5')).toBeInTheDocument()
		})

		it('Then it should display pending count', () => {
			render(<StatCards total={5} pending={2} revoked={1} />)
			expect(screen.getByText('2')).toBeInTheDocument()
		})

		it('Then it should display revoked count', () => {
			render(<StatCards total={5} pending={2} revoked={1} />)
			expect(screen.getByText('1')).toBeInTheDocument()
		})

		it('Then it should show the correct labels', () => {
			render(<StatCards total={5} pending={2} revoked={1} />)
			expect(screen.getByText(/total workers/i)).toBeInTheDocument()
			expect(
				screen.getByText(/pending verification/i)
			).toBeInTheDocument()
			expect(screen.getByText(/revoked this month/i)).toBeInTheDocument()
		})
	})
})
