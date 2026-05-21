/* global jest, describe, test, expect, beforeEach */

// Polyfill setImmediate for jsdom (fixes @grpc/grpc-js ReferenceError)
if (typeof global.setImmediate === 'undefined') {
	global.setImmediate = setTimeout
}

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import WorkerMessages from '../pages/worker_messages/worker_messages.js'
import { subscribe_to_worker_conversations } from '../backend/worker_conversations_service.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../pages/worker_messages/worker_messages.css', () => ({}))

jest.mock('../backend/worker_conversations_service.js', () => ({
	subscribe_to_worker_conversations: jest.fn(),
}))

// Mock MessageThread to just verify it receives the correct request_uid
jest.mock(
	'../components/message_thread/message_thread.js',
	() =>
		function MockMessageThread({ request_uid }) {
			return <div data-testid="message-thread">Thread: {request_uid}</div>
		}
)

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('WorkerMessages Component', () => {
	let mockUnsubscribe

	const mockWorker = { uid: 'worker_1', name: 'John Worker' }

	const mockRequests = [
		{
			id: 'req_1',
			category: 'Pothole',
			ward: 'Ward 10',
			sa_ward: 'Ward 10', // <-- Add this
			status: 'Pending',
			resident_name: 'Alice',
		},
		{
			id: 'req_2',
			category: 'Water Leak',
			ward: 'Ward 11',
			sa_ward: 'Ward 11', // <-- Add this
			status: 'In Progress',
			resident_name: 'Bob',
		},
	]

	beforeEach(() => {
		jest.clearAllMocks()
		mockUnsubscribe = jest.fn()

		subscribe_to_worker_conversations.mockImplementation(
			(uid, callback) => {
				callback([
					{
						request_uid: 'req_1',
						last_message: {
							text: 'I am on site',
							sender_uid: 'worker_1',
							sent_at: new Date(),
						},
						unread_count: 0,
					},
					{
						request_uid: 'req_2',
						last_message: {
							text: 'When will you arrive?',
							sender_uid: 'resident_1',
							sent_at: new Date(),
						},
						unread_count: 2,
					},
				])
				return mockUnsubscribe
			}
		)
	})

	test('loads conversations and renders the list correctly', async () => {
		render(<WorkerMessages worker={mockWorker} requests={mockRequests} />)

		await waitFor(() => {
			// Check that the categories from the requests are matched to the conversations
			expect(screen.getByText('Pothole')).toBeInTheDocument()
			expect(screen.getByText('Water Leak')).toBeInTheDocument()

			// Check message previews
			expect(
				screen.getByText('When will you arrive?')
			).toBeInTheDocument()
		})

		// Check for the "You:" prefix on messages sent by the worker
		expect(screen.getByText('You:')).toBeInTheDocument()

		// Total unread badge at the top
		const unreadBadges = screen.getAllByText('2')
		expect(unreadBadges.length).toBeGreaterThan(0)
	})

	test('selects a conversation and renders the MessageThread', async () => {
		render(<WorkerMessages worker={mockWorker} requests={mockRequests} />)

		await waitFor(() => {
			expect(screen.getByText('Pothole')).toBeInTheDocument()
		})

		// Click the first conversation (Pothole)
		const potholeButton = screen.getByText('Pothole').closest('button')
		fireEvent.click(potholeButton)

		// The thread should mount with the correct request ID and show the topbar info
		expect(screen.getByTestId('message-thread')).toHaveTextContent(
			'Thread: req_1'
		)
		expect(screen.getByText('Alice')).toBeInTheDocument() // Resident name in topbar
		expect(screen.getByText('Pothole · Ward 10')).toBeInTheDocument() // Meta string
	})

	test('filters conversations based on search input', async () => {
		render(<WorkerMessages worker={mockWorker} requests={mockRequests} />)

		await waitFor(() => {
			expect(screen.getByText('Pothole')).toBeInTheDocument()
			expect(screen.getByText('Water Leak')).toBeInTheDocument()
		})

		const searchInput = screen.getByPlaceholderText(
			'Search by request or message…'
		)

		// Search by category
		fireEvent.change(searchInput, { target: { value: 'Water' } })

		expect(screen.queryByText('Pothole')).not.toBeInTheDocument()
		expect(screen.getByText('Water Leak')).toBeInTheDocument()

		// Search by message preview
		fireEvent.change(searchInput, { target: { value: 'site' } })

		expect(screen.getByText('Pothole')).toBeInTheDocument()
		expect(screen.queryByText('Water Leak')).not.toBeInTheDocument()
	})

	test('displays empty state if no conversations exist', async () => {
		subscribe_to_worker_conversations.mockImplementation(
			(uid, callback) => {
				callback([]) // Yield empty array
				return mockUnsubscribe
			}
		)

		render(<WorkerMessages worker={mockWorker} requests={mockRequests} />)

		await waitFor(() => {
			expect(
				screen.getByText('No conversations yet.')
			).toBeInTheDocument()
		})
	})

	test('cleans up subscription on unmount', () => {
		const { unmount } = render(
			<WorkerMessages worker={mockWorker} requests={mockRequests} />
		)
		unmount()
		expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
	})
})
