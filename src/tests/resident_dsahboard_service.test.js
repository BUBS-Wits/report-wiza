/* global jest, describe, beforeEach, test, expect */
import {
	fetch_resident_requests,
	fetch_resident_profile,
	subscribe_to_resident_unread_count,
} from '../backend/resident_dashboard_service.js'
import {
	getDocs,
	getDoc,
	onSnapshot,
	collection,
	query,
	where,
	orderBy,
	doc,
} from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	getDocs: jest.fn(),
	onSnapshot: jest.fn(),
	orderBy: jest.fn(),
	doc: jest.fn(),
	getDoc: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('Resident Dashboard Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		// Setup basic returns for path-builders to prevent undefined errors
		collection.mockImplementation((db, coll) => coll)
		doc.mockImplementation((db, coll, id) => `${coll}/${id}`)
		query.mockReturnValue('mock-query')
		where.mockReturnValue('mock-where')
		orderBy.mockReturnValue('mock-orderBy')
	})

	describe('fetch_resident_requests', () => {
		test('fetches requests and resolves worker names successfully', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'req_1',
						data: () => ({
							category: 'Water',
							assigned_worker_uid: 'worker_123',
						}),
					},
					{
						id: 'req_2',
						data: () => ({
							category: 'Roads',
							assigned_worker_uid: null,
						}),
					},
				],
			})

			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ name: 'John Plumber' }),
			})

			const requests = await fetch_resident_requests('resident_456')

			expect(getDocs).toHaveBeenCalledTimes(1)
			expect(getDoc).toHaveBeenCalledTimes(1)

			expect(requests).toHaveLength(2)

			expect(requests[0].id).toBe('req_1')
			expect(requests[0].worker_name).toBe('John Plumber')

			expect(requests[1].id).toBe('req_2')
			expect(requests[1].worker_name).toBeNull()
		})

		test('falls back to "Worker" if the worker document does not exist', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'req_1',
						data: () => ({ assigned_worker_uid: 'ghost_worker' }),
					},
				],
			})

			getDoc.mockResolvedValueOnce({
				exists: () => false,
				data: () => ({}),
			})

			const requests = await fetch_resident_requests('resident_456')

			expect(requests[0].worker_name).toBe('Worker')
		})

		test('falls back to "Worker" if fetching the worker document throws an error', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'req_1',
						data: () => ({ assigned_worker_uid: 'error_worker' }),
					},
				],
			})

			getDoc.mockRejectedValueOnce(new Error('Network failure'))

			const requests = await fetch_resident_requests('resident_456')

			expect(requests[0].worker_name).toBe('Worker')
		})

		test('deduplicates worker fetches (only fetches a worker uid once)', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'req_1',
						data: () => ({ assigned_worker_uid: 'worker_1' }),
					},
					{
						id: 'req_2',
						data: () => ({ assigned_worker_uid: 'worker_1' }),
					},
				],
			})

			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({ name: 'Alice' }),
			})

			const requests = await fetch_resident_requests('resident_456')

			expect(getDoc).toHaveBeenCalledTimes(1)
			expect(requests[0].worker_name).toBe('Alice')
			expect(requests[1].worker_name).toBe('Alice')
		})
	})

	describe('fetch_resident_profile', () => {
		test('returns the profile if the document exists', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ name: 'Sarah Connor', email: 'sarah@test.com' }),
			})

			const profile = await fetch_resident_profile('resident_123')

			expect(doc).toHaveBeenCalledWith(
				expect.anything(),
				'users',
				'resident_123'
			)
			expect(profile).toEqual({
				uid: 'resident_123',
				name: 'Sarah Connor',
				email: 'sarah@test.com',
			})
		})

		test('throws an error if the profile does not exist', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => false,
			})

			await expect(
				fetch_resident_profile('resident_123')
			).rejects.toThrow('Resident profile not found.')
		})
	})

	describe('subscribe_to_resident_unread_count', () => {
		test('sets up snapshot listener and calls on_count with snap.size', () => {
			const mockOnCount = jest.fn()
			const mockUnsubscribe = jest.fn()

			onSnapshot.mockImplementationOnce((query, callback) => {
				callback({ size: 3 })
				return mockUnsubscribe
			})

			const unsub = subscribe_to_resident_unread_count(
				'resident_123',
				mockOnCount
			)

			expect(where).toHaveBeenCalledWith(
				'receiver_uid',
				'==',
				'resident_123'
			)
			expect(where).toHaveBeenCalledWith('read', '==', false)
			expect(onSnapshot).toHaveBeenCalledTimes(1)

			expect(mockOnCount).toHaveBeenCalledWith(3)
			expect(unsub).toBe(mockUnsubscribe)
		})

		test('handles snapshot errors', () => {
			const mockOnCount = jest.fn()
			const consoleSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			onSnapshot.mockImplementationOnce((query, onSuccess, onError) => {
				onError(new Error('Permission denied'))
				return jest.fn()
			})

			subscribe_to_resident_unread_count('resident_123', mockOnCount)

			expect(consoleSpy).toHaveBeenCalledWith(
				'[resident_dashboard_service] unread count error:',
				expect.any(Error)
			)

			consoleSpy.mockRestore()
		})
	})
})
