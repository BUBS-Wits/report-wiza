import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Login from '../pages/login_page/login.js'

jest.mock('../firebase_config.js', () => ({ auth: {}, db: {} }))
jest.mock('../pages/login_page/login.css', () => ({}))
jest.mock('../components/nav_bar/nav_bar.js', () => {
	function MockNavBar() {
		return <div data-testid="navbar" />
	}
	return MockNavBar
})

jest.mock('firebase/auth', () => ({
	GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
	signInWithPopup: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	getDoc: jest.fn(),
	setDoc: jest.fn(),
	serverTimestamp: jest.fn(),
}))

const mock_navigate = jest.fn()
jest.mock('../pages/login_page/login.js', () => {
	const actual = jest.requireActual('../pages/login_page/login.js')
	return actual
})

jest.mock(
	'react-router-dom',
	() => ({
		useNavigate: () => mock_navigate,
		BrowserRouter: ({ children }) => <div>{children}</div>,
	}),
	{ virtual: true }
)

import { signInWithPopup } from 'firebase/auth'
import { getDoc, setDoc } from 'firebase/firestore'

const render_login = () => render(<Login />)

describe('Login page', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given the login page renders', () => {
		describe('When it loads', () => {
			it('Then it should show the sign in button', () => {
				render_login()
				expect(
					screen.getByText(/sign in with google/i)
				).toBeInTheDocument()
			})

			it('Then it should show the logo', () => {
				render_login()
				expect(screen.getByText(/WIZA/)).toBeInTheDocument()
			})

			it('Then it should show the tagline', () => {
				render_login()
				expect(
					screen.getByText(/municipal service/i)
				).toBeInTheDocument()
			})

			it('Then it should show the footer', () => {
				render_login()
				expect(screen.getByText(/south africa/i)).toBeInTheDocument()
			})

			it('Then it should render the navbar', () => {
				render_login()
				expect(screen.getByTestId('navbar')).toBeInTheDocument()
			})
		})
	})

	describe('Given the user clicks sign in', () => {
		describe('When sign in succeeds and user is a resident', () => {
			it('Then it should navigate to /resident', async () => {
				signInWithPopup.mockResolvedValueOnce({
					user: {
						uid: 'uid-123',
						displayName: 'Test',
						email: 'test@gmail.com',
					},
				})
				getDoc.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ role: 'resident' }),
				})
				render_login()
				fireEvent.click(screen.getByText(/sign in with google/i))
				await waitFor(
					() =>
						expect(mock_navigate).toHaveBeenCalledWith(
							'/resident/requests'
						) //changed by sibu to expect correct redirect
				)
			})
		})

		describe('When sign in succeeds and user is an admin', () => {
			it('Then it should navigate to /admin', async () => {
				signInWithPopup.mockResolvedValueOnce({
					user: {
						uid: 'uid-456',
						displayName: 'Admin',
						email: 'admin@gmail.com',
					},
				})
				getDoc.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ role: 'admin' }),
				})
				render_login()
				fireEvent.click(screen.getByText(/sign in with google/i))
				await waitFor(() =>
					expect(mock_navigate).toHaveBeenCalledWith('/admin')
				)
			})
		})

		describe('When sign in succeeds and user is a worker', () => {
			it('Then it should navigate to /worker-dashboard', async () => {
				signInWithPopup.mockResolvedValueOnce({
					user: {
						uid: 'uid-789',
						displayName: 'Worker',
						email: 'worker@gmail.com',
					},
				})
				getDoc.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ role: 'worker' }),
				})
				render_login()
				fireEvent.click(screen.getByText(/sign in with google/i))
				await waitFor(() =>
					expect(mock_navigate).toHaveBeenCalledWith(
						'/worker-dashboard'
					)
				)
			})
		})

		describe('When the user is new', () => {
			it('Then it should create a profile and navigate to /resident', async () => {
				signInWithPopup.mockResolvedValueOnce({
					user: {
						uid: 'uid-new',
						displayName: 'New',
						email: 'new@gmail.com',
					},
				})
				getDoc.mockResolvedValueOnce({ exists: () => false })
				setDoc.mockResolvedValueOnce()
				render_login()
				fireEvent.click(screen.getByText(/sign in with google/i))
				await waitFor(() => expect(setDoc).toHaveBeenCalled())
				await waitFor(
					() =>
						expect(mock_navigate).toHaveBeenCalledWith(
							'/resident/requests'
						) //changed by sibu to expect correct redirect
				)
			})
		})

		describe('When sign in fails', () => {
			it('Then it should show an error message', async () => {
				signInWithPopup.mockRejectedValueOnce({
					code: 'auth/network-request-failed',
				})
				render_login()
				fireEvent.click(screen.getByText(/sign in with google/i))
				await waitFor(() =>
					expect(
						screen.getByText(/sign-in failed/i)
					).toBeInTheDocument()
				)
			})
		})

		describe('When the user closes the popup', () => {
			it('Then it should not show an error', async () => {
				signInWithPopup.mockRejectedValueOnce({
					code: 'auth/popup-closed-by-user',
				})
				render_login()
				fireEvent.click(screen.getByText(/sign in with google/i))
				await waitFor(() =>
					expect(mock_navigate).not.toHaveBeenCalled()
				)
				expect(
					screen.queryByText(/sign-in failed/i)
				).not.toBeInTheDocument()
			})
		})
	})
})
