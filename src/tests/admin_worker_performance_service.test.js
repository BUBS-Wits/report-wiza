import { collection, query, where, getDocs } from 'firebase/firestore'
import {
	fetch_all_workers,
	fetch_worker_performance,
	fetch_aggregate_worker_performance,
} from '../backend/admin_worker_performance_service.js'

// ── Mock Firebase ───────────────────────────────────────────────────

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	getDocs: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

// Helper to create mock Firestore timestamps
const mock_timestamp = (ms) => ({
	toMillis: () => ms,
})

describe('Admin Worker Performance Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('fetch_all_workers', () => {
		test('1. fetches and maps worker documents correctly', async () => {
			const mock_snapshot = [
				{
					id: 'worker_1',
					data: () => ({
						email: 'w1@wardwatch.co.za',
						display_name: 'John',
					}),
				},
				{
					id: 'worker_2',
					data: () => ({
						email: 'w2@wardwatch.co.za',
						display_name: 'Jane',
					}),
				},
			]

			getDocs.mockResolvedValueOnce(mock_snapshot)

			const result = await fetch_all_workers()

			expect(collection).toHaveBeenCalledWith({}, 'users')
			expect(where).toHaveBeenCalledWith('role', '==', 'worker')
			expect(result).toHaveLength(2)
			expect(result[0]).toEqual({
				uid: 'worker_1',
				email: 'w1@wardwatch.co.za',
				display_name: 'John',
			})
		})

		test('2. throws an error if the database query fails', async () => {
			// Spy on console.error to keep the test terminal clean
			const consoleSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			getDocs.mockRejectedValueOnce(new Error('Firestore offline'))
			await expect(fetch_all_workers()).rejects.toThrow(
				'Firestore offline'
			)

			consoleSpy.mockRestore()
		})
	})

	describe('fetch_worker_performance', () => {
		test('3. calculates perfect metrics for a worker with active and resolved tasks', async () => {
			const mock_requests = [
				{
					data: () => ({
						status: 'RESOLVED',
						created_at: mock_timestamp(1000000000000),
						resolved_at: mock_timestamp(
							1000000000000 + 2 * 60 * 60 * 1000
						),
					}),
				},
				{
					data: () => ({
						status: 'CLOSED',
						created_at: mock_timestamp(1000000000000),
						resolved_at: mock_timestamp(
							1000000000000 + 4 * 60 * 60 * 1000
						),
					}),
				},
				{
					data: () => ({
						status: 'IN_PROGRESS',
						created_at: mock_timestamp(1000000000000),
					}),
				},
			]

			getDocs.mockResolvedValueOnce(mock_requests)

			const result = await fetch_worker_performance('worker_123')

			expect(where).toHaveBeenCalledWith(
				'assigned_worker_uid',
				'==',
				'worker_123'
			)
			expect(result).toEqual({
				worker_uid: 'worker_123',
				total_assigned: 3,
				total_resolved: 2,
				active_tasks: 1,
				avg_resolution_hours: 3.0,
				completion_rate: 67,
			})
		})

		test('4. handles workers with zero assigned tasks', async () => {
			getDocs.mockResolvedValueOnce([])

			const result = await fetch_worker_performance('worker_ghost')

			expect(result).toEqual({
				worker_uid: 'worker_ghost',
				total_assigned: 0,
				total_resolved: 0,
				active_tasks: 0,
				avg_resolution_hours: 0,
				completion_rate: 0,
			})
		})
	})

	describe('fetch_aggregate_worker_performance', () => {
		test('5. aggregates and sorts all workers by completion rate descending', async () => {
			const mock_users_snapshot = [
				{ id: 'w_slacker', data: () => ({ display_name: 'Slacker' }) },
				{ id: 'w_star', data: () => ({ display_name: 'Star' }) },
			]

			const mock_slacker_requests = [
				{ data: () => ({ status: 'IN_PROGRESS' }) },
			]
			const mock_star_requests = [
				{ data: () => ({ status: 'RESOLVED' }) },
			]

			getDocs
				.mockResolvedValueOnce(mock_users_snapshot)
				.mockResolvedValueOnce(mock_slacker_requests)
				.mockResolvedValueOnce(mock_star_requests)

			const results = await fetch_aggregate_worker_performance()

			expect(results).toHaveLength(2)
			expect(results[0].display_name).toBe('Star')
			expect(results[0].completion_rate).toBe(100)

			expect(results[1].display_name).toBe('Slacker')
			expect(results[1].completion_rate).toBe(0)
		})
	})
})
