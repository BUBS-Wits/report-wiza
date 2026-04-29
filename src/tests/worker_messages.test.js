/* global jest */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import WorkerMessages from '../pages/worker_messages/worker_messages.js'
import { onAuthStateChanged } from 'firebase/auth'
import { fetch_worker_dashboard_data } from '../backend/worker_dashboard_service.js'
import { subscribe_to_worker_conversations } from '../backend/worker_conversations_service.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../pages/worker_messages/worker_messages.css', () => ({}))

// Provide a mock currentUser just in case the component uses it directly
jest.mock('../firebase_config.js', () => ({
	auth: { currentUser: { uid: 'worker_1' } },
}))

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
}))

jest.mock('../backend/worker_dashboard_service.js', () => ({
	fetch_worker_dashboard_data: jest.fn(),
}))

jest.mock('../backend/worker_conversations_service.js', () => ({
	subscribe_to_worker_conversations: jest.fn(),
}))

// Mock inner components to simplify DOM testing
jest.mock(
	'../components/worker_nav_bar/worker_nav_bar.js',
	() =>
		function MockWorkerNavBar() {
			return <div data-testid="worker-nav" />
		}
)
jest.mock(
	'../components/message_thread/message_thread.js',
	() =>
		function MockMessageThread({ request_id }) {
			return <div data-testid="message-thread">Thread: {request_id}</div>
		}
)

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('WorkerMessages Component', () => {
	let mockUnsubscribe

	beforeEach(() => {
		jest.clearAllMocks()
		mockUnsubscribe = jest.fn()

		// Simulate logged-in worker
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'worker_1' })
			return jest.fn()
		})

		fetch_worker_dashboard_data.mockResolvedValue({
			worker: { uid: 'worker_1', name: 'John Worker' },
			requests: [
				{ id: 'req_1', category: 'Pothole' },
				{ id: 'req_2', category: 'Water Leak' },
			],
		})

		subscribe_to_worker_conversations.mockImplementation(
			(uid, callback) => {
				callback([
					{
						request_id: 'req_1',
						category: 'Pothole',
						ward: 'Ward 10',
						// Added various standard property names just in case!
						last_msg_text: 'I am on site',
						last_message_text: 'I am on site',
						last_msg_sender: 'worker_1',
						last_message_sender_uid: 'worker_1',
						sender_uid: 'worker_1',
						unread_count: 0,
						updated_at: new Date(),
					},
					{
						request_id: 'req_2',
						category: 'Water Leak',
						ward: 'Ward 11',
						last_msg_text: 'When will you arrive?',
						last_message_text: 'When will you arrive?',
						last_msg_sender: 'resident_1',
						last_message_sender_uid: 'resident_1',
						sender_uid: 'resident_1',
						unread_count: 2,
						updated_at: new Date(),
					},
				])
				return mockUnsubscribe
			}
		)
	})

	test('renders loading state initially', async () => {
		fetch_worker_dashboard_data.mockReturnValue(new Promise(() => {}))

		render(<WorkerMessages />)

		expect(screen.getByText('Loading…')).toBeInTheDocument()
	})

	test('loads conversations and renders worker nav bar', async () => {
		render(<WorkerMessages />)

		await waitFor(() => {
			expect(screen.getByTestId('worker-nav')).toBeInTheDocument()
			expect(screen.getByText('Pothole')).toBeInTheDocument()
			expect(screen.getByText('Water Leak')).toBeInTheDocument()
		})

		// Use getByLabelText to avoid matching the "2" in the total unread header
		expect(screen.getByLabelText('2 unread')).toHaveClass('wm-unread-badge')
	})

	test('selects a conversation and renders the MessageThread', async () => {
		render(<WorkerMessages />)

		await waitFor(() => {
			expect(screen.getByText('Pothole')).toBeInTheDocument()
		})

		// Click a conversation
		fireEvent.click(screen.getByText('Pothole').closest('button'))

		// Thread should mount with the correct request ID
		expect(screen.getByTestId('message-thread')).toHaveTextContent(
			'Thread: req_1'
		)
	})

	test('displays empty state if no conversations exist', async () => {
		subscribe_to_worker_conversations.mockImplementation(
			(uid, callback) => {
				callback([]) // No conversations
				return mockUnsubscribe
			}
		)

		render(<WorkerMessages />)

		await waitFor(() => {
			expect(screen.getByTestId('worker-nav')).toBeInTheDocument()
		})

		expect(screen.queryByText('Pothole')).not.toBeInTheDocument()
	})
})
