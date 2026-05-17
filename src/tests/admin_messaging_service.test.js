/* global jest */
import {
	subscribe_to_admin_threads,
	subscribe_to_thread_messages,
	admin_toggle_thread_messaging,
	invalidate_request_cache,
} from '../backend/admin_messaging_service.js'
import {
	onSnapshot,
	getDoc,
	updateDoc,
	query,
	where,
	or,
	doc, // Make sure doc is imported so we can mock it below
} from 'firebase/firestore'

// ── Mock Firebase Config ──────────────────────────────────────────────────
jest.mock('../firebase_config.js', () => ({
	db: {},
}))

// ── Mock Firestore ────────────────────────────────────────────────────────
jest.mock('firebase/firestore', () => {
	const mock_unsub = jest.fn()
	return {
		collection: jest.fn(),
		query: jest.fn(),
		orderBy: jest.fn(),
		where: jest.fn(),
		or: jest.fn(),
		doc: jest.fn(), // We define this safely in beforeEach!
		updateDoc: jest.fn(() => Promise.resolve()),
		getDoc: jest.fn(),
		onSnapshot: jest.fn((q, onNext) => {
			return mock_unsub
		}),
	}
})

describe('Admin Messaging Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		// 👇 FIX: Explicitly assign the doc mock here to prevent Jest hoisting bugs
		// This ensures ref objects are properly formed so updateDoc and getDoc don't crash
		doc.mockImplementation((db, coll, id) => ({ id }))
	})

	describe('admin_toggle_thread_messaging', () => {
		test('updates Firestore and invalidates cache', async () => {
			await admin_toggle_thread_messaging(
				'req_123',
				false,
				'admin_99',
				'Spam'
			)

			expect(updateDoc).toHaveBeenCalledTimes(1)
			expect(updateDoc).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'req_123' }),
				expect.objectContaining({
					messaging_enabled: false,
					messaging_locked_by: 'admin_99',
					messaging_lock_reason: 'Spam',
				})
			)
		})
	})

	describe('subscribe_to_thread_messages', () => {
		test('uses the OR query correctly to tolerate different field names', () => {
			const mock_on_update = jest.fn()
			const mock_on_error = jest.fn()

			subscribe_to_thread_messages(
				'req_123',
				mock_on_update,
				mock_on_error
			)

			expect(query).toHaveBeenCalled()
			// Should set up an 'or' query for both field name variations
			expect(where).toHaveBeenCalledWith('request_uid', '==', 'req_123')
			expect(where).toHaveBeenCalledWith('request_id', '==', 'req_123')
			expect(or).toHaveBeenCalled()
			expect(onSnapshot).toHaveBeenCalled()
		})

		test('handles snapshot errors gracefully', () => {
			const consoleSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			const mock_on_error = jest.fn()

			subscribe_to_thread_messages('req_123', jest.fn(), mock_on_error)

			const errorCallback = onSnapshot.mock.calls[0][2]
			const mockError = new Error('Permission denied')

			errorCallback(mockError)

			expect(mock_on_error).toHaveBeenCalledWith(mockError)
			expect(consoleSpy).toHaveBeenCalled()

			consoleSpy.mockRestore()
		})
	})

	describe('subscribe_to_admin_threads', () => {
		test('groups messages, infers the worker correctly, and triggers update', async () => {
			const mock_on_update = jest.fn()

			// Mock getDoc to return a fake service request and users
			getDoc.mockImplementation(async (docRef) => {
				const id = docRef ? docRef.id : 'unknown'

				if (id === 'req_1') {
					// Service Request Document
					return {
						exists: () => true,
						id: 'req_1',
						data: () => ({
							category: 'water',
							user_uid: 'resident_1',
							messaging_enabled: true,
						}),
					}
				} else if (id === 'worker_1') {
					// User Document (Worker)
					return {
						exists: () => true,
						id: 'worker_1',
						data: () => ({ display_name: 'John Plumber' }),
					}
				} else if (id === 'resident_1') {
					// User Document (Resident)
					return {
						exists: () => true,
						id: 'resident_1',
						data: () => ({ display_name: 'Jane Citizen' }),
					}
				}
				return { exists: () => false }
			})

			subscribe_to_admin_threads(mock_on_update)

			// Extract the callback passed to onSnapshot
			const snapshotCallback = onSnapshot.mock.calls[0][1]

			// Simulate a Firestore snapshot firing with two messages in the same thread
			const fakeSnap = {
				docs: [
					{
						id: 'msg1',
						data: () => ({
							request_uid: 'req_1',
							text: 'Hello from Resident',
							sender_uid: 'resident_1',
							receiver_uid: 'worker_1',
							read: true,
							sent_at: new Date(
								'2025-05-12T10:00:00Z'
							).toISOString(),
						}),
					},
					{
						id: 'msg2',
						data: () => ({
							request_uid: 'req_1',
							text: 'Hello from Worker',
							sender_uid: 'worker_1',
							receiver_uid: 'resident_1',
							read: false, // unread message
							sent_at: new Date(
								'2025-05-12T10:05:00Z'
							).toISOString(),
						}),
					},
				],
			}

			await snapshotCallback(fakeSnap)

			// The update function should be called with an array of enriched threads
			expect(mock_on_update).toHaveBeenCalled()
			const threads = mock_on_update.mock.calls[0][0]

			expect(threads).toHaveLength(1)

			const thread = threads[0]
			expect(thread.request_uid).toBe('req_1')

			// Check that inference worked (worker_1 was derived since it wasn't the resident)
			expect(thread.worker.uid).toBe('worker_1')
			expect(thread.worker.name).toBe('John Plumber')
			expect(thread.resident.name).toBe('Jane Citizen')

			// Stats check
			expect(thread.message_count).toBe(2)
			expect(thread.unread_count).toBe(1)
			expect(thread.last_message.text).toBe('Hello from Worker')
		})

		test('handles snapshot errors gracefully', () => {
			const consoleSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			const mock_on_error = jest.fn()

			subscribe_to_admin_threads(jest.fn(), mock_on_error)

			const errorCallback = onSnapshot.mock.calls[0][2]
			const mockError = new Error('Permission denied')

			errorCallback(mockError)

			expect(mock_on_error).toHaveBeenCalledWith(mockError)
			expect(consoleSpy).toHaveBeenCalled()

			consoleSpy.mockRestore()
		})
	})

	describe('invalidate_request_cache', () => {
		test('can be called without throwing errors', () => {
			expect(() => invalidate_request_cache('some_id')).not.toThrow()
		})
	})
})
