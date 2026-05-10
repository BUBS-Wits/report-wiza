import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('../firebase_config.js', () => ({ auth: {}, db: {} }))

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	updateDoc: jest.fn(),
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	getDocs: jest.fn(),
	orderBy: jest.fn(),
	serverTimestamp: jest.fn(),
	addDoc: jest.fn(),
}))

jest.mock(
	'react-router-dom',
	() => ({
		useNavigate: () => jest.fn(),
		BrowserRouter: ({ children }) => <div>{children}</div>,
	}),
	{ virtual: true }
)

import {
	set_request_priority,
	close_request,
	fetch_admin_requests,
	fetch_categories,
	add_category,
	remove_category,
	assign_stale_request,
	block_resident,
	fetch_worker_performance,
} from '../backend/admin_requests_service.js'

import { updateDoc, getDocs, addDoc } from 'firebase/firestore'

// ── US027 — Set priority ──────────────────────────────────────────────────

describe('US027 — set_request_priority', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given a valid request id and priority', () => {
		it('Then it should call updateDoc with the correct priority', async () => {
			updateDoc.mockResolvedValueOnce()
			await set_request_priority('req-001', 'High')
			expect(updateDoc).toHaveBeenCalled()
		})

		it('Then it should return success', async () => {
			updateDoc.mockResolvedValueOnce()
			const result = await set_request_priority('req-001', 'High')
			expect(result.success).toBe(true)
		})
	})

	describe('Given updateDoc fails', () => {
		it('Then it should throw an error', async () => {
			updateDoc.mockRejectedValueOnce(new Error('Firebase error'))
			await expect(
				set_request_priority('req-001', 'High')
			).rejects.toThrow()
		})
	})
})

// ── US028 — Close request ─────────────────────────────────────────────────

describe('US028 — close_request', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given a valid request id and comment', () => {
		it('Then it should update the request status to closed', async () => {
			updateDoc.mockResolvedValueOnce()
			addDoc.mockResolvedValueOnce()
			await close_request('req-001', 'admin-uid', 'Duplicate request')
			expect(updateDoc).toHaveBeenCalled()
		})

		it('Then it should save the mandatory comment', async () => {
			updateDoc.mockResolvedValueOnce()
			addDoc.mockResolvedValueOnce()
			await close_request('req-001', 'admin-uid', 'Duplicate request')
			expect(addDoc).toHaveBeenCalled()
		})

		it('Then it should return success', async () => {
			updateDoc.mockResolvedValueOnce()
			addDoc.mockResolvedValueOnce()
			const result = await close_request(
				'req-001',
				'admin-uid',
				'Duplicate request'
			)
			expect(result.success).toBe(true)
		})
	})

	describe('Given no comment is provided', () => {
		it('Then it should throw a validation error', async () => {
			await expect(
				close_request('req-001', 'admin-uid', '')
			).rejects.toThrow('A comment is required to close a request.')
		})
	})
})

// ── US029 — Manage categories ─────────────────────────────────────────────

describe('US029 — manage categories', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given fetch_categories is called', () => {
		it('Then it should return a list of categories', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'cat-1',
						data: () => ({ name: 'Water', active: true }),
					},
					{
						id: 'cat-2',
						data: () => ({ name: 'Electricity', active: true }),
					},
				],
			})
			const result = await fetch_categories()
			expect(result).toHaveLength(2)
			expect(result[0].name).toBe('Water')
		})
	})

	describe('Given add_category is called with a new name', () => {
		it('Then it should call addDoc', async () => {
			addDoc.mockResolvedValueOnce({ id: 'cat-new' })
			await add_category('Roads')
			expect(addDoc).toHaveBeenCalled()
		})
	})

	describe('Given remove_category is called', () => {
		it('Then it should call updateDoc to set active false', async () => {
			updateDoc.mockResolvedValueOnce()
			await remove_category('cat-1')
			expect(updateDoc).toHaveBeenCalled()
		})
	})
})

// ── US030 — Assign stale requests ─────────────────────────────────────────

describe('US030 — assign_stale_request', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given a stale request and a worker uid', () => {
		it('Then it should assign the worker to the request', async () => {
			updateDoc.mockResolvedValueOnce()
			await assign_stale_request('req-001', 'worker-uid')
			expect(updateDoc).toHaveBeenCalled()
		})

		it('Then it should return success', async () => {
			updateDoc.mockResolvedValueOnce()
			const result = await assign_stale_request('req-001', 'worker-uid')
			expect(result.success).toBe(true)
		})
	})
})

// ── US039 — Block resident ────────────────────────────────────────────────

describe('US039 — block_resident', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given a valid resident uid', () => {
		it('Then it should set is_blocked to true', async () => {
			updateDoc.mockResolvedValueOnce()
			await block_resident('resident-uid', true)
			expect(updateDoc).toHaveBeenCalled()
		})

		it('Then it should return success', async () => {
			updateDoc.mockResolvedValueOnce()
			const result = await block_resident('resident-uid', true)
			expect(result.success).toBe(true)
		})
	})

	describe('Given unblocking a resident', () => {
		it('Then it should set is_blocked to false', async () => {
			updateDoc.mockResolvedValueOnce()
			const result = await block_resident('resident-uid', false)
			expect(result.success).toBe(true)
		})
	})
})

// ── US046 — Worker performance ────────────────────────────────────────────

describe('US046 — fetch_worker_performance', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given workers and requests exist', () => {
		it('Then it should return performance data per worker', async () => {
			getDocs
				.mockResolvedValueOnce({
					docs: [
						{
							id: 'w1',
							data: () => ({
								display_name: 'Thabo',
								role: 'worker',
							}),
						},
					],
				})
				.mockResolvedValueOnce({
					docs: [
						{
							id: 'r1',
							data: () => ({
								worker_uid: 'w1',
								status: 'resolved',
								created_at: { toMillis: () => 0 },
								updated_at: { toMillis: () => 86400000 },
							}),
						},
						{
							id: 'r2',
							data: () => ({
								worker_uid: 'w1',
								status: 'pending',
								created_at: { toMillis: () => 0 },
								updated_at: { toMillis: () => 0 },
							}),
						},
					],
				})
			const result = await fetch_worker_performance()
			expect(result).toHaveLength(1)
			expect(result[0].name).toBe('Thabo')
			expect(result[0].resolved).toBe(1)
			expect(result[0].total).toBe(2)
		})
	})
})
