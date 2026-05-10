/* global jest */
import {
	subscribe_to_thread,
	send_message,
	mark_messages_read,
	notify_new_message,
	format_message_time,
} from '../backend/message_thread_service.js'
import {
	onSnapshot,
	addDoc,
	writeBatch,
	serverTimestamp,
	doc,
} from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

const mockBatchUpdate = jest.fn()
const mockBatchCommit = jest.fn().mockResolvedValue()

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	addDoc: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	orderBy: jest.fn(),
	onSnapshot: jest.fn(),
	writeBatch: jest.fn(),
	doc: jest.fn(), // Will be implemented in beforeEach
	serverTimestamp: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('Message Thread Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		// FIX: Restore mock implementations here to survive CRA's resetMocks: true
		serverTimestamp.mockReturnValue('mock-server-timestamp')
		doc.mockImplementation((db, coll, id) => `${coll}/${id}`) // Restored doc mock
		writeBatch.mockImplementation(() => ({
			update: mockBatchUpdate,
			commit: mockBatchCommit,
		}))
	})

	describe('subscribe_to_thread', () => {
		test('maps snapshot documents and calls on_messages', () => {
			const mockOnMessages = jest.fn()
			const mockOnError = jest.fn()

			// Mock the snapshot behavior to immediately fire the success callback
			onSnapshot.mockImplementation((query, onNext) => {
				onNext({
					docs: [
						{ id: 'msg1', data: () => ({ text: 'Hello' }) },
						{ id: 'msg2', data: () => ({ text: 'World' }) },
					],
				})
				return jest.fn() // Return mock unsubscribe
			})

			subscribe_to_thread('req_123', mockOnMessages, mockOnError)

			expect(onSnapshot).toHaveBeenCalledTimes(1)
			expect(mockOnMessages).toHaveBeenCalledWith([
				{ id: 'msg1', text: 'Hello' },
				{ id: 'msg2', text: 'World' },
			])
			expect(mockOnError).not.toHaveBeenCalled()
		})

		test('calls on_error if the snapshot fails', () => {
			const mockOnMessages = jest.fn()
			const mockOnError = jest.fn()
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

			onSnapshot.mockImplementation((query, onNext, onError) => {
				onError(new Error('Snapshot failed'))
				return jest.fn()
			})

			subscribe_to_thread('req_123', mockOnMessages, mockOnError)

			expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
			expect(consoleSpy).toHaveBeenCalled()
			consoleSpy.mockRestore()
		})
	})

	describe('send_message', () => {
		test('throws an error if message text is empty or just whitespace', async () => {
			await expect(send_message({ text: '   ' })).rejects.toThrow(
				'Message text cannot be empty.'
			)
			expect(addDoc).not.toHaveBeenCalled()
		})

		test('trims text and adds a new document to the messages collection', async () => {
			addDoc.mockResolvedValueOnce({ id: 'new_msg_id' })

			const result = await send_message({
				request_id: 'req_123',
				sender_uid: 'user_1',
				receiver_uid: 'worker_1',
				text: '   Fix is done!   ',
			})

			expect(result).toBe('new_msg_id')
			expect(addDoc).toHaveBeenCalledWith(undefined, {
				request_id: 'req_123',
				sender_uid: 'user_1',
				receiver_uid: 'worker_1',
				text: 'Fix is done!',
				sent_at: 'mock-server-timestamp',
				read: false,
			})
		})
	})

	describe('mark_messages_read', () => {
		test('does nothing if there are no unread messages for the current user', async () => {
			const messages = [
				{ id: '1', receiver_uid: 'user_1', read: true }, // Already read
				{ id: '2', receiver_uid: 'other_user', read: false }, // Belong to someone else
			]

			await mark_messages_read(messages, 'user_1')

			expect(writeBatch).not.toHaveBeenCalled()
		})

		test('batches updates only for unread messages sent to the current user', async () => {
			const messages = [
				{ id: 'msg1', receiver_uid: 'user_1', read: false }, // Should update
				{ id: 'msg2', receiver_uid: 'user_1', read: false }, // Should update
				{ id: 'msg3', receiver_uid: 'user_1', read: true }, // Skip
			]

			await mark_messages_read(messages, 'user_1')

			expect(writeBatch).toHaveBeenCalledTimes(1)
			expect(mockBatchUpdate).toHaveBeenCalledTimes(2)
			expect(mockBatchUpdate).toHaveBeenCalledWith('messages/msg1', {
				read: true,
			})
			expect(mockBatchUpdate).toHaveBeenCalledWith('messages/msg2', {
				read: true,
			})
			expect(mockBatchCommit).toHaveBeenCalledTimes(1)
		})
	})

	describe('notify_new_message', () => {
		test('adds a notification with full text if under 80 characters', async () => {
			await notify_new_message({
				receiver_uid: 'res_1',
				receiver_role: 'resident',
				sender_name: 'John Worker',
				text: 'I am on my way.',
				request_id: 'req_123',
			})

			expect(addDoc).toHaveBeenCalledWith(
				undefined,
				expect.objectContaining({
					user_uid: 'res_1',
					type: 'new_message',
					body: 'I am on my way.',
					request_uid: 'req_123',
				})
			)
		})

		test('truncates the body if the text is over 80 characters', async () => {
			const longText = 'A'.repeat(100)

			await notify_new_message({
				receiver_uid: 'res_1',
				receiver_role: 'resident',
				sender_name: 'John Worker',
				text: longText,
				request_id: 'req_123',
			})

			const expectedBody = 'A'.repeat(80) + '…'

			expect(addDoc).toHaveBeenCalledWith(
				undefined,
				expect.objectContaining({
					body: expectedBody,
				})
			)
		})
	})

	describe('format_message_time', () => {
		beforeAll(() => {
			// Lock system time to a specific date for predictable tests
			// Example: Oct 15, 2026 14:30:00 local time
			jest.useFakeTimers()
			jest.setSystemTime(new Date(2026, 9, 15, 14, 30, 0))
		})

		afterAll(() => {
			jest.useRealTimers()
		})

		test('returns empty string if timestamp is falsy', () => {
			expect(format_message_time(null)).toBe('')
			expect(format_message_time(undefined)).toBe('')
		})

		test('returns only HH:MM if the timestamp is from today', () => {
			// Same day, slightly earlier: 10:15 AM
			const today = new Date(2026, 9, 15, 10, 15, 0)

			// Mock Firestore Timestamp
			const firestoreTimestamp = { toDate: () => today }

			expect(format_message_time(firestoreTimestamp)).toBe('10:15')
		})

		test('returns DD/MMM HH:MM if the timestamp is from a previous day', () => {
			// Previous day: Oct 14, 2026 09:05 AM
			const pastDate = new Date(2026, 9, 14, 9, 5, 0)

			expect(format_message_time(pastDate)).toMatch(
				/14 Oct 09:05|Oct 14 09:05/i
			)
		})
	})
})
