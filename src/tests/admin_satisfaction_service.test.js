/* global jest, describe, beforeEach, afterEach, test, expect */
import {
	fetch_rated_requests,
	fetch_assignments,
} from '../backend/admin_firebase.js'
import { collection, getDocs } from 'firebase/firestore'

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

describe('Satisfaction Report Service', () => {
	let consoleErrorSpy

	beforeEach(() => {
		jest.clearAllMocks()
		collection.mockImplementation((db, coll) => coll)
		consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})
	})

	afterEach(() => {
		consoleErrorSpy.mockRestore()
	})

	// -------------------------------------------------------------------------
	// fetch_rated_requests
	// -------------------------------------------------------------------------
	describe('fetch_rated_requests', () => {
		describe('When requests with ratings exist', () => {
			it('Then it should return only requests that have a rating', async () => {
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
							// no rating
						}),
					},
				]
				getDocs.mockResolvedValue({ docs: mock_docs })

				const result = await fetch_rated_requests()

				expect(result).toHaveLength(1)
				expect(result[0].id).toBe('req_001')
				expect(result[0].rating).toBe(4)
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

		describe('When there are no requests', () => {
			it('Then it should return an empty array', async () => {
				getDocs.mockResolvedValue({ docs: [] })

				const result = await fetch_rated_requests()

				expect(result).toEqual([])
			})
		})

		describe('When Firestore throws an error', () => {
			it('Then it should throw a user-friendly error', async () => {
				getDocs.mockRejectedValue(new Error('Network error'))

				await expect(fetch_rated_requests()).rejects.toThrow(
					'Could not load satisfaction data. Try again later.'
				)
				expect(consoleErrorSpy).toHaveBeenCalled()
			})
		})
	})

	// -------------------------------------------------------------------------
	// fetch_assignments
	// -------------------------------------------------------------------------
	describe('fetch_assignments', () => {
		describe('When assignments exist', () => {
			it('Then it should return all assignment documents', async () => {
				const mock_docs = [
					{
						id: 'asgn_001',
						data: () => ({
							request_uid: 'req_001',
							worker_uid: 'worker_123',
						}),
					},
					{
						id: 'asgn_002',
						data: () => ({
							request_uid: 'req_002',
							worker_uid: 'worker_456',
						}),
					},
				]
				getDocs.mockResolvedValue({ docs: mock_docs })

				const result = await fetch_assignments()

				expect(result).toHaveLength(2)
				expect(result[0]).toMatchObject({
					id: 'asgn_001',
					request_uid: 'req_001',
					worker_uid: 'worker_123',
				})
			})
		})

		describe('When there are no assignments', () => {
			it('Then it should return an empty array', async () => {
				getDocs.mockResolvedValue({ docs: [] })

				const result = await fetch_assignments()

				expect(result).toEqual([])
			})
		})

		describe('When Firestore throws an error', () => {
			it('Then it should throw a user-friendly error', async () => {
				getDocs.mockRejectedValue(new Error('Firestore error'))

				await expect(fetch_assignments()).rejects.toThrow(
					'Could not load assignments. Try again later.'
				)
				expect(consoleErrorSpy).toHaveBeenCalled()
			})
		})
	})
})
