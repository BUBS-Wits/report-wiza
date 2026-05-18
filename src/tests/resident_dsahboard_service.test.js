/* global jest, describe, beforeEach, test, expect */
import {
	fetch_resident_requests,
	fetch_resident_profile,
	subscribe_to_resident_unread_count,
	cancel_request,
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
	updateDoc,
} from 'firebase/firestore'

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	getDocs: jest.fn(),
	onSnapshot: jest.fn(),
	orderBy: jest.fn(),
	doc: jest.fn(),
	getDoc: jest.fn(),
	updateDoc: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

describe('Resident Dashboard Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		collection.mockImplementation((db, coll) => coll)
		doc.mockImplementation((db, coll, id) => `${coll}/${id}`)
		query.mockReturnValue('mock-query')
		where.mockReturnValue('mock-where')
		orderBy.mockReturnValue('mock-orderBy')
	})

	describe('fetch_resident_requests', () => {
		test('fetches requests and resolves worker names successfully', async () => {
			getDocs
				.mockResolvedValueOnce({
					empty: false,
					docs: [
						{ id: 'req_1', data: () => ({ status: 'ASSIGNED' }) },
						{ id: 'req_2', data: () => ({ status: 'SUBMITTED' }) },
					],
				})
				.mockResolvedValueOnce({
					empty: false,
					docs: [{ data: () => ({ worker_uid: 'worker_123' }) }],
				})
				.mockResolvedValueOnce({
					empty: true,
					docs: [],
				})

			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ name: 'John Plumber' }),
			})

			const requests = await fetch_resident_requests('resident_456')

			expect(getDocs).toHaveBeenCalledTimes(3)
			expect(getDoc).toHaveBeenCalledTimes(1)

			expect(requests).toHaveLength(2)

			expect(requests[0].id).toBe('req_1')
			expect(requests[0].worker_uid).toBe('worker_123')
			expect(requests[0].worker_name).toBe('John Plumber')

			expect(requests[1].id).toBe('req_2')
			expect(requests[1].worker_uid).toBeNull()
			expect(requests[1].worker_name).toBeNull()
		})

		test('falls back to Worker if the worker document exists without a name', async () => {
			getDocs
				.mockResolvedValueOnce({
					empty: false,
					docs: [{ id: 'req_1', data: () => ({}) }],
				})
				.mockResolvedValueOnce({
					empty: false,
					docs: [{ data: () => ({ worker_uid: 'worker_123' }) }],
				})

			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({}),
			})

			const requests = await fetch_resident_requests('resident_456')

			expect(requests[0].worker_uid).toBe('worker_123')
			expect(requests[0].worker_name).toBe('Worker')
		})

		test('falls back to Worker if fetching the worker document throws an error', async () => {
			getDocs
				.mockResolvedValueOnce({
					empty: false,
					docs: [{ id: 'req_1', data: () => ({}) }],
				})
				.mockResolvedValueOnce({
					empty: false,
					docs: [{ data: () => ({ worker_uid: 'error_worker' }) }],
				})

			getDoc.mockRejectedValueOnce(new Error('Network failure'))

			const requests = await fetch_resident_requests('resident_456')

			expect(requests[0].worker_uid).toBe('error_worker')
			expect(requests[0].worker_name).toBe('Worker')
		})

		test('deduplicates worker fetches and only fetches a worker uid once', async () => {
			getDocs
				.mockResolvedValueOnce({
					empty: false,
					docs: [
						{ id: 'req_1', data: () => ({}) },
						{ id: 'req_2', data: () => ({}) },
					],
				})
				.mockResolvedValueOnce({
					empty: false,
					docs: [{ data: () => ({ worker_uid: 'worker_1' }) }],
				})
				.mockResolvedValueOnce({
					empty: false,
					docs: [{ data: () => ({ worker_uid: 'worker_1' }) }],
				})

			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({ name: 'Alice' }),
			})

			const requests = await fetch_resident_requests('resident_456')

			expect(getDocs).toHaveBeenCalledTimes(3)
			expect(getDoc).toHaveBeenCalledTimes(1)
			expect(requests[0].worker_name).toBe('Alice')
			expect(requests[1].worker_name).toBe('Alice')
		})

		test('returns an empty array when the resident has no requests', async () => {
			getDocs.mockResolvedValueOnce({
				empty: true,
				docs: [],
			})

			const requests = await fetch_resident_requests('resident_456')

			expect(requests).toEqual([])
			expect(getDocs).toHaveBeenCalledTimes(1)
			expect(getDoc).not.toHaveBeenCalled()
		})

		test('does not fetch a worker profile when assignment has no worker uid', async () => {
			getDocs
				.mockResolvedValueOnce({
					empty: false,
					docs: [
						{ id: 'req_1', data: () => ({ status: 'ASSIGNED' }) },
					],
				})
				.mockResolvedValueOnce({
					empty: false,
					docs: [{ data: () => ({ worker_uid: null }) }],
				})

			const requests = await fetch_resident_requests('resident_456')

			expect(getDocs).toHaveBeenCalledTimes(2)
			expect(getDoc).not.toHaveBeenCalled()
			expect(requests[0].worker_uid).toBeNull()
			expect(requests[0].worker_name).toBeNull()
		})

		test('queries resident requests using service_requests collection and created_at ordering', async () => {
			getDocs.mockResolvedValueOnce({
				empty: true,
				docs: [],
			})

			await fetch_resident_requests('resident_456')

			expect(collection).toHaveBeenCalledWith(
				expect.anything(),
				'service_requests'
			)
			expect(where).toHaveBeenCalledWith('user_uid', '==', 'resident_456')
			expect(orderBy).toHaveBeenCalledWith('created_at', 'desc')
			expect(query).toHaveBeenCalled()
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

			expect(collection).toHaveBeenCalledWith(
				expect.anything(),
				'messages'
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

	describe('cancel_request', () => {
		test('cancels an owner request when status is SUBMITTED and no worker is assigned', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					user_uid: 'resident_123',
					status: 'SUBMITTED',
					worker_uid: null,
				}),
			})

			updateDoc.mockResolvedValueOnce()

			const result = await cancel_request('req_123', 'resident_123')

			expect(doc).toHaveBeenCalledWith(
				expect.anything(),
				'service_requests',
				'req_123'
			)
			expect(updateDoc).toHaveBeenCalledWith(
				'service_requests/req_123',
				expect.objectContaining({
					status: 'CANCELLED',
					updated_at: expect.any(String),
				})
			)
			expect(result).toBe(true)
		})

		test('cancels an owner request when status is PENDING and no worker is assigned', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					user_uid: 'resident_123',
					status: 'PENDING',
					worker_uid: null,
				}),
			})

			updateDoc.mockResolvedValueOnce()

			const result = await cancel_request('req_456', 'resident_123')

			expect(updateDoc).toHaveBeenCalledWith(
				'service_requests/req_456',
				expect.objectContaining({
					status: 'CANCELLED',
					updated_at: expect.any(String),
				})
			)
			expect(result).toBe(true)
		})

		test('throws when the request does not exist', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => false,
			})

			await expect(
				cancel_request('missing_req', 'resident_123')
			).rejects.toThrow('Request not found.')

			expect(updateDoc).not.toHaveBeenCalled()
		})

		test('throws when the request belongs to another resident', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					user_uid: 'another_resident',
					status: 'SUBMITTED',
					worker_uid: null,
				}),
			})

			await expect(
				cancel_request('req_123', 'resident_123')
			).rejects.toThrow('Unauthorized.')

			expect(updateDoc).not.toHaveBeenCalled()
		})

		test('throws when the request already has a worker assigned', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					user_uid: 'resident_123',
					status: 'SUBMITTED',
					worker_uid: 'worker_123',
				}),
			})

			await expect(
				cancel_request('req_123', 'resident_123')
			).rejects.toThrow('Cannot cancel an assigned request.')

			expect(updateDoc).not.toHaveBeenCalled()
		})

		test('throws when the request status is not cancellable', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					user_uid: 'resident_123',
					status: 'RESOLVED',
					worker_uid: null,
				}),
			})

			await expect(
				cancel_request('req_123', 'resident_123')
			).rejects.toThrow('Request cannot be cancelled at this stage.')

			expect(updateDoc).not.toHaveBeenCalled()
		})
	})
})
