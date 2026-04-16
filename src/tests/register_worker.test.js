import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Adjust this path to reach out of 'tests' and into 'components'
import RegisterWorker from '../components/register_worker/register_worker.js'

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------

// 1. Mock the Firebase backend
import { register_worker_email } from '../backend/admin_firebase.js'
jest.mock('../backend/admin_firebase.js', () => ({
	register_worker_email: jest.fn(),
}))

// 2. Suppress the CSS import
jest.mock('../components/register_worker/register_worker.css', () => ({}))

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('RegisterWorker', () => {
	const mock_on_registered = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	// -----------------------------------------------------------------------
	// 1. Initial Render
	// -----------------------------------------------------------------------
	describe('Given the RegisterWorker component is mounted', () => {
		describe('When it initially renders', () => {
			it('Then it should display the header, description, and empty form', () => {
				render(<RegisterWorker on_registered={mock_on_registered} />)

				expect(
					screen.getByText('Register a worker')
				).toBeInTheDocument()
				expect(
					screen.getByText(
						/Send a sign-in link to register a new municipal worker/i
					)
				).toBeInTheDocument()

				const email_input = screen.getByPlaceholderText(
					'worker@municipality.gov.za'
				)
				expect(email_input).toBeInTheDocument()
				expect(email_input).toHaveValue('')

				const submit_btn = screen.getByRole('button', {
					name: 'Send email',
				})
				expect(submit_btn).toBeInTheDocument()
				// Button should be disabled initially because the email is empty
				expect(submit_btn).toBeDisabled()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 2. User Input
	// -----------------------------------------------------------------------
	describe('Given the user interacts with the input field', () => {
		describe('When an email is typed into the input', () => {
			it('Then it should update the value and enable the submit button', () => {
				render(<RegisterWorker on_registered={mock_on_registered} />)

				const email_input = screen.getByPlaceholderText(
					'worker@municipality.gov.za'
				)
				const submit_btn = screen.getByRole('button', {
					name: 'Send email',
				})

				fireEvent.change(email_input, {
					target: { value: 'new_worker@city.gov' },
				})

				expect(email_input).toHaveValue('new_worker@city.gov')
				expect(submit_btn).not.toBeDisabled()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 3. Form Submission (Success, Loading, Error)
	// -----------------------------------------------------------------------
	describe('Given the form is submitted', () => {
		describe('When the backend request is in progress', () => {
			it('Then it should set the loading state and disable inputs', async () => {
				// Mock a delayed promise so we can check the UI while it's "loading"
				register_worker_email.mockImplementation(
					() => new Promise((resolve) => setTimeout(resolve, 100))
				)

				render(<RegisterWorker on_registered={mock_on_registered} />)

				const email_input = screen.getByPlaceholderText(
					'worker@municipality.gov.za'
				)
				fireEvent.change(email_input, {
					target: { value: 'test@city.gov' },
				})

				const submit_btn = screen.getByRole('button', {
					name: 'Send email',
				})
				fireEvent.click(submit_btn)

				// Immediately check for loading text and disabled states
				expect(
					screen.getByRole('button', { name: 'Sending...' })
				).toBeDisabled()
				expect(email_input).toBeDisabled()

				// Wait for the delayed promise to resolve so the test cleans up properly
				await waitFor(() => {
					expect(submit_btn).toHaveTextContent('Send email')
				})
			})
		})
		describe('When the registration is successful', () => {
			it('Then it should show a success message, clear the input, and call on_registered', async () => {
				register_worker_email.mockResolvedValueOnce()

				render(<RegisterWorker on_registered={mock_on_registered} />)

				const email_input = screen.getByPlaceholderText(
					'worker@municipality.gov.za'
				)
				fireEvent.change(email_input, {
					target: { value: 'success@city.gov' },
				})

				fireEvent.click(
					screen.getByRole('button', { name: 'Send email' })
				)

				// Wait specifically for the message element to appear in the DOM
				const message = await screen.findByText(
					'Registration email sent to success@city.gov'
				)

				expect(register_worker_email).toHaveBeenCalledWith(
					'success@city.gov'
				)
				expect(message).toBeInTheDocument()
				expect(message).toHaveClass('register_worker_msg success')

				// Verify input was cleared
				expect(email_input).toHaveValue('')

				// Verify the callback was triggered
				expect(mock_on_registered).toHaveBeenCalledTimes(1)
			})
		})

		describe('When the registration fails', () => {
			it('Then it should display the error message and not clear the input', async () => {
				register_worker_email.mockRejectedValueOnce(
					new Error('Email already in use')
				)

				render(<RegisterWorker on_registered={mock_on_registered} />)

				const email_input = screen.getByPlaceholderText(
					'worker@municipality.gov.za'
				)
				fireEvent.change(email_input, {
					target: { value: 'fail@city.gov' },
				})

				fireEvent.click(
					screen.getByRole('button', { name: 'Send email' })
				)

				// Wait specifically for the error message element to appear
				const message = await screen.findByText('Email already in use')

				expect(register_worker_email).toHaveBeenCalledWith(
					'fail@city.gov'
				)
				expect(message).toBeInTheDocument()
				expect(message).toHaveClass('register_worker_msg error')

				// Verify input was NOT cleared
				expect(email_input).toHaveValue('fail@city.gov')

				// Verify callback was NOT triggered
				expect(mock_on_registered).not.toHaveBeenCalled()
			})
		})

		describe('When the registration is successful but no callback is provided', () => {
			it('Then it should still process the success state without crashing', async () => {
				register_worker_email.mockResolvedValueOnce()

				// Render WITHOUT the on_registered prop
				render(<RegisterWorker />)

				const email_input = screen.getByPlaceholderText(
					'worker@municipality.gov.za'
				)
				fireEvent.change(email_input, {
					target: { value: 'nocallback@city.gov' },
				})

				fireEvent.click(
					screen.getByRole('button', { name: 'Send email' })
				)

				// Wait for the success message to appear
				const message = await screen.findByText(
					'Registration email sent to nocallback@city.gov'
				)
				expect(message).toBeInTheDocument()

				// If it reached here without throwing a TypeError, the branch passed!
				expect(email_input).toHaveValue('')
			})
		})
	})
})
