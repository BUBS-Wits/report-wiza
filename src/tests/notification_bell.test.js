import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Updated import path with .js extension
import NotificationBell from '../components/notification_bell/notification_bell.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks — Set up before importing the modules under test
───────────────────────────────────────────────────────────────────────────── */

// Mock the CSS to prevent Jest parsing errors
jest.mock('../components/notification_bell/notification_bell.css', () => ({}))

// Mock the Firebase config
jest.mock('../firebase_config.js', () => ({
	db: {},
}))

// Create stable mock functions for batch operations
const mockBatchUpdate = jest.fn()
const mockBatchCommit = jest.fn().mockResolvedValue()

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	orderBy: jest.fn(),
	limit: jest.fn(),
	doc: jest.fn(),
	updateDoc: jest.fn(),
	writeBatch: jest.fn(),
	onSnapshot: jest.fn(),
}))

import { onSnapshot, updateDoc, writeBatch } from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────────────────────
   Shared Fixtures
───────────────────────────────────────────────────────────────────────────── */

// Helper to create fake Firestore Timestamps
const createMockTimestamp = (date) => ({
	toDate: () => date,
})

const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)

const MOCK_NOTIFICATIONS = [
	{
		id: 'notif_001',
		type: 'request_status_update',
		title: 'Status Updated',
		body: 'Pothole request is in progress.',
		request_uid: 'req_xyz12345',
		read: false,
		created_at: createMockTimestamp(today),
	},
	{
		id: 'notif_002',
		type: 'assignment_confirmed',
		// FIX: Changed from 'Worker Assigned' to avoid collision with TYPE_CONFIG label
		title: 'Plumber Assigned',
		body: 'Thendo Mukhuba has been assigned.',
		request_uid: 'req_abc98765',
		read: true,
		created_at: createMockTimestamp(yesterday),
	},
]

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('NotificationBell Component', () => {
	let mockUnsubscribe

	beforeEach(() => {
		jest.clearAllMocks()
		mockUnsubscribe = jest.fn()

		// Default behavior: return empty notifications
		onSnapshot.mockImplementation((query, callback) => {
			callback({ docs: [] })
			return mockUnsubscribe
		})

		// FIX: Restore mock implementations here to survive CRA's resetMocks: true
		updateDoc.mockResolvedValue()
		writeBatch.mockImplementation(() => ({
			update: mockBatchUpdate,
			commit: mockBatchCommit,
		}))
	})

	/* ── Initial Render & Empty States ─────────────────────────────────────── */

	test('renders the bell icon without an unread badge when there are no notifications', () => {
		render(<NotificationBell userUid="resident_123" role="resident" />)

		const bellButton = screen.getByRole('button', {
			name: /Notifications/i,
		})
		expect(bellButton).toBeInTheDocument()
		expect(
			screen.queryByText(/unread/i, { selector: '.nb-badge' })
		).not.toBeInTheDocument()
	})

	test('opens the panel and shows the correct empty state for a resident', () => {
		render(<NotificationBell userUid="resident_123" role="resident" />)

		fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))

		expect(screen.getByRole('dialog')).toBeInTheDocument()
		expect(
			screen.getByText(
				"You're all caught up. We'll notify you when there's an update on your requests."
			)
		).toBeInTheDocument()
	})

	test('shows the correct empty state for an admin', () => {
		render(<NotificationBell userUid="admin_123" role="admin" />)
		fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
		expect(
			screen.getByText(
				'Nothing to action right now. Request activity will appear here.'
			)
		).toBeInTheDocument()
	})

	/* ── Populated State & Grouping ────────────────────────────────────────── */

	test('displays the unread badge with the correct count when notifications exist', () => {
		onSnapshot.mockImplementation((query, callback) => {
			callback({
				docs: MOCK_NOTIFICATIONS.map((n) => ({
					id: n.id,
					data: () => n,
				})),
			})
			return mockUnsubscribe
		})

		render(<NotificationBell userUid="resident_123" role="resident" />)

		const badge = screen.getByText('1')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('nb-badge')
	})

	test('groups notifications by "Today" and "Yesterday" correctly', () => {
		onSnapshot.mockImplementation((query, callback) => {
			callback({
				docs: MOCK_NOTIFICATIONS.map((n) => ({
					id: n.id,
					data: () => n,
				})),
			})
			return mockUnsubscribe
		})

		render(<NotificationBell userUid="resident_123" role="resident" />)
		fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))

		// Check group headers
		expect(screen.getByText('Today')).toBeInTheDocument()
		expect(screen.getByText('Yesterday')).toBeInTheDocument()

		// Check notification content
		expect(screen.getByText('Status Updated')).toBeInTheDocument()
		expect(
			screen.getByText('Pothole request is in progress.')
		).toBeInTheDocument()
		expect(screen.getByText('Plumber Assigned')).toBeInTheDocument() // FIX: Updated assertion
	})

	/* ── Interactions ──────────────────────────────────────────────────────── */

	test('calls updateDoc to mark a single notification as read when clicked', async () => {
		onSnapshot.mockImplementation((query, callback) => {
			callback({
				docs: MOCK_NOTIFICATIONS.map((n) => ({
					id: n.id,
					data: () => n,
				})),
			})
			return mockUnsubscribe
		})

		render(<NotificationBell userUid="resident_123" role="resident" />)
		fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))

		const unreadItem = screen
			.getByText('Status Updated')
			.closest('.nb-item')
		fireEvent.click(unreadItem)

		await waitFor(() => {
			expect(updateDoc).toHaveBeenCalledTimes(1)
		})
	})

	test('calls writeBatch to mark all notifications as read when the "Mark all read" button is clicked', async () => {
		// Provide two unread notifications to test batching
		const unreadMock = MOCK_NOTIFICATIONS.map((n) => ({
			...n,
			read: false,
		}))
		onSnapshot.mockImplementation((query, callback) => {
			callback({
				docs: unreadMock.map((n) => ({ id: n.id, data: () => n })),
			})
			return mockUnsubscribe
		})

		render(<NotificationBell userUid="resident_123" role="resident" />)
		fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))

		const markAllBtn = screen.getByRole('button', {
			name: /Mark all read/i,
		})
		fireEvent.click(markAllBtn)

		await waitFor(() => {
			expect(writeBatch).toHaveBeenCalledTimes(1)
			expect(mockBatchUpdate).toHaveBeenCalledTimes(2) // Updated two unread items
			expect(mockBatchCommit).toHaveBeenCalledTimes(1)
		})
	})

	test('closes the panel when clicking outside of it', () => {
		render(
			<div>
				<div data-testid="outside">Outside Element</div>
				<NotificationBell userUid="resident_123" role="resident" />
			</div>
		)

		// Open panel
		fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
		expect(screen.getByRole('dialog')).toBeInTheDocument()

		// Click outside
		fireEvent.mouseDown(screen.getByTestId('outside'))

		// Panel should be removed from DOM
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	test('unsubscribes from Firestore listener on unmount', () => {
		const { unmount } = render(
			<NotificationBell userUid="resident_123" role="resident" />
		)
		unmount()
		expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
	})
})
