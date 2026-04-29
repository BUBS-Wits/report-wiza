/* global jest, describe, test, expect */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import YellowBtn from '../components/buttons/yellow_btn.js'

// Mock the CSS file
jest.mock('../components/buttons/button.css', () => ({}))

describe('YellowBtn Component', () => {
	test('renders with provided text and default classes', () => {
		render(<YellowBtn text="Submit Request" />)

		const button = screen.getByRole('button', { name: 'Submit Request' })
		expect(button).toBeInTheDocument()
		expect(button).toHaveClass('btn_components', 'yellow_button')
		expect(button).not.toHaveClass('loading')
	})

	test('calls the onClick handler when clicked', () => {
		const mockOnClick = jest.fn()
		render(<YellowBtn text="Submit Request" onClick={mockOnClick} />)

		const button = screen.getByRole('button', { name: 'Submit Request' })
		fireEvent.click(button)

		expect(mockOnClick).toHaveBeenCalledTimes(1)
	})

	test('appends the loading class when text is "Loading"', () => {
		render(<YellowBtn text="Loading" />)

		const button = screen.getByRole('button', { name: 'Loading' })
		expect(button).toHaveClass('btn_components', 'yellow_button', 'loading')
	})
})
