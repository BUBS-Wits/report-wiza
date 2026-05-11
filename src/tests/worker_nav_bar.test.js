/* global jest, describe, test, expect, beforeEach */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Import component
import Worker_nav_bar from '../components/worker_nav_bar/worker_nav_bar.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../components/worker_nav_bar/worker_nav_bar.css', () => ({}))

jest.mock('../firebase_config.js', () => ({
    auth: {},
}))

jest.mock('firebase/auth', () => ({
    signOut: jest.fn().mockResolvedValue(),
}))

jest.mock('../components/notification_bell/notification_bell.js', () => {
    return function DummyBell() {
        return <div data-testid="mock-notification-bell" />
    }
})

const mockNavigate = jest.fn()
let mockLocation = { pathname: '/worker-dashboard' }

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    Link: function MockLink({ children, to, className }) {
        return (
            <a href={to} className={className} data-testid={`link-${to}`}>
                {children}
            </a>
        )
    },
}))

import { signOut } from 'firebase/auth'

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('Worker Navbar Component', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockLocation = { pathname: '/worker-dashboard' }
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

    test('renders navigation items and dynamic unread badge correctly', () => {
        // FIX: Pass the unread_messages prop so the test finds the "3"
        render(<Worker_nav_bar unread_messages={3} />)

        expect(screen.getByText('Messages')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
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

    test('toggles mobile menu when hamburger button is clicked', () => {
        render(<Worker_nav_bar />)
        
        const mobileMenuBtn = screen.getByLabelText('Toggle navigation menu')
        const navLinksContainer = screen.getByText('My Queue').closest('div')
        
        expect(navLinksContainer).not.toHaveClass('wd_nav_links_mobile_open')

        // Open
        fireEvent.click(mobileMenuBtn)
        expect(navLinksContainer).toHaveClass('wd_nav_links_mobile_open')
        expect(mobileMenuBtn).toHaveTextContent('✖')
        
        // Close
        fireEvent.click(mobileMenuBtn)
        expect(navLinksContainer).not.toHaveClass('wd_nav_links_mobile_open')
        expect(mobileMenuBtn).toHaveTextContent('☰')
    })

    test('calls signOut and navigates to login when logout button is clicked', async () => {
        render(<Worker_nav_bar />)

        const logoutBtn = screen.getByRole('button', { name: /Log out/i })
        fireEvent.click(logoutBtn)

        await waitFor(() => {
            expect(signOut).toHaveBeenCalled()
            expect(mockNavigate).toHaveBeenCalledWith('/login')
        })
    })

    test('renders the NotificationBell component', () => {
        render(<Worker_nav_bar />)
        expect(screen.getByTestId('mock-notification-bell')).toBeInTheDocument()
    })
})