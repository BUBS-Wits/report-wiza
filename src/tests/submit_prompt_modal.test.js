/* global jest */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import SubmitPromptModal from '../components/submit_prompt_modal/submit_prompt_modal.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

// Mock CSS
jest.mock(
	'../components/submit_prompt_modal/submit_prompt_modal.css',
	() => ({})
)

// Mock React Router DOM
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('SubmitPromptModal Component', () => {
	let mockOnClose
	let mockOnContinue

	beforeEach(() => {
		jest.clearAllMocks()
		mockOnClose = jest.fn()
		mockOnContinue = jest.fn()
		// Reset body style before each test
		document.body.style.overflow = ''
	})

	test('does not render when is_open is false', () => {
		render(
			<SubmitPromptModal
				is_open={false}
				on_close={mockOnClose}
				on_continue={mockOnContinue}
			/>
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(document.body.style.overflow).toBe('')
	})

	test('renders correctly and locks body scroll when is_open is true', () => {
		render(
			<SubmitPromptModal
				is_open={true}
				on_close={mockOnClose}
				on_continue={mockOnContinue}
			/>
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()
		expect(screen.getByText('Save Your Report')).toBeInTheDocument()

		// Verifies the useEffect applied the scroll lock
		expect(document.body.style.overflow).toBe('hidden')
	})

	test('restores body scroll when modal unmounts', () => {
		const { unmount } = render(
			<SubmitPromptModal
				is_open={true}
				on_close={mockOnClose}
				on_continue={mockOnContinue}
			/>
		)

		expect(document.body.style.overflow).toBe('hidden')
		unmount()
		expect(document.body.style.overflow).toBe('')
	})

	test('calls on_close when the Escape key is pressed', () => {
		render(
			<SubmitPromptModal
				is_open={true}
				on_close={mockOnClose}
				on_continue={mockOnContinue}
			/>
		)

		fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
		expect(mockOnClose).toHaveBeenCalledTimes(1)
	})

	test('calls on_close when the overlay is clicked', () => {
		render(
			<SubmitPromptModal
				is_open={true}
				on_close={mockOnClose}
				on_continue={mockOnContinue}
			/>
		)

		// The dialog role is on the overlay div
		const overlay = screen.getByRole('dialog')
		fireEvent.click(overlay)

		expect(mockOnClose).toHaveBeenCalledTimes(1)
	})

	test('does NOT call on_close when the modal card itself is clicked', () => {
		render(
			<SubmitPromptModal
				is_open={true}
				on_close={mockOnClose}
				on_continue={mockOnContinue}
			/>
		)

		// Find an element inside the card and click it
		const cardTitle = screen.getByText('Save Your Report')
		fireEvent.click(cardTitle)

		expect(mockOnClose).not.toHaveBeenCalled()
	})

	test('navigates to /login and closes modal when "Create Account / Sign In" is clicked', () => {
		render(
			<SubmitPromptModal
				is_open={true}
				on_close={mockOnClose}
				on_continue={mockOnContinue}
			/>
		)

		const createBtn = screen.getByRole('button', {
			name: /Create Account \/ Sign In/i,
		})
		fireEvent.click(createBtn)

		expect(mockOnClose).toHaveBeenCalledTimes(1)
		expect(mockNavigate).toHaveBeenCalledWith('/login')
	})

	test('calls on_continue when "Continue without an account" is clicked', () => {
		render(
			<SubmitPromptModal
				is_open={true}
				on_close={mockOnClose}
				on_continue={mockOnContinue}
			/>
		)

		const continueBtn = screen.getByRole('button', {
			name: /Continue without an account/i,
		})
		fireEvent.click(continueBtn)

		expect(mockOnContinue).toHaveBeenCalledTimes(1)
		// Ensure on_close wasn't accidentally triggered
		expect(mockOnClose).not.toHaveBeenCalled()
	})
})
