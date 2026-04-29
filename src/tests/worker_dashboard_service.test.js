import {
	compute_worker_stats,
	fetch_worker_dashboard_data,
} from '../backend/worker_dashboard_service.js'
import { STATUS, STATUS_DISPLAY } from '../constants.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	getDocs: jest.fn(),
	doc: jest.fn(),
	getDoc: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

import { getDoc, getDocs, where } from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers & Fixtures
───────────────────────────────────────────────────────────────────────────── */

// Helper to create mock Firestore timestamps
const mockTimestamp = (ms) => ({
	toMillis: () => ms,
})

const ONE_DAY_MS = 1000 * 60 * 60 * 24

describe('Worker Dashboard Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	/* ── compute_worker_stats ────────────────────────────────────────────── */

	describe('compute_worker_stats', () => {
		test('returns zeroed stats for an empty array', () => {
			const stats = compute_worker_stats([])
			expect(stats).toEqual({
				total: 0,
				resolved: 0,
				pending: 0,
				acknowledged: 0,
				closed: 0,
				avg_resolution_days: 0,
			})
		})

		test('correctly tallies request statuses', () => {
			const requests = [
				{ status: STATUS.ASSIGNED },
				{ status: STATUS.ASSIGNED },
				{ status: STATUS.IN_PROGRESS },
				{ status: STATUS.RESOLVED },
				{ status: STATUS.CLOSED },
				{ status: STATUS.CLOSED },
			]

			const stats = compute_worker_stats(requests)
			expect(stats.total).toBe(6)
			expect(stats.pending).toBe(2)
			expect(stats.acknowledged).toBe(1)
			expect(stats.resolved).toBe(1)
			expect(stats.closed).toBe(2)
		})

		test('calculates average resolution days correctly', () => {
			const now = Date.now()
			const requests = [
				{
					status: STATUS.RESOLVED,
					assignedAt: mockTimestamp(now),
					resolvedAt: mockTimestamp(now + ONE_DAY_MS * 2), // 2 days
				},
				{
					status: STATUS.RESOLVED,
					assignedAt: mockTimestamp(now),
					resolvedAt: mockTimestamp(now + ONE_DAY_MS * 4), // 4 days
				},
				{
					status: STATUS.ASSIGNED, // Should be ignored in avg calculation
					assignedAt: mockTimestamp(now),
				},
			]

			const stats = compute_worker_stats(requests)
			// (2 days + 4 days) / 2 = 3.0 days
			expect(stats.avg_resolution_days).toBe(3.0)
		})

		test('falls back to updatedAt if resolvedAt is missing', () => {
			const now = Date.now()
			const requests = [
				{
					status: STATUS.RESOLVED,
					assignedAt: mockTimestamp(now),
					updatedAt: mockTimestamp(now + ONE_DAY_MS * 1.5), // 1.5 days
				},
			]

			const stats = compute_worker_stats(requests)
			expect(stats.avg_resolution_days).toBe(1.5)
		})
	})

	/* ── fetch_worker_dashboard_data ─────────────────────────────────────── */

	describe('fetch_worker_dashboard_data', () => {
		const MOCK_UID = 'worker_123'

		test('throws an error if user does not exist', async () => {
			getDoc.mockResolvedValueOnce({ exists: () => false })

			await expect(fetch_worker_dashboard_data(MOCK_UID)).rejects.toThrow(
				'Not authenticated.'
			)
		})

		test('throws an error if user is not a worker', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ role: 'resident' }),
			})

			await expect(fetch_worker_dashboard_data(MOCK_UID)).rejects.toThrow(
				'Access denied. Worker role required.'
			)
		})

		test('returns dashboard data with empty requests if no assignments exist', async () => {
			// Mock verify_worker_and_get_profile
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					role: 'worker',
					name: 'Bob Builder',
					email: 'bob@test.com',
				}),
			})

			// Mock fetch_assigned_requests (returns empty)
			getDocs.mockResolvedValueOnce({ empty: true })

			const data = await fetch_worker_dashboard_data(MOCK_UID)

			expect(data.worker.name).toBe('Bob Builder')
			expect(data.requests).toEqual([])
			expect(data.stats.total).toBe(0)
		})

		test('fetches, normalises, and sorts assigned requests successfully', async () => {
			// 1. Mock worker profile
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ role: 'worker', name: 'John Doe' }),
			})

			// 2. Mock assignments collection response
			getDocs.mockResolvedValueOnce({
				empty: false,
				docs: [
					{ data: () => ({ request_uid: 'req_1' }) },
					{ data: () => ({ request_uid: 'req_2' }) },
				],
			})

			// 3. Mock service_requests chunk fetch response
			const mockUpdatedAt1 = mockTimestamp(1000)
			const mockUpdatedAt2 = mockTimestamp(5000) // Newer

			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'req_1',
						data: () => ({
							status: STATUS.ASSIGNED,
							category: 'Pothole',
							updated_at: mockUpdatedAt1,
							location: { ward_name: 'Ward 10' },
						}),
					},
					{
						id: 'req_2',
						data: () => ({
							status: STATUS.IN_PROGRESS,
							category: 'Water Leak',
							updated_at: mockUpdatedAt2,
							sa_ward: '15',
						}),
					},
				],
			})

			const data = await fetch_worker_dashboard_data(MOCK_UID)

			// Verify normalisation and fallback logic
			expect(data.requests.length).toBe(2)

			// Should be sorted by newest updated first (req_2 then req_1)
			expect(data.requests[0].id).toBe('req_2')
			expect(data.requests[0].status).toBe(STATUS.IN_PROGRESS) // IN_PROGRESS -> Acknowledged
			expect(data.requests[0].ward).toBe('Ward 15') // Fallback to sa_ward

			expect(data.requests[1].id).toBe('req_1')
			expect(data.requests[1].status).toBe(STATUS.ASSIGNED) // OPEN -> Pending
			expect(data.requests[1].ward).toBe('Ward 10')

			// Verify stats were computed
			expect(data.stats.total).toBe(2)
			expect(data.stats.pending).toBe(1)
			expect(data.stats.acknowledged).toBe(1)
		})

		test('handles chunking correctly for more than 30 assignments', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ role: 'worker' }),
			})

			// Generate 35 mock assignments
			const mockAssignments = Array.from({ length: 35 }, (_, i) => ({
				data: () => ({ request_uid: `req_${i}` }),
			}))

			// Mock assignments collection response
			getDocs.mockResolvedValueOnce({
				empty: false,
				docs: mockAssignments,
			})

			// Mock the two chunk fetches (one for 30, one for 5)
			getDocs
				.mockResolvedValueOnce({ docs: [] }) // Chunk 1 results
				.mockResolvedValueOnce({ docs: [] }) // Chunk 2 results

			await fetch_worker_dashboard_data(MOCK_UID)

			// getDocs should have been called 3 times total:
			// 1 time for assignments, 2 times for service_request chunks
			expect(getDocs).toHaveBeenCalledTimes(3)

			// Verify the 'in' operator was used properly to chunk the queries
			expect(where).toHaveBeenCalledWith(
				'__name__',
				'in',
				expect.any(Array)
			)
		})
	})
})
