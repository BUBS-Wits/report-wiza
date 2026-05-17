import { fetchPublicDashboardData } from '../backend/public_dashboard_service.js'
import {
	collection,
	getDocs,
	query,
	orderBy,
	limit,
} from 'firebase/firestore'
import { parseLocation } from '../utils/parse_location.js'

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

const createMockDoc = (id, data) => ({
	id,
	data: () => data,
})

describe('Public Dashboard Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		collection.mockReturnValue('service_requests_ref')
		orderBy.mockReturnValue('updated_at_order')
		limit.mockReturnValue('limit_200')
		query.mockReturnValue('dashboard_query')

		parseLocation.mockReturnValue({
			latitude: -26.2041,
			longitude: 28.0473,
		})
	})

	test('fetches public dashboard data from the service_requests collection', async () => {
		getDocs.mockResolvedValueOnce([])

		await fetchPublicDashboardData()

		expect(collection).toHaveBeenCalledWith({}, 'service_requests')
		expect(orderBy).toHaveBeenCalledWith('updated_at', 'desc')
		expect(limit).toHaveBeenCalledWith(200)
		expect(query).toHaveBeenCalledWith(
			'service_requests_ref',
			'updated_at_order',
			'limit_200'
		)
		expect(getDocs).toHaveBeenCalledWith('dashboard_query')
	})

	test('returns empty arrays and zeroed stats when no requests exist', async () => {
		getDocs.mockResolvedValueOnce([])

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
			.mockReturnValueOnce(null)
			.mockReturnValueOnce({ latitude: 10, longitude: 20 })

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
		expect(result.active[0].latitude).toBe(10)
		expect(result.active[0].longitude).toBe(20)
		expect(result.stats.open_count).toBe(1)
	})

	test('applies default values for missing fields during normalization', async () => {
		const mockSnapshot = [
			createMockDoc('req_minimal', {
				status: 'UNASSIGNED',
			}),
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()
		const request = result.active[0]

		expect(request.category).toBe('Unknown')
		expect(request.ward).toBe('Ward Unknown')
		expect(request.sa_ward).toBeNull()
		expect(request.municipality).toBe('Unknown Municipality')
		expect(request.sa_m_name).toBe('Unknown Municipality')
		expect(request.description).toBe('')
		expect(request.like_count).toBe(0)
		expect(request.latitude).toBe(-26.2041)
		expect(request.longitude).toBe(28.0473)
	})

	test('normalises live service request fields for the public dashboard', async () => {
		const mockSnapshot = [
			createMockDoc('req_live', {
				category: 'Water Leak',
				description: 'Pipe leaking outside house',
				status: 'SUBMITTED',
				sa_ward: 10,
				sa_m_name: 'Metro A',
				sa_m_code: 'CPT',
				sa_province: 'Western Cape',
				location: 'SRID=4326;POINT(28.0473 -26.2041)',
				like_count: 7,
				created_at: 'created date',
				updated_at: 'updated date',
			}),
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()
		const request = result.active[0]

		expect(request).toEqual({
			id: 'req_live',
			category: 'Water Leak',
			status: 'SUBMITTED',
			ward: 'Ward 10',
			sa_ward: 10,
			municipality: 'Metro A',
			sa_m_name: 'Metro A',
			sa_m_code: 'CPT',
			sa_province: 'Western Cape',
			description: 'Pipe leaking outside house',
			image: null,
			like_count: 7,
			created_at: 'created date',
			updated_at: 'updated date',
			latitude: -26.2041,
			longitude: 28.0473,
		})
	})

	test('separates active and resolved statuses correctly and ignores closed requests', async () => {
		const mockSnapshot = [
			createMockDoc('req_1', { status: 'SUBMITTED', sa_ward: '10' }),
			createMockDoc('req_2', { status: 'UNASSIGNED', sa_ward: '11' }),
			createMockDoc('req_3', { status: 'ASSIGNED', sa_ward: '10' }),
			createMockDoc('req_4', { status: 'IN_PROGRESS', sa_ward: '12' }),
			createMockDoc('req_5', { status: 'RESOLVED', sa_ward: '13' }),
			createMockDoc('req_6', { status: 'CLOSED', sa_ward: '14' }),
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()

		expect(result.active.map((r) => r.id)).toEqual([
			'req_1',
			'req_2',
			'req_3',
			'req_4',
		])

		expect(result.resolved.map((r) => r.id)).toEqual(['req_5'])

		expect(result.stats.open_count).toBe(4)
		expect(result.stats.resolved_count).toBe(1)
		expect(result.stats.wards_affected).toBe(5)
	})

	test('supports lowercase public dashboard statuses', async () => {
		const mockSnapshot = [
			createMockDoc('req_open', { status: 'open', sa_ward: '10' }),
			createMockDoc('req_ack', {
				status: 'acknowledged',
				sa_ward: '11',
			}),
			createMockDoc('req_progress', {
				status: 'in_progress',
				sa_ward: '12',
			}),
			createMockDoc('req_resolved', {
				status: 'resolved',
				sa_ward: '13',
			}),
			createMockDoc('req_closed', { status: 'closed', sa_ward: '14' }),
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()

		expect(result.active.map((r) => r.id)).toEqual([
			'req_open',
			'req_ack',
			'req_progress',
		])
		expect(result.resolved.map((r) => r.id)).toEqual(['req_resolved'])
		expect(result.stats.open_count).toBe(3)
		expect(result.stats.resolved_count).toBe(1)
		expect(result.stats.wards_affected).toBe(5)
	})

	test('uses UNASSIGNED as the default status when status is missing', async () => {
		const mockSnapshot = [
			createMockDoc('req_missing_status', {
				category: 'Pothole',
				sa_ward: '20',
			}),
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()

		expect(result.active.length).toBe(1)
		expect(result.active[0].id).toBe('req_missing_status')
		expect(result.active[0].status).toBe('UNASSIGNED')
	})

	test('strictly enforces the 20-item limit for resolved requests', async () => {
		const mockSnapshot = Array.from({ length: 25 }, (_, i) =>
			createMockDoc(`req_${i}`, { status: 'RESOLVED', sa_ward: '5' })
		)

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()

		expect(result.resolved.length).toBe(20)
		expect(result.stats.resolved_count).toBe(20)
		expect(result.active.length).toBe(0)
	})

	test('calculates unique wards_affected accurately and ignores missing wards', async () => {
		const mockSnapshot = [
			createMockDoc('req_1', { status: 'SUBMITTED', sa_ward: '99' }),
			createMockDoc('req_2', { status: 'SUBMITTED', sa_ward: '99' }),
			createMockDoc('req_3', { status: 'RESOLVED', sa_ward: '100' }),
			createMockDoc('req_4', { status: 'RESOLVED', sa_ward: '100' }),
			createMockDoc('req_5', { status: 'IN_PROGRESS', sa_ward: '101' }),
			createMockDoc('req_6', { status: 'SUBMITTED' }),
			createMockDoc('req_7', { status: 'SUBMITTED', sa_ward: null }),
		]

		getDocs.mockResolvedValueOnce(mockSnapshot)

		const result = await fetchPublicDashboardData()

		expect(result.stats.wards_affected).toBe(3)
	})
})