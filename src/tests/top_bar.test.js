import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TopBar from '../components/top_bar/top_bar.js'

jest.mock('../firebase_config.js', () => ({ auth: {} }))
jest.mock('../components/top_bar/top_bar.css', () => ({}))

jest.mock('firebase/auth', () => ({
	signOut: jest.fn().mockResolvedValue(),
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

import { signOut } from 'firebase/auth'

const render_topbar = (section = 'workers') =>
	render(<TopBar active_section={section} />)

describe('TopBar component', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given the workers section is active', () => {
		it('Then it should show the workers title', () => {
			render_topbar('workers')
			expect(screen.getByText('Workers')).toBeInTheDocument()
		})

		it('Then it should show the correct subtitle', () => {
			render_topbar('workers')
			expect(
				screen.getByText(/manage worker registrations/i)
			).toBeInTheDocument()
		})
	})

	describe('Given the requests section is active', () => {
		it('Then it should show the requests title', () => {
			render_topbar('requests')
			expect(screen.getByText('Requests')).toBeInTheDocument()
		})
	})

	describe('Given the analytics section is active', () => {
		it('Then it should show the analytics title', () => {
			render_topbar('analytics')
			expect(screen.getByText('Analytics')).toBeInTheDocument()
		})
	})

	describe('Given the sign out button is clicked', () => {
		it('Then it should call signOut and navigate to /login', async () => {
			render_topbar('workers')
			fireEvent.click(screen.getByText(/sign out/i))
			await waitFor(() => expect(signOut).toHaveBeenCalled())
			await waitFor(() =>
				expect(mock_navigate).toHaveBeenCalledWith('/login')
			)
		})
	})
})
