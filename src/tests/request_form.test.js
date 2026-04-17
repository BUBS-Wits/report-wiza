import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import RequestForm from '../components/request_form/request_form.js'

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

// Request class
import { Request } from '../pages/request/request.js'
jest.mock('../pages/request/request.js', () => ({
	Request: jest.fn(),
}))

// Utilities
import {
	get_data_uri,
	image_validate,
	get_location,
	get_voting_district_info,
} from '../js/utility.js'

jest.mock('../js/utility.js', () => ({
	get_data_uri: jest.fn(),
	image_validate: jest.fn(),
	get_location: jest.fn(),
	get_voting_district_info: jest.fn(),
}))

// Child components
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

jest.mock('../components/request_form/request_form.css', () => ({}))

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('RequestForm', () => {
	let console_error_spy
	let console_log_spy
	const mock_on_submit = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()

		console_error_spy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		console_log_spy = jest
			.spyOn(console, 'log')
			.mockImplementation(() => {})

		get_location.mockResolvedValue([18.4, -33.9])

		get_voting_district_info.mockResolvedValue({
			ward: 10,
			province: 'Western Cape',
			m_id: 1,
			m_code: 'CPT',
			m_name: 'Cape Town',
		})

		Request.mockImplementation(
			(category, description, file, longitude, latitude, loc_info) => ({
				category,
				description,
				file,
				longitude,
				latitude,
				loc_info,
				input_validate: jest.fn().mockReturnValue(true),
				image_validate: jest.fn().mockResolvedValue(true),
			})
		)
	})

	afterEach(() => {
		console_error_spy.mockRestore()
		console_log_spy.mockRestore()
	})

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------

	it('renders all fields', () => {
		render(<RequestForm onSubmit={mock_on_submit} />)

		expect(screen.getByTestId('mock-category-select')).toBeInTheDocument()

		expect(screen.getByTestId('description-input')).toBeInTheDocument()

		expect(
			screen.getByLabelText(/Choose an image to upload/i)
		).toBeInTheDocument()

		expect(
			screen.getByRole('button', {
				name: 'Submit',
			})
		).toBeInTheDocument()
	})

	// -------------------------------------------------------------------------
	// Image Upload
	// -------------------------------------------------------------------------

	it('shows preview when valid image uploaded', async () => {
		render(<RequestForm onSubmit={mock_on_submit} />)

		const file = new File(['abc'], 'road.png', {
			type: 'image/png',
		})

		image_validate.mockResolvedValue(true)
		get_data_uri.mockResolvedValue('data:image/png;base64,test')

		fireEvent.change(screen.getByLabelText(/Choose an image to upload/i), {
			target: { files: [file] },
		})

		await waitFor(() => {
			expect(screen.getByRole('img')).toBeInTheDocument()
		})

		expect(screen.getByRole('img')).toHaveAttribute(
			'src',
			'data:image/png;base64,test'
		)
	})

	it('rejects invalid image', async () => {
		render(<RequestForm onSubmit={mock_on_submit} />)

		const file = new File(['txt'], 'bad.txt', {
			type: 'text/plain',
		})

		image_validate.mockResolvedValue(false)

		fireEvent.change(screen.getByLabelText(/Choose an image to upload/i), {
			target: { files: [file] },
		})

		await waitFor(() => {
			expect(console_error_spy).toHaveBeenCalledWith(
				'Please provide a valid image.'
			)
		})
	})

	// -------------------------------------------------------------------------
	// Submit Validation
	// -------------------------------------------------------------------------

	it('rejects empty form submit', () => {
		render(<RequestForm onSubmit={mock_on_submit} />)

		fireEvent.click(
			screen.getByRole('button', {
				name: 'Submit',
			})
		)

		expect(console_error_spy).toHaveBeenCalledWith(
			'Please provide complete information.'
		)

		expect(mock_on_submit).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Successful Submit
	// -------------------------------------------------------------------------

	it('submits valid request', async () => {
		render(<RequestForm onSubmit={mock_on_submit} />)

		fireEvent.change(screen.getByTestId('mock-category-select'), {
			target: { value: 'Potholes' },
		})

		fireEvent.change(screen.getByTestId('description-input'), {
			target: {
				value: 'Large pothole near road',
			},
		})

		const file = new File(['img'], 'road.png', {
			type: 'image/png',
		})

		image_validate.mockResolvedValue(true)
		get_data_uri.mockResolvedValue('data:image/png;base64,test')

		fireEvent.change(screen.getByLabelText(/Choose an image to upload/i), {
			target: { files: [file] },
		})

		await waitFor(() => {
			expect(screen.getByRole('img')).toBeInTheDocument()
		})

		fireEvent.click(
			screen.getByRole('button', {
				name: 'Submit',
			})
		)

		await waitFor(() => {
			expect(mock_on_submit).toHaveBeenCalledTimes(1)
		})

		expect(Request).toHaveBeenCalledWith(
			'Potholes',
			'Large pothole near road',
			file,
			18.4,
			-33.9,
			expect.any(Object)
		)

		expect(console_log_spy).toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Request validation fails
	// -------------------------------------------------------------------------

	it('does not submit if Request input validation fails', async () => {
		Request.mockImplementation(() => ({
			input_validate: jest.fn().mockReturnValue(false),
			image_validate: jest.fn().mockResolvedValue(true),
		}))

		render(<RequestForm onSubmit={mock_on_submit} />)

		fireEvent.change(screen.getByTestId('mock-category-select'), {
			target: { value: 'Roads' },
		})

		fireEvent.change(screen.getByTestId('description-input'), {
			target: { value: 'Broken road' },
		})

		const file = new File(['img'], 'road.png', {
			type: 'image/png',
		})

		image_validate.mockResolvedValue(true)
		get_data_uri.mockResolvedValue('data:image/png;base64,test')

		fireEvent.change(screen.getByLabelText(/Choose an image to upload/i), {
			target: { files: [file] },
		})

		await waitFor(() => {
			expect(screen.getByRole('img')).toBeInTheDocument()
		})

		fireEvent.click(
			screen.getByRole('button', {
				name: 'Submit',
			})
		)

		await waitFor(() => {
			expect(mock_on_submit).not.toHaveBeenCalled()
		})
	})
})
