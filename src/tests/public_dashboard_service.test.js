import { fetchPublicDashboardData } from '../backend/public_dashboard_service.js'
import { getDocs } from 'firebase/firestore'
import { parseLocation } from '../utils/parse_location.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	orderBy: jest.fn(),
	limit: jest.fn(),
	getDocs: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

jest.mock('../utils/parse_location.js', () => ({
	parseLocation: jest.fn(),
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers & Fixtures
───────────────────────────────────────────────────────────────────────────── */

const createMockDoc = (id, data) => ({
	id,
	data: () => data,
})

describe('Public Dashboard Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		// Default behavior: valid location for all requests
		parseLocation.mockReturnValue({
			latitude: -26.2041,
			longitude: 28.0473,
		})
	})

	test('returns empty arrays and zeroed stats when no requests exist', async () => {
		getDocs.mockResolvedValueOnce([]) // Empty snapshot iterable

		const result = await fetchPublicDashboardData()

		expect(result).toEqual({
			active: [],
			resolved: [],
			stats: {
				open_count: 0,
				resolved_count: 0,
				wards_affected: 0,
			},
		})
	})

	test('skips requests with unparseable locations', async () => {
		parseLocation
			.mockReturnValueOnce(null) // First request fails location parsing
			.mockReturnValueOnce({ latitude: 10, longitude: 20 }) // Second succeeds

		const mockSnapshot = [
			createMockDoc('req_bad_loc', { status: 'SUBMITTED', sa_ward: '1' }),
			createMockDoc('req_good_loc', {
				status: 'SUBMITTED',
				sa_ward: '1',
			}),
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()

		expect(result.active.length).toBe(1)
		expect(result.active[0].id).toBe('req_good_loc')
		expect(result.stats.open_count).toBe(1)
	})

	test('applies default values for missing fields during normalization', async () => {
		const mockSnapshot = [
			createMockDoc('req_minimal', {
				// Only providing minimal data
				status: 'UNASSIGNED',
			}),
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()
		const request = result.active[0]

		expect(request.category).toBe('Unknown')
		expect(request.ward).toBe('Ward Unknown')
		expect(request.sa_ward).toBeUndefined() // Inherits undefined from raw data
		expect(request.municipality).toBe('Unknown Municipality')
		expect(request.description).toBe('')
		expect(request.like_count).toBe(0)
		expect(request.latitude).toBe(-26.2041)
	})

	test('separates active and resolved statuses correctly and ignores unknown statuses', async () => {
		const mockSnapshot = [
			createMockDoc('req_1', { status: 'SUBMITTED', sa_ward: '10' }),
			createMockDoc('req_2', { status: 'UNASSIGNED', sa_ward: '11' }),
			createMockDoc('req_3', { status: 'ASSIGNED', sa_ward: '10' }), // Duplicate ward
			createMockDoc('req_4', { status: 'IN_PROGRESS', sa_ward: '12' }),
			createMockDoc('req_5', { status: 'RESOLVED', sa_ward: '13' }),
			createMockDoc('req_6', { status: 'CLOSED', sa_ward: '14' }), // Should be ignored by active/resolved lists
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()

		// 4 active statuses defined in ACTIVE_STATUSES
		expect(result.active.length).toBe(4)
		expect(result.active.map((r) => r.id)).toEqual([
			'req_1',
			'req_2',
			'req_3',
			'req_4',
		])

		// 1 resolved
		expect(result.resolved.length).toBe(1)
		expect(result.resolved[0].id).toBe('req_5')

		// Stats verification
		expect(result.stats.open_count).toBe(4)
		expect(result.stats.resolved_count).toBe(1)

		// Wards 10, 11, 12, 13, 14 were seen (even if status is CLOSED, normalization still ran and saw the ward)
		expect(result.stats.wards_affected).toBe(5)
	})

	test('strictly enforces the 20-item limit for resolved requests', async () => {
		// Generate 25 resolved requests
		const mockSnapshot = Array.from({ length: 25 }, (_, i) =>
			createMockDoc(`req_${i}`, { status: 'RESOLVED', sa_ward: '5' })
		)

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()

		// Should cap exactly at 20
		expect(result.resolved.length).toBe(20)
		expect(result.stats.resolved_count).toBe(20)

		// Ensure no active requests accidentally leaked
		expect(result.active.length).toBe(0)
	})

	test('calculates unique wards_affected accurately', async () => {
		const mockSnapshot = [
			createMockDoc('req_1', { status: 'SUBMITTED', sa_ward: '99' }),
			createMockDoc('req_2', { status: 'SUBMITTED', sa_ward: '99' }),
			createMockDoc('req_3', { status: 'RESOLVED', sa_ward: '100' }),
			createMockDoc('req_4', { status: 'RESOLVED', sa_ward: '100' }),
			createMockDoc('req_5', { status: 'IN_PROGRESS', sa_ward: '101' }),
			// Test how it handles undefined/null wards during String() coercion
			createMockDoc('req_6', { status: 'SUBMITTED' }),
			createMockDoc('req_7', { status: 'SUBMITTED' }),
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()

		// Wards seen: '99', '100', '101', and 'undefined'
		expect(result.stats.wards_affected).toBe(4)
	})
})
