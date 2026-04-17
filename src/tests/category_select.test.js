import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Adjust this path to reach out of 'tests' and into 'components'
import CategorySelect from '../components/category_select/category_select.js'

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------

// 1. Suppress CSS import
jest.mock('../components/category_select/category_select.css', () => ({}))

// 2. Mock the Constants to control exactly how many options render
jest.mock('../constants.js', () => ({
	REQUEST_CATEGORIES: ['potholes', 'street_light'],
}))

// 3. Mock the child CategoryOption component to isolate state testing
jest.mock('../components/category_option/category_option.js', () => {
	return function MockCategoryOption({ opt, set_value, set_expand }) {
		return (
			<li data-testid="mock-category-option">
				<button
					data-testid={`select-${opt}`}
					onClick={() => {
						set_value(opt)
						set_expand(false)
					}}
				>
					Mock {opt}
				</button>
			</li>
		)
	}
})

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('CategorySelect', () => {
	const mock_on_change = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	// -----------------------------------------------------------------------
	// 1. Initial Render & Text Formatting
	// -----------------------------------------------------------------------
	describe('Given the CategorySelect component is mounted', () => {
		describe('When no value is provided', () => {
			it('Then it should display the default placeholder text', () => {
				render(
					<CategorySelect value={null} onChange={mock_on_change} />
				)

				const trigger_btn = screen.getByRole('button', {
					name: '--Please choose a category--',
				})
				expect(trigger_btn).toBeInTheDocument()
				expect(trigger_btn).toHaveClass('dropdown_trigger')
			})
		})

		describe('When a snake_case value is provided', () => {
			it('Then it should render the formatted title-case text on the trigger button', () => {
				render(
					<CategorySelect
						value="water_outage"
						onChange={mock_on_change}
					/>
				)

				// The regex should format 'water_outage' to 'Water Outage'
				const trigger_btn = screen.getByRole('button', {
					name: 'Water Outage',
				})
				expect(trigger_btn).toBeInTheDocument()
			})
		})

		describe('When a standard single-word value is provided', () => {
			it('Then it should render the formatted capitalized text on the trigger button', () => {
				render(
					<CategorySelect
						value="potholes"
						onChange={mock_on_change}
					/>
				)

				// The regex should format 'potholes' to 'Potholes'
				const trigger_btn = screen.getByRole('button', {
					name: 'Potholes',
				})
				expect(trigger_btn).toBeInTheDocument()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 2. Dropdown State Management
	// -----------------------------------------------------------------------
	describe('Given the CategorySelect component is rendered', () => {
		describe('When the trigger button is clicked', () => {
			it('Then it should open the dropdown by adding the "open" class to the list', () => {
				const { container } = render(
					<CategorySelect value={null} onChange={mock_on_change} />
				)

				// Initially, it should not have the 'open' class
				const dropdown_list = container.querySelector(
					'.category_dropdown_list'
				)
				expect(dropdown_list).not.toHaveClass('open')

				// Simulate clicking the trigger
				const trigger_btn = screen.getByRole('button', {
					name: '--Please choose a category--',
				})
				fireEvent.click(trigger_btn)

				// It should now have the 'open' class applied
				expect(dropdown_list).toHaveClass('open')
			})
		})

		describe('When the options are mapped', () => {
			it('Then it should render a CategoryOption for each category in the constants', () => {
				render(
					<CategorySelect value={null} onChange={mock_on_change} />
				)

				const options = screen.getAllByTestId('mock-category-option')
				// We provided 2 mocked categories in the jest.mock setup above
				expect(options).toHaveLength(2)
			})
		})

		describe('When a child CategoryOption triggers its callbacks', () => {
			it('Then it should call onChange with the value and close the dropdown', () => {
				const { container } = render(
					<CategorySelect value={null} onChange={mock_on_change} />
				)

				// Open the dropdown first
				const trigger_btn = screen.getByRole('button', {
					name: '--Please choose a category--',
				})
				fireEvent.click(trigger_btn)

				const dropdown_list = container.querySelector(
					'.category_dropdown_list'
				)
				expect(dropdown_list).toHaveClass('open')

				// Simulate clicking the mocked "street_light" child option
				const option_btn = screen.getByTestId('select-street_light')
				fireEvent.click(option_btn)

				// Verify the parent's onChange prop was triggered with the correct value
				expect(mock_on_change).toHaveBeenCalledTimes(1)
				expect(mock_on_change).toHaveBeenCalledWith('street_light')

				// Verify the dropdown closed itself (the 'open' class was removed)
				expect(dropdown_list).not.toHaveClass('open')
			})
		})
	})
})
