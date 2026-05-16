/* global jest */
import { subscribe_to_worker_conversations } from '../backend/worker_conversations_service.js'
import {
	onSnapshot,
	query,
	where,
	orderBy,
	collection,
	or,
	doc,
	getDoc,
} from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	orderBy: jest.fn(),
	or: jest.fn(),
	onSnapshot: jest.fn(),
	doc: jest.fn(), // We will define this safely in beforeEach!
	getDoc: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers & Fixtures
───────────────────────────────────────────────────────────────────────────── */

// Helper to create mock Firestore Timestamps
const mockTimestamp = (ms) => new Date(ms).toISOString()

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
	let mockUnsub

	beforeEach(() => {
		jest.clearAllMocks()
		mockOnUpdate = jest.fn()
		mockOnError = jest.fn()
		mockUnsub = jest.fn()

		onSnapshot.mockReturnValue(mockUnsub)

		// 👇 FIX: Explicitly assign the doc mock here to prevent Jest hoisting bugs
		doc.mockImplementation((db, coll, id) => ({ id }))

		// 👇 FIX: Guarantee getDoc always resolves a valid mock request
		getDoc.mockImplementation(async (docRef) => {
			return {
				exists: () => true,
				id: docRef ? docRef.id : 'dummy_id',
				data: () => ({ category: 'Water', status: 'open' }),
			}
		})
	})

	test('sets up a single OR query and returns an unsubscribe function', () => {
		const unsub = subscribe_to_worker_conversations(
			'worker_123',
			mockOnUpdate,
			mockOnError
		)

		// Verify queries were built correctly
		expect(where).toHaveBeenCalledWith('sender_uid', '==', 'worker_123')
		expect(where).toHaveBeenCalledWith('receiver_uid', '==', 'worker_123')
		expect(or).toHaveBeenCalled()
		expect(orderBy).toHaveBeenCalledWith('sent_at', 'asc')
		expect(onSnapshot).toHaveBeenCalledTimes(1)

		unsub()
		expect(mockUnsub).toHaveBeenCalledTimes(1)
	})

	test('groups messages by request and calculates unread count', async () => {
		subscribe_to_worker_conversations(
			'worker_123',
			mockOnUpdate,
			mockOnError
		)

		const snapshotCallback = onSnapshot.mock.calls[0][1]

		const fakeSnap = createMockSnap([
			{
				id: 'msg_1',
				request_id: 'req_A',
				sender_uid: 'worker_123',
				receiver_uid: 'resident_1',
				text: 'Hello',
				sent_at: mockTimestamp(1000),
				read: true,
			},
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

		// Await the snapshot processing
		await snapshotCallback(fakeSnap)

		expect(mockOnUpdate).toHaveBeenCalled()

		const conversations =
			mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0]

		expect(conversations.length).toBe(2)

		// Request B (Newer, so it should be first in the array)
		expect(conversations[0].request_id).toBe('req_B')
		expect(conversations[0].other_uid).toBe('resident_2')
		expect(conversations[0].unread_count).toBe(1)
		expect(conversations[0].last_message.text).toBe('Help')

		// Request A
		expect(conversations[1].request_id).toBe('req_A')
		expect(conversations[1].other_uid).toBe('resident_1')
		expect(conversations[1].unread_count).toBe(1)
		expect(conversations[1].last_message.text).toBe('Are you there?')
		expect(conversations[1].all_messages.length).toBe(3)
	})

	test('deduplicates messages if they somehow appear twice', async () => {
		subscribe_to_worker_conversations(
			'worker_123',
			mockOnUpdate,
			mockOnError
		)

		const snapshotCallback = onSnapshot.mock.calls[0][1]

		const dupMessage = {
			id: 'msg_X',
			request_id: 'req_Z',
			sender_uid: 'worker_123',
			receiver_uid: 'resident_1',
			sent_at: mockTimestamp(100),
		}

		await snapshotCallback(createMockSnap([dupMessage, dupMessage]))

		const conversations =
			mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0]

		expect(conversations.length).toBe(1)
		expect(conversations[0].all_messages.length).toBe(1)
	})

	test('handles and emits snapshot errors cleanly', () => {
		const consoleSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		subscribe_to_worker_conversations(
			'worker_123',
			mockOnUpdate,
			mockOnError
		)

		const errorCallback = onSnapshot.mock.calls[0][2]
		const mockError = new Error('Permission denied')

		errorCallback(mockError)

		expect(mockOnError).toHaveBeenCalledTimes(1)
		expect(mockOnError).toHaveBeenCalledWith(mockError)
		expect(consoleSpy).toHaveBeenCalledTimes(1)

		consoleSpy.mockRestore()
	})
})
