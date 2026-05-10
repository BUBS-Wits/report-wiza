/* global jest */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import ResidentDashboard from '../pages/resident_dashboard/resident_dashboard.js'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
	fetch_resident_profile,
	fetch_resident_requests,
	subscribe_to_resident_unread_count,
} from '../backend/resident_dashboard_service.js'

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	getDocs: jest.fn(),
	doc: jest.fn(),
	getDoc: jest.fn(),
	onSnapshot: jest.fn(() => jest.fn()),
	orderBy: jest.fn(),
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../pages/resident_dashboard/resident_dashboard.css', () => ({}))
jest.mock('../firebase_config.js', () => ({ auth: {} }))

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
	signOut: jest.fn().mockResolvedValue(),
}))

const mockNavigate = jest.fn()

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	Link: ({ children, to }) => <a href={to}>{children}</a>,
	useNavigate: () => mockNavigate,
}))

jest.mock('../backend/resident_dashboard_service.js', () => ({
	fetch_resident_profile: jest.fn(),
	fetch_resident_requests: jest.fn(),
	subscribe_to_resident_unread_count: jest.fn(),
}))

jest.mock(
	'../components/notification_bell/notification_bell.js',
	() =>
		function MockNotifBell() {
			return <div data-testid="notif-bell" />
		}
)
jest.mock(
	'../components/message_thread/message_thread.js',
	() =>
		function MockMessageThread() {
			return <div data-testid="message-thread" />
		}
)

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('ResidentDashboard Component', () => {
	let mockUnsubscribe

	beforeEach(() => {
		jest.clearAllMocks()
		mockUnsubscribe = jest.fn()

		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'res_1' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({
			uid: 'res_1',
			name: 'Sarah Connor',
			email: 'sarah@test.com',
		})

		fetch_resident_requests.mockResolvedValue([
			{
				id: 'req_1',
				category: 'Streetlight',
				status: 'Pending',
				description: 'Light is broken.',
				created_at: new Date(),
				updated_at: new Date(),
			},
			{
				id: 'req_2',
				category: 'Pothole',
				status: 'Acknowledged',
				description: 'Huge crater in the road.',
				created_at: new Date(),
				updated_at: new Date(),
			},
		])

		subscribe_to_resident_unread_count.mockImplementation(
			(uid, callback) => {
				callback(0)
				return mockUnsubscribe
			}
		)
	})

	test('renders loading screen initially and resolves cleanly', async () => {
		render(<ResidentDashboard />)
		expect(
			screen.getByText('Loading your dashboard\u2026')
		).toBeInTheDocument()
		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard\u2026')
			).not.toBeInTheDocument()
		})
	})

	test('loads and displays resident profile and requests', async () => {
		render(<ResidentDashboard />)
		await waitFor(() => {
			expect(screen.getByText('Sarah Connor')).toBeInTheDocument()
			expect(screen.getAllByText('Streetlight').length).toBeGreaterThan(0)
		})
		expect(screen.getByText('SC')).toBeInTheDocument()
	})

	test('selects a request and shows detail view', async () => {
		render(<ResidentDashboard />)
		await waitFor(() => {
			expect(screen.getAllByText('Pothole').length).toBeGreaterThan(0)
		})
		const requestCard = screen
			.getAllByText('Pothole')[0]
			.closest('.rd-req-card')
		fireEvent.click(requestCard)
		expect(
			screen.getAllByText('Huge crater in the road.').length
		).toBeGreaterThan(0)
		expect(screen.getByText('Not yet assigned')).toBeInTheDocument()
	})

	test('displays empty state when resident has no requests', async () => {
		fetch_resident_requests.mockResolvedValue([])
		render(<ResidentDashboard />)
		await waitFor(() => {
			expect(
				screen.getByText(
					/You haven't submitted any service requests yet/i
				)
			).toBeInTheDocument()
		})
	})

	test('handles user logout correctly', async () => {
		render(<ResidentDashboard />)
		await waitFor(() => {
			expect(screen.getByText('Sarah Connor')).toBeInTheDocument()
		})
		const logoutBtn = screen.getByRole('button', { name: /Log out/i })
		fireEvent.click(logoutBtn)
		await waitFor(() => {
			expect(signOut).toHaveBeenCalledTimes(1)
		})
	})

	test('shows priority badge when request has priority set', async () => {
		fetch_resident_requests.mockResolvedValueOnce([
			{
				id: 'req_priority',
				category: 'Streetlight',
				status: 'open',
				description: 'Burst pipe',
				priority: 'High',
				created_at: new Date(),
				updated_at: new Date(),
				worker_uid: null,
				worker_name: null,
			},
		])
		render(<ResidentDashboard />)
		await waitFor(() => {
			expect(screen.getAllByText('Streetlight').length).toBeGreaterThan(0)
		})
		expect(screen.getByText('High')).toBeInTheDocument()
	})

	test('shows Not set when request has no priority', async () => {
		fetch_resident_requests.mockResolvedValueOnce([
			{
				id: 'req_no_priority',
				category: 'Streetlight',
				status: 'open',
				description: 'Burst pipe',
				priority: null,
				created_at: new Date(),
				updated_at: new Date(),
				worker_uid: null,
				worker_name: null,
			},
		])
		render(<ResidentDashboard />)
		await waitFor(() => {
			expect(screen.getAllByText('Streetlight').length).toBeGreaterThan(0)
		})
		expect(screen.getByText('Not set')).toBeInTheDocument()
	})

	test('shows messaging unavailable when no worker assigned', async () => {
		fetch_resident_requests.mockResolvedValueOnce([
			{
				id: 'req_no_worker',
				category: 'Streetlight',
				status: 'open',
				description: 'Burst pipe',
				priority: null,
				created_at: new Date(),
				updated_at: new Date(),
				worker_uid: null,
				worker_name: null,
			},
		])
		render(<ResidentDashboard />)
		await waitFor(() => {
			expect(screen.getAllByText('Streetlight').length).toBeGreaterThan(0)
		})
		expect(
			screen.getByText(
				/Messaging will be available once a worker is assigned/i
			)
		).toBeInTheDocument()
	})
})
