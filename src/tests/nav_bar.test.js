import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Adjust this path to reach out of 'tests' and into 'components'
import Navbar from '../components/nav_bar/nav_bar.js'

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------

// 1. Suppress CSS import
jest.mock('../components/nav_bar/nav_bar.css', () => ({}))

// 2. Mock react-router-dom to render Link as a standard <a> tag
jest.mock(
	'react-router-dom',
	() => ({
		Link: ({ to, className, children }) => (
			<a href={to} className={className}>
				{children}
			</a>
		),
	}),
	{ virtual: true }
)

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('Navbar', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		// Reset scroll position before each test
		window.scrollY = 0
	})

	// -----------------------------------------------------------------------
	// 1. Initial Render
	// -----------------------------------------------------------------------
	describe('Given the Navbar component is mounted', () => {
		describe('When it initially renders', () => {
			it('Then it should display the logo elements correctly', () => {
				render(<Navbar />)

				expect(screen.getByText('W')).toBeInTheDocument()
				expect(screen.getByText('Report-wiza')).toBeInTheDocument()
				expect(screen.getByText('W').closest('a')).toHaveAttribute(
					'href',
					'/'
				)
			})

			it('Then it should display all navigation links', () => {
				render(<Navbar />)

				const home_link = screen.getByRole('link', { name: 'Home' })
				const about_link = screen.getByRole('link', {
					name: 'About Us',
				})
				const contact_link = screen.getByRole('link', {
					name: 'Contact Us',
				})
				const login_link = screen.getByRole('link', {
					name: 'Login / Register',
				})

				expect(home_link).toHaveAttribute('href', '/')
				expect(about_link).toHaveAttribute('href', '/about')
				expect(contact_link).toHaveAttribute('href', '/contact')
				expect(login_link).toHaveAttribute('href', '/login')
			})

			it('Then it should not have the navbar_scrolled class applied', () => {
				const { container } = render(<Navbar />)

				const nav_element = container.querySelector('.navbar')
				expect(nav_element).toBeInTheDocument()
				expect(nav_element).not.toHaveClass('navbar_scrolled')
			})
		})

		// -----------------------------------------------------------------------
		// 2. Scroll Event Listeners & State Toggling
		// -----------------------------------------------------------------------
		describe('When the window is scrolled past 20 pixels', () => {
			it('Then it should add the navbar_scrolled class', () => {
				const { container } = render(<Navbar />)
				const nav_element = container.querySelector('.navbar')

				// Simulate the user scrolling down the page
				fireEvent.scroll(window, { target: { scrollY: 50 } })

				// The state should update and append the class
				expect(nav_element).toHaveClass('navbar_scrolled')
			})
		})

		describe('When the window is scrolled back to the top (<= 20 pixels)', () => {
			it('Then it should remove the navbar_scrolled class', () => {
				const { container } = render(<Navbar />)
				const nav_element = container.querySelector('.navbar')

				// Scroll down first to trigger the class
				fireEvent.scroll(window, { target: { scrollY: 100 } })
				expect(nav_element).toHaveClass('navbar_scrolled')

				// Scroll back up to the top
				fireEvent.scroll(window, { target: { scrollY: 10 } })

				// The class should be removed
				expect(nav_element).not.toHaveClass('navbar_scrolled')
			})
		})

		// -----------------------------------------------------------------------
		// 3. Component Cleanup
		// -----------------------------------------------------------------------
		describe('When the component unmounts', () => {
			it('Then it should remove the scroll event listener to prevent memory leaks', () => {
				const remove_listener_spy = jest.spyOn(
					window,
					'removeEventListener'
				)

				const { unmount } = render(<Navbar />)

				// Unmount the component to trigger the useEffect cleanup function
				unmount()

				// Assert that window.removeEventListener was called with 'scroll'
				expect(remove_listener_spy).toHaveBeenCalledWith(
					'scroll',
					expect.any(Function)
				)

				remove_listener_spy.mockRestore()
			})
		})
	})
})
