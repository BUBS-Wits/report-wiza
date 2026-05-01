import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CategorySelect from '../components/category_select/category_select.js'

jest.mock('../components/category_select/category_select.css', () => ({}))

jest.mock('../backend/admin_requests_service.js', () => ({
	fetch_categories: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({ db: {} }))

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	getDocs: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
}))

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

import { fetch_categories } from '../backend/admin_requests_service.js'

describe('CategorySelect', () => {
	const mock_on_change = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
		fetch_categories.mockResolvedValue([
			{ id: '1', name: 'potholes', active: true },
			{ id: '2', name: 'street_light', active: true },
		])
	})

	describe('Given the CategorySelect component is mounted', () => {
		describe('When no value is provided', () => {
			it('Then it should display the default placeholder text', async () => {
				render(
					<CategorySelect value={null} onChange={mock_on_change} />
				)
				const trigger_btn = await screen.findByRole('button', {
					name: '--Please choose a category--',
				})
				expect(trigger_btn).toBeInTheDocument()
				expect(trigger_btn).toHaveClass('dropdown_trigger')
			})
		})

		describe('When a snake_case value is provided', () => {
			it('Then it should render the formatted title-case text on the trigger button', async () => {
				render(
					<CategorySelect
						value="water_outage"
						onChange={mock_on_change}
					/>
				)
				const trigger_btn = await screen.findByRole('button', {
					name: 'Water Outage',
				})
				expect(trigger_btn).toBeInTheDocument()
			})
		})

		describe('When a standard single-word value is provided', () => {
			it('Then it should render the formatted capitalized text on the trigger button', async () => {
				render(
					<CategorySelect
						value="potholes"
						onChange={mock_on_change}
					/>
				)
				const trigger_btn = await screen.findByRole('button', {
					name: 'Potholes',
				})
				expect(trigger_btn).toBeInTheDocument()
			})
		})
	})

	describe('Given the CategorySelect component is rendered', () => {
		describe('When the trigger button is clicked', () => {
			it('Then it should open the dropdown by adding the "open" class to the list', async () => {
				const { container } = render(
					<CategorySelect value={null} onChange={mock_on_change} />
				)
				const dropdown_list = container.querySelector(
					'.category_dropdown_list'
				)
				expect(dropdown_list).not.toHaveClass('open')

				const trigger_btn = await screen.findByRole('button', {
					name: '--Please choose a category--',
				})
				fireEvent.click(trigger_btn)
				expect(dropdown_list).toHaveClass('open')
			})
		})

		describe('When the options are mapped', () => {
			it('Then it should render a CategoryOption for each category in the constants', async () => {
				render(
					<CategorySelect value={null} onChange={mock_on_change} />
				)
				const trigger_btn = await screen.findByRole('button', {
					name: '--Please choose a category--',
				})
				fireEvent.click(trigger_btn)
				const options = screen.getAllByTestId('mock-category-option')
				expect(options).toHaveLength(2)
			})
		})

		describe('When a child CategoryOption triggers its callbacks', () => {
			it('Then it should call onChange with the value and close the dropdown', async () => {
				const { container } = render(
					<CategorySelect value={null} onChange={mock_on_change} />
				)
				const trigger_btn = await screen.findByRole('button', {
					name: '--Please choose a category--',
				})
				fireEvent.click(trigger_btn)

				const dropdown_list = container.querySelector(
					'.category_dropdown_list'
				)
				expect(dropdown_list).toHaveClass('open')

				const option_btn = screen.getByTestId('select-street_light')
				fireEvent.click(option_btn)

				expect(mock_on_change).toHaveBeenCalledTimes(1)
				expect(mock_on_change).toHaveBeenCalledWith('street_light')
				expect(dropdown_list).not.toHaveClass('open')
			})
		})
	})
})
