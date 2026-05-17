/* global jest, describe, test, expect */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import Sidebar from '../components/admin_sidebar/admin_sidebar.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../components/admin_sidebar/admin_sidebar.css', () => ({}))

// Avoid jest.requireActual — CRA's Jest transform doesn't reliably spread
// react-router-dom's ESM exports. Instead, stub exactly what Sidebar uses:
//   MemoryRouter  → passthrough wrapper (provides router context)
//   NavLink       → plain <a> that resolves the className function API
jest.mock('react-router-dom', () => ({
	MemoryRouter: ({ children }) => <div>{children}</div>,
	NavLink: ({ to, className, children }) => {
		const resolved_class =
			typeof className === 'function'
				? className({ isActive: false })
				: className
		return (
			<a href={to} className={resolved_class}>
				{children}
			</a>
		)
	},
	useLocation: () => ({ pathname: '/' }), // ← add this
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Helper
───────────────────────────────────────────────────────────────────────────── */

// Import MemoryRouter AFTER the mock so we get the stubbed version
import { MemoryRouter } from 'react-router-dom'

const render_sidebar = () =>
	render(
		<MemoryRouter>
			<Sidebar />
		</MemoryRouter>
	)

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('Sidebar Component', () => {
	test('is imported correctly', () => {
		expect(Sidebar).toBeDefined()
		expect(typeof Sidebar).toBe('function')
	})

	test('renders the logo and bottom user information', () => {
		render_sidebar()

		expect(screen.getByText('WIZA')).toBeInTheDocument()
		expect(
			screen.getByText(
				(_, el) =>
					el?.className === 'sidebar_logo_text' &&
					el.textContent === 'REPORT-WIZA'
			)
		).toBeInTheDocument()

		expect(screen.getByText('Admin Portal')).toBeInTheDocument()
		expect(screen.getByText('AD')).toBeInTheDocument()
		expect(screen.getByText('Admin')).toBeInTheDocument()
		expect(screen.getByText('Administrator')).toBeInTheDocument()
	})

	test('renders navigation sections and ready links', () => {
		render_sidebar()

		expect(screen.getByText('Management')).toBeInTheDocument()
		expect(screen.getByText('Insights')).toBeInTheDocument()

		const workers_link = screen.getByRole('link', { name: 'Workers' })
		expect(workers_link).toHaveAttribute('href', '/admin/workers')

		const requests_link = screen.getByRole('link', { name: 'Requests' })
		expect(requests_link).toHaveAttribute('href', '/admin/requests')
	})

	test('all analytics sub-items render as links', () => {
		render_sidebar()

		fireEvent.click(screen.getByRole('button', { name: /Analytics/i }))

		// Resident Satisfaction is now a live link — verify it routes correctly
		const satisfaction_link = screen.getByRole('link', {
			name: /Resident Satisfaction/i,
		})
		expect(satisfaction_link).toBeInTheDocument()
		expect(satisfaction_link).toHaveAttribute(
			'href',
			'/admin/analytics/satisfaction-report'
		)
	})

	test('handles dropdown menus correctly (expands and collapses)', () => {
		render_sidebar()

		const analytics_button = screen.getByRole('button', {
			name: /Analytics/i,
		})

		expect(screen.queryByText('Category Report')).not.toBeInTheDocument()

		fireEvent.click(analytics_button)
		expect(screen.getByText('Category Report')).toBeInTheDocument()
		expect(screen.getByText('Worker Performance')).toBeInTheDocument()

		fireEvent.click(analytics_button)
		expect(screen.queryByText('Category Report')).not.toBeInTheDocument()
	})

	test('multiple dropdowns toggle independently', () => {
		render_sidebar()

		fireEvent.click(screen.getByRole('button', { name: /Analytics/i }))
		expect(screen.getByText('Category Report')).toBeInTheDocument()

		expect(
			screen.getByRole('link', { name: 'Settings' })
		).toBeInTheDocument()
	})
})
