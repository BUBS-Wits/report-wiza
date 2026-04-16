import React from 'react'
import { render, screen } from '@testing-library/react'
import LandingPage from '../pages/landing_page/landing_page.js'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------

// Mock react-router-dom so Link renders as a plain <a> — no package required
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

// Suppress CSS import — Jest cannot process raw CSS files
jest.mock('../pages/landing_page/landing_page.css', () => ({}))

// Mock Navbar so the test is isolated to LandingPage only
jest.mock('../components/nav_bar/nav_bar.js', () => {
	const MockNavbar = () => <nav data-testid="mock-navbar" />
	MockNavbar.displayName = 'MockNavbar'
	return MockNavbar
})

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const renderLandingPage = () => render(<LandingPage />)

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('LandingPage', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	// -----------------------------------------------------------------------
	// 1. Component Mount
	// -----------------------------------------------------------------------

	describe('Given the LandingPage component is mounted', () => {
		describe('When it is rendered inside a router', () => {
			it('Then it should render without crashing', () => {
				expect(() => renderLandingPage()).not.toThrow()
			})

			it('Then it should render the root container with the correct class', () => {
				const { container } = renderLandingPage()
				const root = container.querySelector('.landing_root')
				expect(root).toBeInTheDocument()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 2. Navbar
	// -----------------------------------------------------------------------

	describe('Given the LandingPage is rendered', () => {
		describe('When the Navbar component is checked', () => {
			it('Then it should render the Navbar component', () => {
				renderLandingPage()
				expect(screen.getByTestId('mock-navbar')).toBeInTheDocument()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 3. Hero Section — static text
	// -----------------------------------------------------------------------

	describe('Given the LandingPage is rendered', () => {
		describe('When the hero section is inspected', () => {
			it('Then it should render the hero section element', () => {
				const { container } = renderLandingPage()
				expect(container.querySelector('.landing_hero')).toBeInTheDocument()
			})

			it('Then it should render the hero badge text', () => {
				renderLandingPage()
				expect(
					screen.getByText('Municipal Service Delivery Portal')
				).toBeInTheDocument()
			})

			it('Then it should render the first heading fragment "Your Ward."', () => {
				renderLandingPage()
				expect(screen.getByText(/Your Ward\./i)).toBeInTheDocument()
			})

			it('Then it should render the accented heading "Your Voice."', () => {
				renderLandingPage()
				const accent = screen.getByText('Your Voice.')
				expect(accent).toBeInTheDocument()
				expect(accent).toHaveClass('hero_heading_accent')
			})

			it('Then it should render the heading fragment "Your City."', () => {
				renderLandingPage()
				// "Your City." sits in the <h1> alongside the <span>, so we query the h1
				const h1 = screen.getByRole('heading', { level: 1 })
				expect(h1).toHaveTextContent('Your City.')
			})

			it('Then it should render the hero subtext paragraph', () => {
				renderLandingPage()
				expect(
					screen.getByText(
						/Report potholes, water outages, electricity faults/i
					)
				).toBeInTheDocument()
			})

			it('Then it should render the subtext mention of real-time tracking', () => {
				renderLandingPage()
				expect(
					screen.getByText(/Track every\s+request in real time\./i)
				).toBeInTheDocument()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 4. Hero Section — grid overlay & stat row structural elements
	// -----------------------------------------------------------------------

	describe('Given the LandingPage is rendered', () => {
		describe('When structural hero elements are checked', () => {
			it('Then it should render the hero grid overlay element', () => {
				const { container } = renderLandingPage()
				expect(
					container.querySelector('.hero_grid_overlay')
				).toBeInTheDocument()
			})

			it('Then it should render the hero stat row', () => {
				const { container } = renderLandingPage()
				expect(
					container.querySelector('.hero_stat_row')
				).toBeInTheDocument()
			})

			it('Then it should render exactly two stat dividers', () => {
				const { container } = renderLandingPage()
				const dividers = container.querySelectorAll('.hero_stat_divider')
				expect(dividers).toHaveLength(2)
			})
		})
	})

	// -----------------------------------------------------------------------
	// 5. Hero Section — statistics
	// -----------------------------------------------------------------------

	describe('Given the LandingPage is rendered', () => {
		describe('When the hero statistics are inspected', () => {
			it('Then it should render the "2,400+" requests submitted stat', () => {
				renderLandingPage()
				expect(screen.getByText('2,400+')).toBeInTheDocument()
				expect(screen.getByText('Requests Submitted')).toBeInTheDocument()
			})

			it('Then it should render the "87%" resolution rate stat', () => {
				renderLandingPage()
				expect(screen.getByText('87%')).toBeInTheDocument()
				expect(screen.getByText('Resolution Rate')).toBeInTheDocument()
			})

			it('Then it should render the "14" wards covered stat', () => {
				renderLandingPage()
				expect(screen.getByText('14')).toBeInTheDocument()
				expect(screen.getByText('Wards Covered')).toBeInTheDocument()
			})

			it('Then it should render exactly three stat numbers', () => {
				const { container } = renderLandingPage()
				const statNumbers = container.querySelectorAll('.stat_number')
				expect(statNumbers).toHaveLength(3)
			})

			it('Then it should render exactly three stat labels', () => {
				const { container } = renderLandingPage()
				const statLabels = container.querySelectorAll('.stat_label')
				expect(statLabels).toHaveLength(3)
			})
		})
	})

	// -----------------------------------------------------------------------
	// 6. Hero Section — call-to-action links
	// -----------------------------------------------------------------------

	describe('Given the LandingPage is rendered', () => {
		describe('When the hero action links are checked', () => {
			it('Then it should render the "Report an Issue" link pointing to /request', () => {
				renderLandingPage()
				const reportLink = screen.getByRole('link', {
					name: /Report an Issue/i,
				})
				expect(reportLink).toBeInTheDocument()
				expect(reportLink).toHaveAttribute('href', '/request')
			})

			it('Then it should render the "View Public Dashboard" link pointing to /dashboard', () => {
				renderLandingPage()
				const dashboardLink = screen.getByRole('link', {
					name: /View Public Dashboard/i,
				})
				expect(dashboardLink).toBeInTheDocument()
				expect(dashboardLink).toHaveAttribute('href', '/dashboard')
			})
		})
	})

	// -----------------------------------------------------------------------
	// 7. Features Section — layout & heading
	// -----------------------------------------------------------------------

	describe('Given the LandingPage is rendered', () => {
		describe('When the features section is inspected', () => {
			it('Then it should render the features section element', () => {
				const { container } = renderLandingPage()
				expect(
					container.querySelector('.landing_features')
				).toBeInTheDocument()
			})

			it('Then it should render the "How It Works" section heading', () => {
				renderLandingPage()
				expect(
					screen.getByRole('heading', { name: /How It Works/i })
				).toBeInTheDocument()
			})

			it('Then it should render exactly four feature cards', () => {
				const { container } = renderLandingPage()
				const cards = container.querySelectorAll('.feature_card')
				expect(cards).toHaveLength(4)
			})
		})
	})

	// -----------------------------------------------------------------------
	// 8. Features Section — individual cards
	// -----------------------------------------------------------------------

	describe('Given the LandingPage is rendered', () => {
		describe('When the "Submit a Request" feature card is checked', () => {
			it('Then it should render the 📍 icon', () => {
				renderLandingPage()
				expect(screen.getByText('📍')).toBeInTheDocument()
			})

			it('Then it should render the "Submit a Request" heading inside a link to /request', () => {
				renderLandingPage()
				// The h3 "Submit a Request" is wrapped in a Link to /request
				const submitLink = screen.getByRole('link', {
					name: /Submit a Request/i,
				})
				expect(submitLink).toBeInTheDocument()
				expect(submitLink).toHaveAttribute('href', '/request')
			})

			it('Then it should render the pin-location description paragraph', () => {
				renderLandingPage()
				expect(
					screen.getByText(/Pin your location, choose a category/i)
				).toBeInTheDocument()
			})
		})

		describe('When the "Get Notified" feature card is checked', () => {
			it('Then it should render the 🔔 icon', () => {
				renderLandingPage()
				expect(screen.getByText('🔔')).toBeInTheDocument()
			})

			it('Then it should render the "Get Notified" heading', () => {
				renderLandingPage()
				expect(
					screen.getByRole('heading', { name: /Get Notified/i })
				).toBeInTheDocument()
			})

			it('Then it should render the real-time updates description', () => {
				renderLandingPage()
				expect(
					screen.getByText(/Receive real-time updates/i)
				).toBeInTheDocument()
			})
		})

		describe('When the "Track on the Map" feature card is checked', () => {
			it('Then it should render the 🗺️ icon', () => {
				renderLandingPage()
				expect(screen.getByText('🗺️')).toBeInTheDocument()
			})

			it('Then it should render the "Track on the Map" heading', () => {
				renderLandingPage()
				expect(
					screen.getByRole('heading', { name: /Track on the Map/i })
				).toBeInTheDocument()
			})

			it('Then it should render the live-map description', () => {
				renderLandingPage()
				expect(
					screen.getByText(/View all requests in your ward on a live map/i)
				).toBeInTheDocument()
			})
		})

		describe('When the "Rate the Service" feature card is checked', () => {
			it('Then it should render the ⭐ icon', () => {
				renderLandingPage()
				expect(screen.getByText('⭐')).toBeInTheDocument()
			})

			it('Then it should render the "Rate the Service" heading', () => {
				renderLandingPage()
				expect(
					screen.getByRole('heading', { name: /Rate the Service/i })
				).toBeInTheDocument()
			})

			it('Then it should render the rating description', () => {
				renderLandingPage()
				expect(
					screen.getByText(/Once resolved, rate your experience/i)
				).toBeInTheDocument()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 9. Footer
	// -----------------------------------------------------------------------

	describe('Given the LandingPage is rendered', () => {
		describe('When the footer is inspected', () => {
			it('Then it should render the footer element', () => {
				const { container } = renderLandingPage()
				expect(container.querySelector('.landing_footer')).toBeInTheDocument()
			})

			it('Then it should render the copyright notice', () => {
				renderLandingPage()
				expect(
					screen.getByText(/© 2026 Report-wiza · COMS3009A · Wits University/i)
				).toBeInTheDocument()
			})

			it('Then it should render the "About" footer link pointing to /about', () => {
				renderLandingPage()
				const aboutLink = screen.getByRole('link', { name: /^About$/i })
				expect(aboutLink).toBeInTheDocument()
				expect(aboutLink).toHaveAttribute('href', '/about')
			})

			it('Then it should render the "Contact" footer link pointing to /contact', () => {
				renderLandingPage()
				const contactLink = screen.getByRole('link', { name: /^Contact$/i })
				expect(contactLink).toBeInTheDocument()
				expect(contactLink).toHaveAttribute('href', '/contact')
			})

			it('Then it should render the "Login" footer link pointing to /login', () => {
				renderLandingPage()
				const loginLink = screen.getByRole('link', { name: /^Login$/i })
				expect(loginLink).toBeInTheDocument()
				expect(loginLink).toHaveAttribute('href', '/login')
			})

			it('Then it should render the footer links container', () => {
				const { container } = renderLandingPage()
				expect(
					container.querySelector('.footer_links')
				).toBeInTheDocument()
			})
		})
	})

	// -----------------------------------------------------------------------
	// 10. Link inventory — all hrefs accounted for
	// -----------------------------------------------------------------------

	describe('Given the LandingPage is rendered', () => {
		describe('When all anchor elements are collected', () => {
			it('Then it should render exactly six <Link> elements in total', () => {
				renderLandingPage()
				// /request (hero) + /dashboard + /request (feature card) + /about + /contact + /login
				const allLinks = screen.getAllByRole('link')
				expect(allLinks).toHaveLength(6)
			})

			it('Then it should render two links pointing to /request', () => {
				renderLandingPage()
				const requestLinks = screen
					.getAllByRole('link')
					.filter((el) => el.getAttribute('href') === '/request')
				expect(requestLinks).toHaveLength(2)
			})
		})
	})
})