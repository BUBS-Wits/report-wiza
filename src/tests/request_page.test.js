/* global jest */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
// We need 'act' from RTL to wrap state-updating function calls
import { act } from '@testing-library/react'
import '@testing-library/jest-dom'

import RequestPage from '../pages/request/submit/request_page.js'
import { onAuthStateChanged } from 'firebase/auth'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks (Paths resolved relative to src/tests/)
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../pages/request/submit/request_page.css', () => ({}))
jest.mock('../firebase_config.js', () => ({ auth: {} }))
jest.mock('../constants.js', () => ({ WARD_API: 'mock-api-url' }))

// Mock Auth
jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
}))

// Mock Router
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}))

// Mock Child Components
jest.mock(
	'../components/nav_bar/nav_bar.js',
	() =>
		function MockNavBar() {
			return <div data-testid="nav-bar" />
		}
)
jest.mock(
	'../components/submit_prompt_modal/submit_prompt_modal.js',
	() =>
		function MockSubmitPromptModal({ is_open, on_close, on_continue }) {
			return is_open ? (
				<div data-testid="submit-modal">
					<button onClick={on_close}>Cancel</button>
					<button onClick={on_continue}>Continue Anonymously</button>
				</div>
			) : null
		}
)

// Mock RequestForm to easily trigger the submission
let capturedOnSubmit
jest.mock(
	'../components/request_form/request_form.js',
	() =>
		function MockRequestForm({ onSubmit, submitting }) {
			capturedOnSubmit = onSubmit
			return (
				<div data-testid="request-form">
					<button data-testid="mock-submit-btn" disabled={submitting}>
						{submitting ? 'Submitting...' : 'Submit'}
					</button>
				</div>
			)
		}
)

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('RequestPage Component', () => {
	let mockRequest

	beforeEach(() => {
		jest.clearAllMocks()

		// Mock the fetch API
		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true }),
			})
		)

		// Create a mock Request object
		mockRequest = {
			loc_validate: jest.fn().mockReturnValue(true),
			loc_info: { lat: -26.1, lng: 28.1 },
			input_validate: jest.fn().mockReturnValue(true),
			image_validate: jest.fn().mockResolvedValue(true),
			set_placeholder_image: jest.fn(),
			to_string: jest
				.fn()
				.mockReturnValue(JSON.stringify({ data: 'mock' })),
		}

		// Mock geolocation API
		const mockGeolocation = { getCurrentPosition: jest.fn() }
		Object.defineProperty(global.navigator, 'geolocation', {
			value: mockGeolocation,
			configurable: true,
			writable: true,
		})

		// Mock window.alert to avoid JSDOM errors
		jest.spyOn(window, 'alert').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	test('renders loading state initially', () => {
		// Leave user undefined to simulate loading
		onAuthStateChanged.mockImplementation(() => jest.fn())

		render(<RequestPage />)
		expect(screen.getByText('Loading…')).toBeInTheDocument()
	})

	test('renders form when user is not logged in (anonymous)', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(null) // Anonymous
			return jest.fn()
		})

		render(<RequestPage />)

		await waitFor(() => {
			expect(screen.getByTestId('request-form')).toBeInTheDocument()
		})
		expect(screen.getByText('Submit a')).toBeInTheDocument()
		expect(screen.getByText('Service Request')).toBeInTheDocument()
	})

	test('aborts submission if validation fails', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user_1' })
			return jest.fn()
		})

		render(<RequestPage />)

		// Force location validation to fail
		mockRequest.loc_validate.mockReturnValue(false)
		const consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		// FIX: Wrap the manual submit call in act() because it triggers state updates (set_submitting)
		await act(async () => {
			await capturedOnSubmit(mockRequest)
		})

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'Location/ward info missing:',
			mockRequest.loc_info
		)
		expect(global.fetch).not.toHaveBeenCalled()

		consoleErrorSpy.mockRestore()
	})

	test('shows modal when anonymous user attempts to submit', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(null) // Anonymous
			return jest.fn()
		})

		render(<RequestPage />)

		// FIX: Wrap the manual submit call in act() because it triggers state updates (set_show_modal)
		await act(async () => {
			await capturedOnSubmit(mockRequest)
		})

		// Modal should appear
		expect(screen.getByTestId('submit-modal')).toBeInTheDocument()
		expect(global.fetch).not.toHaveBeenCalled()
	})

	test('submits successfully when anonymous user clicks "Continue Anonymously" on modal', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(null) // Anonymous
			return jest.fn()
		})

		render(<RequestPage />)

		// FIX: Wrap the manual submit call in act()
		await act(async () => {
			await capturedOnSubmit(mockRequest)
		})

		expect(screen.getByTestId('submit-modal')).toBeInTheDocument()

		// Click continue on modal
		fireEvent.click(screen.getByText('Continue Anonymously'))

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledTimes(1)
		})

		// Verify it was called without an Authorization header
		expect(global.fetch).toHaveBeenCalledWith(
			'/api/submit-request',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ data: 'mock' }),
			})
		)

		// Verify success navigation
		expect(mockNavigate).toHaveBeenCalledWith('/')
	})

	test('submits directly with auth token when logged-in user submits', async () => {
		const mockUser = {
			uid: 'user_1',
			getIdToken: jest.fn().mockResolvedValue('mock-token-123'),
		}

		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(mockUser)
			return jest.fn()
		})

		render(<RequestPage />)

		// FIX: Wrap the manual submit call in act()
		await act(async () => {
			await capturedOnSubmit(mockRequest)
		})

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledTimes(1)
		})

		// Verify it was called WITH the Authorization header
		expect(global.fetch).toHaveBeenCalledWith(
			'/api/submit-request',
			expect.objectContaining({
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer mock-token-123',
				},
			})
		)

		// Verify modal did not appear
		expect(screen.queryByTestId('submit-modal')).not.toBeInTheDocument()
	})
})
