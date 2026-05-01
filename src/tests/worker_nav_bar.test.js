/* global jest */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Import component with .js extension
import Worker_nav_bar from '../components/worker_nav_bar/worker_nav_bar.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

// Mock CSS
jest.mock('../components/worker_nav_bar/worker_nav_bar.css', () => ({}))

// Mock Firebase Config & Auth
jest.mock('../firebase_config.js', () => ({
	auth: {},
}))

jest.mock('firebase/auth', () => ({
	signOut: jest.fn().mockResolvedValue(),
}))

// Mock Notification Bell to prevent Firestore listener side-effects
jest.mock('../components/notification_bell/notification_bell.js', () => {
	return function DummyBell() {
		return <div data-testid="mock-notification-bell" />
	}
})

// Mock React Router DOM
const mockNavigate = jest.fn()
let mockLocation = { pathname: '/worker-dashboard' }

jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
	useLocation: () => mockLocation,
	Link: ({ children, to, className }) => (
		<a href={to} className={className} data-testid={`link-${to}`}>
			{children}
		</a>
	),
}))

import { signOut } from 'firebase/auth'

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('Worker Navbar Component', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockLocation = { pathname: '/worker-dashboard' } // Reset to default
	})

	test('renders default user information if no user prop is provided', () => {
		render(<Worker_nav_bar />)

		expect(screen.getByText('Jane Doe')).toBeInTheDocument()
		expect(screen.getByText('Field Worker')).toBeInTheDocument()
		expect(screen.getByText('JD')).toBeInTheDocument()
	})

	test('renders custom user information from props', () => {
		const customUser = {
			initials: 'TM',
			name: 'Thendo Mukhuba',
			role: 'Senior Plumber',
			uid: 'worker_123',
		}

		render(<Worker_nav_bar user={customUser} />)

		expect(screen.getByText('Thendo Mukhuba')).toBeInTheDocument()
		expect(screen.getByText('Senior Plumber')).toBeInTheDocument()
		expect(screen.getByText('TM')).toBeInTheDocument()
	})

	test('renders all navigation items correctly', () => {
		render(<Worker_nav_bar />)

		expect(screen.getByText('Messages')).toBeInTheDocument()

		// Check for specific badges
		expect(screen.getByText('3')).toBeInTheDocument() // Messages badge
	})

	test('applies scrolled styling when window is scrolled down', () => {
		render(<Worker_nav_bar />)

		const navElement = screen.getByRole('navigation')
		expect(navElement).not.toHaveClass('wd_navbar_scrolled')

		// Simulate scroll
		fireEvent.scroll(window, { target: { scrollY: 50 } })

		expect(navElement).toHaveClass('wd_navbar_scrolled')

		// Simulate scrolling back to top
		fireEvent.scroll(window, { target: { scrollY: 0 } })
		expect(navElement).not.toHaveClass('wd_navbar_scrolled')
	})

	test('calls signOut and navigates to login when logout button is clicked', async () => {
		render(<Worker_nav_bar />)

		const logoutBtn = screen.getByRole('button', { name: /Log out/i })
		fireEvent.click(logoutBtn)

		await waitFor(() => {
			expect(signOut).toHaveBeenCalledTimes(1)
			expect(mockNavigate).toHaveBeenCalledWith('/login')
		})
	})

	test('renders the NotificationBell component', () => {
		render(<Worker_nav_bar />)
		expect(screen.getByTestId('mock-notification-bell')).toBeInTheDocument()
	})
})
