/* global jest, describe, beforeEach, test, expect */
import {
	verify_admin,
	build_category_stats,
	fetch_report_data,
	compute_summary,
	format_resolution_time,
	get_resolution_class,
} from '../backend/category_report_service.js' // Adjust this path if necessary
import { getDocs, getDoc, collection, doc } from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	getDocs: jest.fn(),
	doc: jest.fn(),
	getDoc: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

// Mock the constants so our tests run predictably regardless of actual category lists
jest.mock('../constants.js', () => ({
	REQUEST_CATEGORIES: ['Water', 'Roads', 'Electricity'],
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

// Helper to create mock Firestore Timestamps with a specific time difference
const mockTs = (hoursOffset = 0) => ({
	toMillis: () => 1600000000000 + hoursOffset * 60 * 60 * 1000,
})

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('Category Report Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		// Restore mock implementations here to survive CRA's resetMocks: true
		collection.mockImplementation((db, coll) => coll)
		doc.mockImplementation((db, coll, id) => `${coll}/${id}`)
	})

	describe('verify_admin', () => {
		test('returns true if user exists and role is admin', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ role: 'admin' }),
			})

			const is_admin = await verify_admin('admin_123')

			expect(doc).toHaveBeenCalledWith(
				expect.anything(),
				'users',
				'admin_123'
			)
			expect(is_admin).toBe(true)
		})

		test('returns false if user exists but role is not admin', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ role: 'resident' }),
			})

			const is_admin = await verify_admin('user_123')
			expect(is_admin).toBe(false)
		})

		test('returns false if user document does not exist', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => false,
				data: () => ({}),
			})

			const is_admin = await verify_admin('ghost_123')
			expect(is_admin).toBe(false)
		})
	})

	describe('build_category_stats', () => {
		test('calculates totals, pending, in-progress, resolved, and avg hours correctly', () => {
			const mockRequests = [
				{ category: 'Water', status: 'pending' },
				{ category: 'Water', status: 'acknowledged' }, // In progress
				{ category: 'Water', status: 'in_progress' }, // In progress
				{
					category: 'Water',
					status: 'resolved',
					created_at: mockTs(0),
					updated_at: mockTs(5), // Took 5 hours
				},
				{
					category: 'Water',
					status: 'resolved',
					created_at: mockTs(0),
					updated_at: mockTs(15), // Took 15 hours
				},
				{ category: 'Roads', status: 'pending' },
				// Electricity has 0 requests
			]

			const stats = build_category_stats(mockRequests)

			expect(stats).toHaveLength(3) // Based on mocked REQUEST_CATEGORIES

			// Check Water stats
			const waterStats = stats.find((s) => s.category === 'Water')
			expect(waterStats.total).toBe(5)
			expect(waterStats.pending).toBe(1)
			expect(waterStats.in_progress).toBe(2)
			expect(waterStats.resolved).toBe(2)
			expect(waterStats.avg_hours).toBe(10) // (5 + 15) / 2

			// Check Roads stats
			const roadStats = stats.find((s) => s.category === 'Roads')
			expect(roadStats.total).toBe(1)
			expect(roadStats.pending).toBe(1)
			expect(roadStats.avg_hours).toBeNull() // No resolved requests

			// Check Empty category
			const elecStats = stats.find((s) => s.category === 'Electricity')
			expect(elecStats.total).toBe(0)
		})
	})

	describe('fetch_report_data', () => {
		test('fetches all requests and returns calculated stats and totals', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: '1',
						data: () => ({ category: 'Water', status: 'pending' }),
					},
					{
						id: '2',
						data: () => ({
							category: 'Roads',
							status: 'resolved',
							created_at: mockTs(0),
							updated_at: mockTs(2),
						}),
					},
				],
			})

			const report = await fetch_report_data()

			expect(collection).toHaveBeenCalledWith(
				expect.anything(),
				'service_requests'
			)
			expect(report.total_requests).toBe(2)
			expect(report.stats).toHaveLength(3)

			const waterStat = report.stats.find((s) => s.category === 'Water')
			expect(waterStat.pending).toBe(1)
		})
	})

	describe('compute_summary', () => {
		test('aggregates totals, overall average, and finds worst backlog', () => {
			const mockStats = [
				{ category: 'Water', resolved: 10, pending: 5, avg_hours: 12 },
				{ category: 'Roads', resolved: 20, pending: 15, avg_hours: 24 }, // Worst backlog
				{
					category: 'Electricity',
					resolved: 0,
					pending: 0,
					avg_hours: null,
				}, // Ignored in avg
			]

			const summary = compute_summary(mockStats)

			expect(summary.total_resolved).toBe(30)
			expect(summary.total_pending).toBe(20)
			expect(summary.overall_avg_hours).toBe(18) // (12 + 24) / 2
			expect(summary.worst_backlog.category).toBe('Roads')
			expect(summary.worst_backlog.pending).toBe(15)
		})

		test('handles empty stats / zero backlogs cleanly', () => {
			const mockStats = [
				{ category: 'Water', resolved: 0, pending: 0, avg_hours: null },
			]

			const summary = compute_summary(mockStats)

			expect(summary.total_resolved).toBe(0)
			expect(summary.total_pending).toBe(0)
			expect(summary.overall_avg_hours).toBeNull()
			expect(summary.worst_backlog).toBeNull()
		})
	})

	describe('format_resolution_time', () => {
		test('returns null for null input', () => {
			expect(format_resolution_time(null)).toBeNull()
		})

		test('formats minutes if less than 1 hour', () => {
			expect(format_resolution_time(0.5)).toBe('30m')
			expect(format_resolution_time(0.25)).toBe('15m')
		})

		test('formats hours if less than 24 hours', () => {
			expect(format_resolution_time(1)).toBe('1h')
			expect(format_resolution_time(23.4)).toBe('23h')
		})

		test('formats days with 1 decimal if 24 hours or more', () => {
			expect(format_resolution_time(24)).toBe('1.0d')
			expect(format_resolution_time(36)).toBe('1.5d')
			expect(format_resolution_time(50)).toBe('2.1d')
		})
	})

	describe('get_resolution_class', () => {
		test('returns empty string for null input', () => {
			expect(get_resolution_class(null)).toBe('')
		})

		test('returns resolution_fast for <= 24 hours', () => {
			expect(get_resolution_class(0.5)).toBe('resolution_fast')
			expect(get_resolution_class(24)).toBe('resolution_fast')
		})

		test('returns resolution_medium for <= 72 hours', () => {
			expect(get_resolution_class(24.1)).toBe('resolution_medium')
			expect(get_resolution_class(72)).toBe('resolution_medium')
		})

		test('returns resolution_slow for > 72 hours', () => {
			expect(get_resolution_class(72.1)).toBe('resolution_slow')
			expect(get_resolution_class(100)).toBe('resolution_slow')
		})
	})
})
