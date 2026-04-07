import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorkerVerify from '../pages/worker_verify/worker_verify.js'

jest.mock('../firebase_config.js', () => ({ auth: {} }))
jest.mock('../pages/worker_verify/worker_verify.css', () => ({}))

jest.mock('firebase/auth', () => ({
	isSignInWithEmailLink: jest.fn(),
	signInWithEmailLink: jest.fn(),
}))

jest.mock('../backend/admin_firebase.js', () => ({
	confirm_worker_role: jest.fn(),
}))

const mock_navigate = jest.fn()
jest.mock(
	'react-router-dom',
	() => ({
		useNavigate: () => mock_navigate,
		BrowserRouter: ({ children }) => <div>{children}</div>,
	}),
	{ virtual: true }
)

import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { confirm_worker_role } from '../backend/admin_firebase.js'

const render_verify = () => render(<WorkerVerify />)

describe('WorkerVerify page', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given an invalid email link', () => {
		describe('When the page loads', () => {
			it('Then it should show the error state', async () => {
				isSignInWithEmailLink.mockReturnValue(false)
				render_verify()
				await waitFor(() =>
					expect(
						screen.getByText(/invalid or expired link/i)
					).toBeInTheDocument()
				)
			})
		})
	})

	describe('Given a valid email link', () => {
		describe('When verification succeeds', () => {
			it('Then it should navigate to /worker after success', async () => {
				isSignInWithEmailLink.mockReturnValue(true)
				window.localStorage.setItem(
					'worker_email_for_sign_in',
					'worker@test.com'
				)
				signInWithEmailLink.mockResolvedValueOnce({
					user: { uid: 'uid-worker' },
				})
				confirm_worker_role.mockResolvedValueOnce({ success: true })
				render_verify()
				await waitFor(
					() => expect(confirm_worker_role).toHaveBeenCalled(),
					{
						timeout: 3000,
					}
				)
				await waitFor(
					() => expect(mock_navigate).toHaveBeenCalledWith('/worker'),
					{
						timeout: 3000,
					}
				)
				window.localStorage.removeItem('worker_email_for_sign_in')
			})
		})

		describe('When verification fails', () => {
			it('Then it should show the verification failed message', async () => {
				isSignInWithEmailLink.mockReturnValue(true)
				window.localStorage.setItem(
					'worker_email_for_sign_in',
					'worker@test.com'
				)
				signInWithEmailLink.mockRejectedValueOnce(
					new Error('auth error')
				)
				render_verify()
				const msg = await screen.findByRole('heading', {
					name: /verification failed/i,
				})
				expect(msg).toBeInTheDocument()
				window.localStorage.removeItem('worker_email_for_sign_in')
			})
		})
	})
})
