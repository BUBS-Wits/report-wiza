import {
	get_claimed_requests,
	update_request_status,
} from '../backend/worker_firebase'
import { getDocs, updateDoc, getDoc } from 'firebase/firestore'

console.log = () => {}
console.debug = () => {}
console.error = () => {}

jest.mock('firebase/firestore', () => ({
	getDocs: jest.fn(),
	updateDoc: jest.fn(),
	getDoc: jest.fn(),
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	doc: jest.fn(),
	serverTimestamp: jest.fn(() => 'mock_timestamp'),
}))

jest.mock('../firebase_config', () => ({
	db: {},
	auth: {},
	storage: {},
}))

describe('get_claimed_requests', () => {
	it('returns requests assigned to the worker', async () => {
		const mock_snapshot = {
			docs: [
				{
					id: 'req_001',
					data: () => ({
						category: 'sewage',
						status: 'open',
						assigned_worker_uid: 'worker_123',
					}),
				},
				{
					id: 'req_002',
					data: () => ({
						category: 'water',
						status: 'in_progress',
						assigned_worker_uid: 'worker_123',
					}),
				},
			],
		}
		getDocs.mockResolvedValue(mock_snapshot)

		const result = await get_claimed_requests('worker_123')
		expect(result).toEqual([
			{
				id: 'req_001',
				category: 'sewage',
				status: 'open',
				assigned_worker_uid: 'worker_123',
			},
			{
				id: 'req_002',
				category: 'water',
				status: 'in_progress',
				assigned_worker_uid: 'worker_123',
			},
		])
	})

	it('returns empty array when no requests are assigned', async () => {
		const mock_snapshot = { docs: [] }
		getDocs.mockResolvedValue(mock_snapshot)

		const result = await get_claimed_requests('worker_123')
		expect(result).toEqual([])
	})

	it('throws error on Firestore failure', async () => {
		getDocs.mockRejectedValue(new Error('Firestore error'))

		await expect(get_claimed_requests('worker_123')).rejects.toThrow(
			'Could not load your requests. Try again later.'
		)
	})
})

describe('update_request_status', () => {
	if (
		('updates status successfully',
		async () => {
			updateDoc.mockResolvedValue()

			const result = await update_request_status(
				'req_001',
				'acknowledged'
			)
			expect(result).toEqual({ success: true })
			expect(updateDoc).toHaveBeenCalledWith(
				undefined,
				expect.objectContaining({
					status: 'acknowledged',
					updated_at: 'mock_timestamp',
				})
			)
		})
	) {
		it('updates status to in_progress successfully', async () => {
			updateDoc.mockResolvedValue()

			const result = await update_request_status('req_001', 'in_progress')
			expect(result).toEqual({ success: true })
		})
	}

	it('updates status to resolved successfully', async () => {
		updateDoc.mockResolvedValue()

		const result = await update_request_status('req_001', 'resolved')
		expect(result).toEqual({ success: true })
	})

	it('throws error on Firestore failure', async () => {
		updateDoc.mockRejectedValue(new Error('Firestore error'))

		await expect(
			update_request_status('req_001', 'acknowledged')
		).rejects.toThrow('Could not update status. Try again.')
	})
})
