/* global jest */
import { subscribe_to_worker_conversations } from '../backend/worker_conversations_service.js'
import {
	onSnapshot,
	query,
	where,
	orderBy,
	collection,
} from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	orderBy: jest.fn(),
	onSnapshot: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers & Fixtures
───────────────────────────────────────────────────────────────────────────── */

// Helper to create mock Firestore Timestamps
const mockTimestamp = (ms) => ({
	toMillis: () => ms,
})

// Helper to create mock Firestore Snapshots
const createMockSnap = (messages) => ({
	docs: messages.map((msg) => ({
		id: msg.id,
		data: () => msg,
	})),
})

describe('Worker Conversations Service', () => {
	let mockOnUpdate
	let mockOnError
	let mockUnsubSent
	let mockUnsubReceived

	beforeEach(() => {
		jest.clearAllMocks()
		mockOnUpdate = jest.fn()
		mockOnError = jest.fn()

		mockUnsubSent = jest.fn()
		mockUnsubReceived = jest.fn()

		// Default mock behavior for onSnapshot
		onSnapshot
			.mockReturnValueOnce(mockUnsubSent) // First call (sent messages)
			.mockReturnValueOnce(mockUnsubReceived) // Second call (received messages)
	})

	test('sets up two queries and returns a combined unsubscribe function', () => {
		const unsub = subscribe_to_worker_conversations(
			'worker_123',
			mockOnUpdate,
			mockOnError
		)

		// Verify queries were built correctly
		expect(where).toHaveBeenCalledWith('sender_uid', '==', 'worker_123')
		expect(where).toHaveBeenCalledWith('receiver_uid', '==', 'worker_123')
		expect(orderBy).toHaveBeenCalledWith('sent_at', 'asc')
		expect(onSnapshot).toHaveBeenCalledTimes(2)

		// Verify teardown function unmounts both listeners
		unsub()
		expect(mockUnsubSent).toHaveBeenCalledTimes(1)
		expect(mockUnsubReceived).toHaveBeenCalledTimes(1)
	})

	test('merges sent and received messages, groups by request, and calculates unread count', () => {
		subscribe_to_worker_conversations(
			'worker_123',
			mockOnUpdate,
			mockOnError
		)

		// Extract the callbacks passed to onSnapshot
		const sentCallback = onSnapshot.mock.calls[0][1]
		const receivedCallback = onSnapshot.mock.calls[1][1]

		// Simulate Worker sending 1 message in Request A
		sentCallback(
			createMockSnap([
				{
					id: 'msg_1',
					request_id: 'req_A',
					sender_uid: 'worker_123',
					receiver_uid: 'resident_1',
					text: 'Hello',
					sent_at: mockTimestamp(1000),
					read: true,
				},
			])
		)

		// Simulate Worker receiving 2 messages in Request A (1 unread), and 1 in Request B (unread)
		receivedCallback(
			createMockSnap([
				{
					id: 'msg_2',
					request_id: 'req_A',
					sender_uid: 'resident_1',
					receiver_uid: 'worker_123',
					text: 'Hi back',
					sent_at: mockTimestamp(2000),
					read: true,
				},
				{
					id: 'msg_3',
					request_id: 'req_A',
					sender_uid: 'resident_1',
					receiver_uid: 'worker_123',
					text: 'Are you there?',
					sent_at: mockTimestamp(3000),
					read: false,
				},
				{
					id: 'msg_4',
					request_id: 'req_B',
					sender_uid: 'resident_2',
					receiver_uid: 'worker_123',
					text: 'Help',
					sent_at: mockTimestamp(4000),
					read: false,
				},
			])
		)

		// Check the final output sent to the onUpdate callback
		expect(mockOnUpdate).toHaveBeenCalled()

		// Grab the most recent argument passed to onUpdate
		const conversations =
			mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0]

		expect(conversations.length).toBe(2)

		// Request B (Newer, so it should be first in the array)
		expect(conversations[0].request_id).toBe('req_B')
		expect(conversations[0].other_uid).toBe('resident_2') // Derived correctly
		expect(conversations[0].unread_count).toBe(1)
		expect(conversations[0].last_message.text).toBe('Help')

		// Request A
		expect(conversations[1].request_id).toBe('req_A')
		expect(conversations[1].other_uid).toBe('resident_1') // Derived correctly
		expect(conversations[1].unread_count).toBe(1) // Only msg_3 is unread & received by worker
		expect(conversations[1].last_message.text).toBe('Are you there?')
		expect(conversations[1].all_messages.length).toBe(3)
	})

	test('deduplicates messages if they somehow appear in both snapshots', () => {
		subscribe_to_worker_conversations(
			'worker_123',
			mockOnUpdate,
			mockOnError
		)

		const sentCallback = onSnapshot.mock.calls[0][1]
		const receivedCallback = onSnapshot.mock.calls[1][1]

		// Same message object artificially showing up in both
		const dupMessage = {
			id: 'msg_X',
			request_id: 'req_Z',
			sender_uid: 'worker_123',
			receiver_uid: 'resident_1',
			sent_at: mockTimestamp(100),
		}

		sentCallback(createMockSnap([dupMessage]))
		receivedCallback(createMockSnap([dupMessage]))

		const conversations =
			mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0]

		expect(conversations.length).toBe(1)
		expect(conversations[0].all_messages.length).toBe(1) // Deduplicated by Map
	})

	test('handles and emits snapshot errors cleanly', () => {
		// Temporarily spy on console.error to keep test output clean
		const consoleSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		subscribe_to_worker_conversations(
			'worker_123',
			mockOnUpdate,
			mockOnError
		)

		// Extract the error callbacks passed to onSnapshot
		const sentErrorCallback = onSnapshot.mock.calls[0][2]
		const receivedErrorCallback = onSnapshot.mock.calls[1][2]

		const mockError1 = new Error('Permission denied')
		const mockError2 = new Error('Quota exceeded')

		// Trigger errors
		sentErrorCallback(mockError1)
		receivedErrorCallback(mockError2)

		expect(mockOnError).toHaveBeenCalledTimes(2)
		expect(mockOnError).toHaveBeenCalledWith(mockError1)
		expect(mockOnError).toHaveBeenCalledWith(mockError2)
		expect(consoleSpy).toHaveBeenCalledTimes(2)

		consoleSpy.mockRestore()
	})
})
