/* global jest, describe, beforeEach, afterEach, test, expect */
import { fetch_rated_requests } from '../backend/admin_firebase.js'
import { collection, getDocs, query, where } from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	getDocs: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	doc: jest.fn(),
	setDoc: jest.fn(),
	updateDoc: jest.fn(),
	serverTimestamp: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('fetch_rated_requests', () => {
	let consoleErrorSpy

	beforeEach(() => {
		jest.clearAllMocks()
		collection.mockImplementation((db, coll) => coll)
		query.mockImplementation((coll, ...conditions) => `query-${coll}`)
		where.mockImplementation((field, op, val) => `${field}${op}${val}`)
		consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})
	})

	afterEach(() => {
		consoleErrorSpy.mockRestore()
	})

	describe('Given service_requests exist with ratings', () => {
		describe('When all requests have a rating and a worker_uid', () => {
			it('Then it should return only requests with a rating', async () => {
				const mock_docs = [
					{
						id: 'req_001',
						data: () => ({
							category: 'water',
							rating: 4,
							status: 'resolved',
							worker_uid: 'worker_123',
						}),
					},
					{
						id: 'req_002',
						data: () => ({
							category: 'electricity',
							rating: 3,
							status: 'closed',
							worker_uid: 'worker_456',
						}),
					},
				]
				getDocs.mockResolvedValue({ docs: mock_docs })

				const result = await fetch_rated_requests()

				expect(result).toHaveLength(2)
				expect(result[0]).toMatchObject({
					id: 'req_001',
					category: 'water',
					rating: 4,
				})
			})
		})

		describe('When some requests do not have a rating', () => {
			it('Then it should filter out requests without a rating', async () => {
				const mock_docs = [
					{
						id: 'req_001',
						data: () => ({
							category: 'water',
							rating: 4,
							status: 'resolved',
						}),
					},
					{
						id: 'req_002',
						data: () => ({
							category: 'potholes',
							status: 'resolved',
							// no rating field
						}),
					},
				]
				getDocs.mockResolvedValue({ docs: mock_docs })

				const result = await fetch_rated_requests()

				expect(result).toHaveLength(1)
				expect(result[0].id).toBe('req_001')
			})
		})

		describe('When a request has rating set to null', () => {
			it('Then it should filter out that request', async () => {
				const mock_docs = [
					{
						id: 'req_001',
						data: () => ({
							category: 'water',
							rating: null,
							status: 'resolved',
						}),
					},
				]
				getDocs.mockResolvedValue({ docs: mock_docs })

				const result = await fetch_rated_requests()

				expect(result).toHaveLength(0)
			})
		})

		describe('When there are no requests at all', () => {
			it('Then it should return an empty array', async () => {
				getDocs.mockResolvedValue({ docs: [] })

				const result = await fetch_rated_requests()

				expect(result).toEqual([])
			})
		})
	})

	describe('Given Firestore throws an error', () => {
		describe('When getDocs fails', () => {
			it('Then it should throw a user-friendly error', async () => {
				getDocs.mockRejectedValue(new Error('Network error'))

				await expect(fetch_rated_requests()).rejects.toThrow(
					'Could not load satisfaction data. Try again later.'
				)
				expect(consoleErrorSpy).toHaveBeenCalled()
			})
		})
	})
})
