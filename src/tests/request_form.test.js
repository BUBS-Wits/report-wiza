import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import RequestForm from '../components/request_form/request_form.js'

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------

// 1. Mock the Request Class
import { Request } from '../pages/request/js/request.js'
jest.mock('../pages/request/js/request.js', () => {
	return {
		Request: jest.fn().mockImplementation((category, description, file) => {
			return {
				category,
				description,
				file,
				input_validate: jest.fn().mockReturnValue(true),
				image_validate: jest.fn().mockReturnValue(true),
			}
		}),
	}
})

// 2. Mock the Utility Functions
import { get_data_uri, image_validate } from '../js/utility.js'
jest.mock('../js/utility.js', () => ({
	get_data_uri: jest.fn(),
	image_validate: jest.fn(),
}))

// 3. Mock Child Components
jest.mock('../components/category_select/category_select.js', () => {
	return function MockCategorySelect({ value, onChange }) {
		return (
			<input
				data-testid="mock-category-select"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		)
	}
})

jest.mock('../components/buttons/yellow_btn.js', () => {
	return function MockYellowBtn({ text }) {
		return <button type="submit">{text}</button>
	}
})

jest.mock('../components/buttons/transparent_btn.js', () => {
	return function MockTransparentBtn() {
		return <button>Transparent</button>
	}
})

// 4. Suppress CSS
jest.mock('../components/request_form/request_form.css', () => ({}))

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('RequestForm', () => {
	const mock_on_submit = jest.fn()
	let console_error_spy
	let console_log_spy

	beforeEach(() => {
		jest.clearAllMocks()
		console_error_spy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})
		console_log_spy = jest
			.spyOn(console, 'log')
			.mockImplementation(() => {})
	})

	afterEach(() => {
		console_error_spy.mockRestore()
		console_log_spy.mockRestore()
	})

	// -----------------------------------------------------------------------
	// 1. Initial Render
	// -----------------------------------------------------------------------
	describe('Given the RequestForm component is mounted', () => {
		describe('When it initially renders', () => {
			it('Then it should render all form elements and no image preview', () => {
				render(<RequestForm onSubmit={mock_on_submit} />)

				expect(
					screen.getByTestId('mock-category-select')
				).toBeInTheDocument()
				expect(
					screen.getByTestId('description-input')
				).toBeInTheDocument()
				expect(
					screen.getByLabelText(/Choose an image to upload/i)
				).toBeInTheDocument()
				expect(
					screen.getByRole('button', { name: 'Submit' })
				).toBeInTheDocument()

				// No preview image should exist initially
				expect(screen.queryByRole('img')).not.toBeInTheDocument()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 2. Image Upload Logic
	// -----------------------------------------------------------------------
	describe('Given the user interacts with the file input', () => {
		describe('When a valid image is selected', () => {
			it('Then it should generate a preview URI and display the image', async () => {
				render(<RequestForm onSubmit={mock_on_submit} />)

				const file = new File(['dummy content'], 'pothole.png', {
					type: 'image/png',
				})
				image_validate.mockResolvedValueOnce(true)
				get_data_uri.mockResolvedValueOnce(
					'data:image/png;base64,dummy'
				)

				const file_input = screen.getByLabelText(
					/Choose an image to upload/i
				)
				fireEvent.change(file_input, { target: { files: [file] } })

				await waitFor(() => {
					expect(image_validate).toHaveBeenCalledWith(file)
					expect(get_data_uri).toHaveBeenCalledWith(file)
				})

				// Preview image should now be rendered
				const preview_img = screen.getByRole('img')
				expect(preview_img).toBeInTheDocument()
				expect(preview_img).toHaveAttribute(
					'src',
					'data:image/png;base64,dummy'
				)
			})
		})

		describe('When an invalid image is selected', () => {
			it('Then it should log an error and clear any existing preview', async () => {
				render(<RequestForm onSubmit={mock_on_submit} />)

				const file = new File(['bad text'], 'document.txt', {
					type: 'text/plain',
				})
				image_validate.mockResolvedValueOnce(false)

				const file_input = screen.getByLabelText(
					/Choose an image to upload/i
				)
				fireEvent.change(file_input, { target: { files: [file] } })

				await waitFor(() => {
					expect(console_error_spy).toHaveBeenCalledWith(
						'Please provide a valid image.'
					)
				})

				expect(screen.queryByRole('img')).not.toBeInTheDocument()
			})
		})

		describe('When file selection is cancelled (target.files is empty)', () => {
			it('Then it should log an error and handle the null file gracefully', async () => {
				render(<RequestForm onSubmit={mock_on_submit} />)

				const file_input = screen.getByLabelText(
					/Choose an image to upload/i
				)
				// Simulate opening the file dialog and hitting "Cancel" (empty array)
				fireEvent.change(file_input, { target: { files: [] } })

				await waitFor(() => {
					expect(console_error_spy).toHaveBeenCalledWith(
						'Please provide a valid image.'
					)
				})
			})
		})
	})

	// -----------------------------------------------------------------------
	// 3. Form Submission Logic
	// -----------------------------------------------------------------------
	describe('Given the user submits the form', () => {
		describe('When the form is missing the category, description, or file', () => {
			it('Then it should log a validation error and abort submission', () => {
				render(<RequestForm onSubmit={mock_on_submit} />)

				// Submitting immediately with empty state
				const submit_btn = screen.getByRole('button', {
					name: 'Submit',
				})
				fireEvent.click(submit_btn)

				expect(console_error_spy).toHaveBeenCalledWith(
					'Please provide complete information.'
				)
				expect(mock_on_submit).not.toHaveBeenCalled()
			})
		})

		describe('When the form has all data but the Request input validation fails', () => {
			it('Then it should not call the onSubmit prop', async () => {
				render(<RequestForm onSubmit={mock_on_submit} />)

				// 1. Fill out the form
				fireEvent.change(screen.getByTestId('description-input'), {
					target: { value: 'Big hole' },
				})
				fireEvent.change(screen.getAllByRole('textbox')[1], {
					target: { value: 'Big hole' },
				})

				const file = new File(['dummy'], 'pothole.png', {
					type: 'image/png',
				})
				image_validate.mockResolvedValueOnce(true)
				get_data_uri.mockResolvedValueOnce('data:uri')
				fireEvent.change(
					screen.getByLabelText(/Choose an image to upload/i),
					{ target: { files: [file] } }
				)

				await waitFor(() =>
					expect(screen.getByRole('img')).toBeInTheDocument()
				)

				// 2. Mock the Request validation to fail
				Request.mockImplementationOnce(() => ({
					input_validate: jest.fn().mockReturnValue(false), // fails here
					image_validate: jest.fn().mockReturnValue(true),
				}))

				// 3. Submit
				fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

				expect(mock_on_submit).not.toHaveBeenCalled()
			})
		})

		describe('When the form has all data but the Request image validation fails', () => {
			it('Then it should not call the onSubmit prop', async () => {
				render(<RequestForm onSubmit={mock_on_submit} />)

				fireEvent.change(screen.getByTestId('mock-category-select'), {
					target: { value: 'potholes' },
				})
				fireEvent.change(screen.getByTestId('description-input'), {
					target: { value: 'Big hole' },
				})
				const file = new File(['dummy'], 'pothole.png', {
					type: 'image/png',
				})
				image_validate.mockResolvedValueOnce(true)
				get_data_uri.mockResolvedValueOnce('data:uri')
				fireEvent.change(
					screen.getByLabelText(/Choose an image to upload/i),
					{ target: { files: [file] } }
				)

				await waitFor(() =>
					expect(screen.getByRole('img')).toBeInTheDocument()
				)

				// 2. Mock the Request validation to fail on the second check
				Request.mockImplementationOnce(() => ({
					input_validate: jest.fn().mockReturnValue(true),
					image_validate: jest.fn().mockReturnValue(false), // fails here
				}))

				fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

				expect(mock_on_submit).not.toHaveBeenCalled()
			})
		})

		describe('When the form has all data and the Request validation passes', () => {
			it('Then it should call onSubmit with the request and log it', async () => {
				// 1. Explicitly override the mock to guarantee it returns TRUE, stopping bleed-over
				Request.mockImplementation(() => ({
					category: 'potholes',
					description: 'Big hole on Main St.',
					file: expect.any(File), // Use expect.any to avoid strict object equality issues
					input_validate: jest.fn().mockReturnValue(true),
					image_validate: jest.fn().mockReturnValue(true),
				}))

				render(<RequestForm onSubmit={mock_on_submit} />)

				// 2. Fill out the form
				fireEvent.change(screen.getByTestId('mock-category-select'), {
					target: { value: 'potholes' },
				})

				fireEvent.change(screen.getByTestId('description-input'), {
					target: { value: 'Big hole on Main St.' },
				})

				const file = new File(['dummy content'], 'pothole.png', {
					type: 'image/png',
				})
				image_validate.mockResolvedValueOnce(true)
				get_data_uri.mockResolvedValueOnce(
					'data:image/png;base64,dummy'
				)

				fireEvent.change(
					screen.getByLabelText(/Choose an image to upload/i),
					{
						target: { files: [file] },
					}
				)

				// Wait for the async file handler to finish updating the React state
				await waitFor(() =>
					expect(screen.getByRole('img')).toBeInTheDocument()
				)

				// 3. Submit
				fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

				// 4. Verify success
				expect(mock_on_submit).toHaveBeenCalledTimes(1)

				// Verify the console log caught the mocked object successfully
				expect(console_log_spy).toHaveBeenCalledWith(
					'Request: ',
					expect.objectContaining({
						category: 'potholes',
						description: 'Big hole on Main St.',
					})
				)
			})
		})
	})
})
