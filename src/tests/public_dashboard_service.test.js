import { subscribe_to_public_dashboard } from '../backend/public_dashboard_service.js'
import { onSnapshot } from 'firebase/firestore'
import { parseLocation } from '../utils/parse_location.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	orderBy: jest.fn(),
	limit: jest.fn(),
	// onSnapshot replaces getDocs for the live-listener architecture
	onSnapshot: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

jest.mock('../utils/parse_location.js', () => ({
	parseLocation: jest.fn(),
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

const createMockDoc = (id, data) => ({
	id,
	data: () => data,
})

/**
 * Builds a mock Firestore snapshot whose forEach iterates over mockDocs,
 * then wires onSnapshot to call the success callback with it immediately
 * and return a no-op unsubscribe function.
 */
const mockSnapshot = (mockDocs) => {
	const snapshot = {
		forEach: (fn) => mockDocs.forEach(fn),
	}
	onSnapshot.mockImplementationOnce((_query, successCb, _errorCb) => {
		successCb(snapshot)
		return jest.fn() // unsubscribe
	})
}

/**
 * Wires onSnapshot to fire the error callback immediately.
 */
const mockSnapshotError = (error) => {
	onSnapshot.mockImplementationOnce((_query, _successCb, errorCb) => {
		errorCb(error)
		return jest.fn()
	})
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tests
───────────────────────────────────────────────────────────────────────────── */

describe('Public Dashboard Service', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		parseLocation.mockReturnValue({
			latitude: -26.2041,
			longitude: 28.0473,
		})
	})

	test('returns empty arrays and zeroed stats when no requests exist', () => {
		mockSnapshot([])

		let result
		subscribe_to_public_dashboard((data) => {
			result = data
		})

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

	test('skips requests with unparseable locations but still includes them', () => {
		// Requests without coords are still included; the map simply won't render them.
		// This mirrors the backend behaviour: normalise always runs, null coords are kept.
		parseLocation
			.mockReturnValueOnce(null)
			.mockReturnValueOnce({ latitude: 10, longitude: 20 })

		mockSnapshot([
			createMockDoc('req_bad_loc', { status: 'SUBMITTED', sa_ward: '1' }),
			createMockDoc('req_good_loc', {
				status: 'SUBMITTED',
				sa_ward: '1',
			}),
		])

		let result
		subscribe_to_public_dashboard((data) => {
			result = data
		})

		expect(result.active.length).toBe(2)
		expect(result.active.map((r) => r.id)).toEqual(
			expect.arrayContaining(['req_good_loc', 'req_bad_loc'])
		)
		expect(result.stats.open_count).toBe(2)
	})

	test('applies default values for missing fields during normalization', () => {
		mockSnapshot([createMockDoc('req_minimal', { status: 'UNASSIGNED' })])

		let result
		subscribe_to_public_dashboard((data) => {
			result = data
		})

		const request = result.active[0]

		expect(request.category).toBe('Unknown')
		expect(request.ward).toBe('Ward Unknown')
		expect(request.sa_ward).toBeUndefined() // raw data has no sa_ward
		expect(request.municipality).toBe('Unknown Municipality')
		expect(request.description).toBe('')
		expect(request.like_count).toBe(0)
		expect(request.latitude).toBe(-26.2041)
	})

	test('separates active and resolved statuses correctly and includes unknown statuses as active', () => {
		mockSnapshot([
			createMockDoc('req_1', { status: 'SUBMITTED', sa_ward: '10' }),
			createMockDoc('req_2', { status: 'UNASSIGNED', sa_ward: '11' }),
			createMockDoc('req_3', { status: 'ASSIGNED', sa_ward: '10' }),
			createMockDoc('req_4', { status: 'IN_PROGRESS', sa_ward: '12' }),
			createMockDoc('req_5', { status: 'RESOLVED', sa_ward: '13' }),
			// CLOSED is not in ACTIVE_STATUSES nor RESOLVED → falls through to active
			createMockDoc('req_6', { status: 'CLOSED', sa_ward: '14' }),
		])

		let result
		subscribe_to_public_dashboard((data) => {
			result = data
		})

		expect(result.active.length).toBe(5)
		expect(result.active.map((r) => r.id)).toEqual([
			'req_1',
			'req_2',
			'req_3',
			'req_4',
			'req_6',
		])

		expect(result.resolved.length).toBe(1)
		expect(result.resolved[0].id).toBe('req_5')

		expect(result.stats.open_count).toBe(5)
		expect(result.stats.resolved_count).toBe(1)
		expect(result.stats.wards_affected).toBe(5)
	})

	test('strictly enforces the 20-item limit for resolved requests', () => {
		mockSnapshot(
			Array.from({ length: 25 }, (_, i) =>
				createMockDoc(`req_${i}`, { status: 'RESOLVED', sa_ward: '5' })
			)
		)

		let result
		subscribe_to_public_dashboard((data) => {
			result = data
		})

		expect(result.resolved.length).toBe(20)
		expect(result.stats.resolved_count).toBe(20)
		expect(result.active.length).toBe(0)
	})

	test('calculates unique wards_affected accurately', () => {
		mockSnapshot([
			createMockDoc('req_1', { status: 'SUBMITTED', sa_ward: '99' }),
			createMockDoc('req_2', { status: 'SUBMITTED', sa_ward: '99' }),
			createMockDoc('req_3', { status: 'RESOLVED', sa_ward: '100' }),
			createMockDoc('req_4', { status: 'RESOLVED', sa_ward: '100' }),
			createMockDoc('req_5', { status: 'IN_PROGRESS', sa_ward: '101' }),
			createMockDoc('req_6', { status: 'SUBMITTED' }), // no sa_ward → 'undefined'
			createMockDoc('req_7', { status: 'SUBMITTED' }),
		])

		let result
		subscribe_to_public_dashboard((data) => {
			result = data
		})

		// Wards seen: '99', '100', '101', 'undefined'
		expect(result.stats.wards_affected).toBe(4)
	})

	test('calls on_error when the Firestore listener fires an error', () => {
		const testError = new Error('Firestore unavailable')
		mockSnapshotError(testError)

		const on_error = jest.fn()
		subscribe_to_public_dashboard(jest.fn(), on_error)

		expect(on_error).toHaveBeenCalledWith(testError)
	})

	test('returns an unsubscribe function that can be called on unmount', () => {
		const mockUnsub = jest.fn()
		onSnapshot.mockReturnValueOnce(mockUnsub)

		const unsub = subscribe_to_public_dashboard(jest.fn(), jest.fn())

		expect(typeof unsub).toBe('function')
		unsub()
		expect(mockUnsub).toHaveBeenCalledTimes(1)
	})
})
