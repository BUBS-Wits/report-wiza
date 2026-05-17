import {
	collection,
	query,
	where,
	getDocs,
	Timestamp,
} from 'firebase/firestore'
import { generate_custom_report } from '../backend/admin_custom_report_service.js'

// ── Mock Firebase ───────────────────────────────────────────────────
jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	getDocs: jest.fn(),
	Timestamp: {
		fromDate: jest.fn((date) => `mock_timestamp_${date.getTime()}`),
	},
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

// Helper to simulate Firestore timestamps
const mock_timestamp = (ms) => ({
	toMillis: () => ms,
})

describe('Admin Custom Report Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	const base_mock_data = [
		{
			category: 'water',
			status: 'resolved', // <-- changed to lowercase
			priority: 'High',
			ward_info: { ward_name: 'Ward 15' },
			created_at: mock_timestamp(1000000000000),
			resolved_at: mock_timestamp(1000000000000 + 2 * 60 * 60 * 1000),
		},
		{
			category: 'water',
			status: 'in_progress', // <-- changed to lowercase
			priority: 'Medium',
			ward_info: { ward_name: 'Ward 15' },
			created_at: mock_timestamp(1000000000000),
		},
		{
			category: 'road',
			status: 'resolved', // <-- changed to lowercase
			priority: 'High',
			ward_info: { ward_name: 'Ward 10' },
			created_at: mock_timestamp(1000000000000),
			resolved_at: mock_timestamp(1000000000000 + 4 * 60 * 60 * 1000),
		},
	]

	const setup_mock_docs = (data_array) => {
		getDocs.mockResolvedValueOnce(
			data_array.map((data) => ({ data: () => data }))
		)
	}

	test('1. returns global totals when no dimensions are passed', async () => {
		setup_mock_docs(base_mock_data)

		const start = new Date('2026-01-01')
		const end = new Date('2026-01-31')

		const result = await generate_custom_report(start, end, [], {})

		expect(collection).toHaveBeenCalledWith({}, 'service_requests')
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({
			group_id: 'Global Filtered Range',
			count: 3,
			resolved_count: 2,
			resolution_rate: 67, // (2/3) * 100
			avg_resolution_hours: 3.0, // (2h + 4h) / 2
		})
	})

	test('2. groups correctly by a single dimension (category)', async () => {
		setup_mock_docs(base_mock_data)

		const result = await generate_custom_report(
			new Date(),
			new Date(),
			['category'],
			{}
		)

		// Should return 2 groups: water (count 2), road (count 1), sorted by count descending
		expect(result).toHaveLength(2)
		expect(result[0].group_id).toBe('water')
		expect(result[0].count).toBe(2)
		expect(result[0].resolved_count).toBe(1)

		expect(result[1].group_id).toBe('road')
		expect(result[1].count).toBe(1)
	})

	test('3. handles nested dimensions (ward_info.ward_name) and applies secondary filters', async () => {
		setup_mock_docs(base_mock_data)

		// Filter ONLY for 'High' priority, grouping by Ward
		const filters = { priority: 'High' }
		const result = await generate_custom_report(
			new Date(),
			new Date(),
			['ward_info.ward_name'],
			filters
		)

		// The "Medium" priority water request should be excluded
		// Remaining: High/Water/Ward 15 and High/Road/Ward 10
		expect(result).toHaveLength(2)

		const ward_15 = result.find((r) => r.ward_name === 'Ward 15')
		expect(ward_15.count).toBe(1)
		expect(ward_15.resolution_rate).toBe(100)
	})

	test('4. handles errors gracefully', async () => {
		const consoleSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		getDocs.mockRejectedValueOnce(new Error('Firestore failure'))

		await expect(
			generate_custom_report(new Date(), new Date())
		).rejects.toThrow('Firestore failure')

		consoleSpy.mockRestore()
	})
})
