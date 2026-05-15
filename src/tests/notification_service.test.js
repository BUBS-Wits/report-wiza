/* global jest */
import { notify_status_change } from '../backend/notification_service.js'
import {
	doc,
	getDoc,
	writeBatch,
	collection,
	serverTimestamp,
} from 'firebase/firestore'

// ── Mock Firebase Config ──────────────────────────────────────────────────
jest.mock('../firebase_config.js', () => ({
	db: {},
}))

// ── Mock Firestore ────────────────────────────────────────────────────────
jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	getDoc: jest.fn(),
	collection: jest.fn(),
	writeBatch: jest.fn(),
	serverTimestamp: jest.fn(),
}))

describe('Notification Service: notify_status_change', () => {
	let mockSet
	let mockCommit

	beforeEach(() => {
		jest.clearAllMocks()

		// 👇 FIX: Explicitly define all mock returns here so they survive global Jest resets!
		doc.mockReturnValue('mock_doc_reference')
		collection.mockReturnValue('mock_collection_reference')
		serverTimestamp.mockReturnValue('mock_server_timestamp')

		mockSet = jest.fn()
		mockCommit = jest.fn(() => Promise.resolve())

		writeBatch.mockReturnValue({
			set: mockSet,
			commit: mockCommit,
		})

		// Temporarily suppress console logs to keep test output clean
		jest.spyOn(console, 'warn').mockImplementation(() => {})
		jest.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		console.warn.mockRestore()
		console.error.mockRestore()
	})

	test('aborts gracefully and logs a warning if the request document does not exist', async () => {
		getDoc.mockResolvedValueOnce({
			exists: () => false,
		})

		await notify_status_change('req_123', 'in_progress', 'admin_1')

		expect(getDoc).toHaveBeenCalledTimes(1)
		expect(console.warn).toHaveBeenCalledWith(
			'Request req_123 not found. Skipping notifications.'
		)
		expect(mockSet).not.toHaveBeenCalled()
		expect(mockCommit).not.toHaveBeenCalled()
	})

	test('creates notifications for BOTH resident and worker if modified by an Admin', async () => {
		getDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({
				user_uid: 'resident_99',
				assigned_worker_uid: 'worker_42',
				category: 'Potholes',
			}),
		})

		// Modifier is 'admin_1', which matches neither resident nor worker
		await notify_status_change('req_123', 'assigned', 'admin_1')

		expect(mockSet).toHaveBeenCalledTimes(2)

		// Assert Resident Notification was queued
		expect(mockSet).toHaveBeenCalledWith(
			'mock_doc_reference',
			expect.objectContaining({
				user_uid: 'resident_99',
				type: 'request_status_update',
				body: 'Your Potholes request is now assigned.',
			})
		)

		// Assert Worker Notification was queued
		expect(mockSet).toHaveBeenCalledWith(
			'mock_doc_reference',
			expect.objectContaining({
				user_uid: 'worker_42',
				type: 'request_status_update',
				body: 'A Potholes request assigned to you is now assigned.',
			})
		)

		expect(mockCommit).toHaveBeenCalledTimes(1)
	})

	test('creates a notification ONLY for the Worker if the Resident modifies it', async () => {
		getDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({
				user_uid: 'resident_99',
				assigned_worker_uid: 'worker_42',
				category: 'Water',
			}),
		})

		// Modifier is the resident!
		await notify_status_change('req_123', 'closed', 'resident_99')

		// Should only be 1 notification (for the worker)
		expect(mockSet).toHaveBeenCalledTimes(1)
		expect(mockSet).toHaveBeenCalledWith(
			'mock_doc_reference',
			expect.objectContaining({
				user_uid: 'worker_42',
			})
		)
		expect(mockCommit).toHaveBeenCalledTimes(1)
	})

	test('creates a notification ONLY for the Resident if the Worker modifies it', async () => {
		getDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({
				user_uid: 'resident_99',
				assigned_worker_uid: 'worker_42',
				category: 'Electricity',
			}),
		})

		// Modifier is the worker!
		await notify_status_change('req_123', 'resolved', 'worker_42')

		// Should only be 1 notification (for the resident)
		expect(mockSet).toHaveBeenCalledTimes(1)
		expect(mockSet).toHaveBeenCalledWith(
			'mock_doc_reference',
			expect.objectContaining({
				user_uid: 'resident_99',
			})
		)
		expect(mockCommit).toHaveBeenCalledTimes(1)
	})

	test('uses fallback category "Service" if category is missing from database', async () => {
		getDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({
				user_uid: 'resident_99',
				// Note: No category provided here
			}),
		})

		await notify_status_change('req_123', 'in_progress', 'worker_42')

		expect(mockSet).toHaveBeenCalledWith(
			'mock_doc_reference',
			expect.objectContaining({
				body: 'Your Service request is now in_progress.', // Defaults to 'Service'
			})
		)
	})

	test('catches and logs errors if Firestore fails during execution', async () => {
		const mockError = new Error('Firestore connection failed')
		getDoc.mockRejectedValueOnce(mockError)

		await notify_status_change('req_123', 'in_progress', 'admin_1')

		expect(console.error).toHaveBeenCalledWith(
			'Error creating status notifications:',
			mockError
		)
	})
})
