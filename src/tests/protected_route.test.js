/* global jest */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('../firebase_config.js', () => ({ auth: {}, db: {} }))

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	getDoc: jest.fn(),
}))

jest.mock('react-router-dom', () => ({
	Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
}))

import ProtectedRoute from '../components/protected_route/protected_route.js'
import { onAuthStateChanged } from 'firebase/auth'
import { getDoc } from 'firebase/firestore'

const MockChild = () => <div data-testid="protected-content">Protected</div>

describe('ProtectedRoute', () => {
	beforeEach(() => jest.clearAllMocks())

	it('renders nothing while loading', () => {
		onAuthStateChanged.mockImplementation(() => jest.fn())
		const { container } = render(
			<ProtectedRoute allowed_roles={['admin']}>
				<MockChild />
			</ProtectedRoute>
		)
		expect(container.firstChild).toBeNull()
	})

	it('redirects to /login when not authenticated', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(null)
			return jest.fn()
		})

		render(
			<ProtectedRoute allowed_roles={['admin']}>
				<MockChild />
			</ProtectedRoute>
		)

		await waitFor(() => {
			const nav = screen.getByTestId('navigate')
			expect(nav).toHaveAttribute('data-to', '/login')
		})
	})

	it('renders children when user has correct role', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user-1' })
			return jest.fn()
		})
		getDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({ role: 'admin' }),
		})

		render(
			<ProtectedRoute allowed_roles={['admin']}>
				<MockChild />
			</ProtectedRoute>
		)

		await waitFor(() => {
			expect(screen.getByTestId('protected-content')).toBeInTheDocument()
		})
	})

	it('redirects to / when user has wrong role', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user-1' })
			return jest.fn()
		})
		getDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({ role: 'resident' }),
		})

		render(
			<ProtectedRoute allowed_roles={['admin']}>
				<MockChild />
			</ProtectedRoute>
		)

		await waitFor(() => {
			const nav = screen.getByTestId('navigate')
			expect(nav).toHaveAttribute('data-to', '/')
		})
	})

	it('redirects to / when user document does not exist', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user-1' })
			return jest.fn()
		})
		getDoc.mockResolvedValueOnce({
			exists: () => false,
		})

		render(
			<ProtectedRoute allowed_roles={['admin']}>
				<MockChild />
			</ProtectedRoute>
		)

		await waitFor(() => {
			const nav = screen.getByTestId('navigate')
			expect(nav).toHaveAttribute('data-to', '/')
		})
	})

	it('allows worker to access worker routes', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'worker-1' })
			return jest.fn()
		})
		getDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({ role: 'worker' }),
		})

		render(
			<ProtectedRoute allowed_roles={['worker']}>
				<MockChild />
			</ProtectedRoute>
		)

		await waitFor(() => {
			expect(screen.getByTestId('protected-content')).toBeInTheDocument()
		})
	})

	it('allows resident to access resident routes', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'res-1' })
			return jest.fn()
		})
		getDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({ role: 'resident' }),
		})

		render(
			<ProtectedRoute allowed_roles={['resident']}>
				<MockChild />
			</ProtectedRoute>
		)

		await waitFor(() => {
			expect(screen.getByTestId('protected-content')).toBeInTheDocument()
		})
	})
})
