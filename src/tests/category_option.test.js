import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Adjust this path to reach out of 'tests' and into 'components'
import CategoryOption from '../components/category_option/category_option.js'

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------
// Suppress CSS import
jest.mock('../components/category_option/category_option.css', () => ({}))
// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('CategoryOption', () => {
	const mock_set_value = jest.fn()
	const mock_set_expand = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	// -----------------------------------------------------------------------
	// 1. Rendering and Text Formatting Logic
	// -----------------------------------------------------------------------
	describe('Given the CategoryOption component is mounted', () => {
		describe('When a single-word option string is provided', () => {
			it('Then it should render the button with the capitalized text', () => {
				render(
					<CategoryOption
						opt="potholes"
						set_value={mock_set_value}
						set_expand={mock_set_expand}
					/>
				)

				// The regex should format 'potholes' to 'Potholes'
				const button = screen.getByRole('button', { name: 'Potholes' })
				expect(button).toBeInTheDocument()
				expect(button).toHaveClass('category_option')
			})
		})

		describe('When a snake_case option string is provided', () => {
			it('Then it should replace underscores with spaces and title-case the words', () => {
				render(
					<CategoryOption
						opt="water_outage"
						set_value={mock_set_value}
						set_expand={mock_set_expand}
					/>
				)

				// The regex should format 'water_outage' to 'Water Outage'
				const button = screen.getByRole('button', {
					name: 'Water Outage',
				})
				expect(button).toBeInTheDocument()
			})
		})

		describe('When a space-separated option string is provided', () => {
			it('Then it should capitalize the start of each word', () => {
				render(
					<CategoryOption
						opt="street light"
						set_value={mock_set_value}
						set_expand={mock_set_expand}
					/>
				)

				// The regex should format 'street light' to 'Street Light'
				const button = screen.getByRole('button', {
					name: 'Street Light',
				})
				expect(button).toBeInTheDocument()
			})
		})

		// -----------------------------------------------------------------------
		// 2. User Interactions
		// -----------------------------------------------------------------------
		describe('When the option button is clicked', () => {
			it('Then it should call set_value with the original string and set_expand with false', () => {
				render(
					<CategoryOption
						opt="electricity_fault"
						set_value={mock_set_value}
						set_expand={mock_set_expand}
					/>
				)

				const button = screen.getByRole('button', {
					name: 'Electricity Fault',
				})

				// Simulate the user clicking the list item
				fireEvent.click(button)

				// Assert set_value was called with the raw, unformatted string
				expect(mock_set_value).toHaveBeenCalledTimes(1)
				expect(mock_set_value).toHaveBeenCalledWith('electricity_fault')

				// Assert set_expand was called to close the dropdown menu
				expect(mock_set_expand).toHaveBeenCalledTimes(1)
				expect(mock_set_expand).toHaveBeenCalledWith(false)
			})
		})
	})
})
