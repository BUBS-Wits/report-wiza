import React from 'react'
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
	Timestamp: { now: jest.fn() },
}))

import {
	fetch_stale_requests,
	fetch_residents,
	fetch_admin_requests,
	fetch_workers_for_assign,
	seed_categories,
	fetch_categories,
	add_category,
	remove_category,
} from '../backend/admin_requests_service.js'

import { getDocs, addDoc, updateDoc } from 'firebase/firestore'

// ── fetch_stale_requests ───────────────────────────────────────────────────

describe('fetch_stale_requests', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given requests exist with mixed statuses and ages', () => {
		it('Then it should return only open and stale requests', async () => {
			const old_date = new Date(
				Date.now() - 5 * 24 * 60 * 60 * 1000
			).toISOString()
			const new_date = new Date().toISOString()

			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'r1',
						data: () => ({
							status: 0,
							created_at: old_date,
						}),
					},
					{
						id: 'r2',
						data: () => ({
							status: 1,
							created_at: old_date,
						}),
					},
					{
						id: 'r3',
						data: () => ({
							status: 'resolved',
							created_at: old_date,
						}),
					},
					{
						id: 'r4',
						data: () => ({
							status: 0,
							created_at: new_date,
						}),
					},
				],
			})

			const result = await fetch_stale_requests()
			expect(result).toHaveLength(2)
			expect(result.map((r) => r.id)).toEqual(['r1', 'r2'])
		})

		it('Then it should return empty array when no stale requests', async () => {
			const new_date = new Date().toISOString()
			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'r1',
						data: () => ({ status: 0, created_at: new_date }),
					},
				],
			})
			const result = await fetch_stale_requests()
			expect(result).toHaveLength(0)
		})
	})

	describe('Given getDocs fails', () => {
		it('Then it should throw an error', async () => {
			getDocs.mockRejectedValueOnce(new Error('Firebase error'))
			await expect(fetch_stale_requests()).rejects.toThrow(
				'Could not load stale requests. Try again.'
			)
		})
	})
})

// ── fetch_residents ────────────────────────────────────────────────────────

describe('fetch_residents', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given residents exist', () => {
		it('Then it should return a list of residents', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'u1',
						data: () => ({ role: 'resident', name: 'Alice' }),
					},
					{
						id: 'u2',
						data: () => ({ role: 'resident', name: 'Bob' }),
					},
				],
			})
			const result = await fetch_residents()
			expect(result).toHaveLength(2)
			expect(result[0].name).toBe('Alice')
		})
	})

	describe('Given getDocs fails', () => {
		it('Then it should throw an error', async () => {
			getDocs.mockRejectedValueOnce(new Error('Firebase error'))
			await expect(fetch_residents()).rejects.toThrow(
				'Could not load residents. Try again.'
			)
		})
	})
})

// ── fetch_admin_requests ───────────────────────────────────────────────────

describe('fetch_admin_requests', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given requests exist', () => {
		it('Then it should return all requests', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [
					{ id: 'req-1', data: () => ({ category: 'water' }) },
					{ id: 'req-2', data: () => ({ category: 'road' }) },
				],
			})
			const result = await fetch_admin_requests()
			expect(result).toHaveLength(2)
		})
	})

	describe('Given getDocs fails', () => {
		it('Then it should throw an error', async () => {
			getDocs.mockRejectedValueOnce(new Error('Firebase error'))
			await expect(fetch_admin_requests()).rejects.toThrow(
				'Could not load requests. Try again.'
			)
		})
	})
})

// ── fetch_workers_for_assign ───────────────────────────────────────────────

describe('fetch_workers_for_assign', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given workers exist', () => {
		it('Then it should return a list of workers', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [{ id: 'w1', data: () => ({ display_name: 'Thabo' }) }],
			})
			const result = await fetch_workers_for_assign()
			expect(result).toHaveLength(1)
			expect(result[0].display_name).toBe('Thabo')
		})
	})

	describe('Given getDocs fails', () => {
		it('Then it should throw an error', async () => {
			getDocs.mockRejectedValueOnce(new Error('Firebase error'))
			await expect(fetch_workers_for_assign()).rejects.toThrow(
				'Could not load workers. Try again.'
			)
		})
	})
})

// ── seed_categories ────────────────────────────────────────────────────────

describe('seed_categories', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given categories already exist', () => {
		it('Then it should return early without adding', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [{ id: 'cat-1', data: () => ({ name: 'water' }) }],
			})
			await seed_categories()
			expect(addDoc).not.toHaveBeenCalled()
		})
	})

	describe('Given no categories exist', () => {
		it('Then it should seed the default categories', async () => {
			getDocs.mockResolvedValueOnce({ docs: [] })
			addDoc.mockResolvedValue({ id: 'new-id' })
			const result = await seed_categories()
			expect(addDoc).toHaveBeenCalledTimes(4)
			expect(result.success).toBe(true)
		})
	})

	describe('Given getDocs fails', () => {
		it('Then it should throw an error', async () => {
			getDocs.mockRejectedValueOnce(new Error('Firebase error'))
			await expect(seed_categories()).rejects.toThrow(
				'Could not seed categories.'
			)
		})
	})
})

// ── fetch_categories error path ────────────────────────────────────────────

describe('fetch_categories error path', () => {
	beforeEach(() => jest.clearAllMocks())

	it('Then it should throw when getDocs fails', async () => {
		getDocs.mockRejectedValueOnce(new Error('Firebase error'))
		await expect(fetch_categories()).rejects.toThrow(
			'Could not load categories. Try again.'
		)
	})
})

// ── add_category error path ────────────────────────────────────────────────

describe('add_category error path', () => {
	beforeEach(() => jest.clearAllMocks())

	it('Then it should throw when addDoc fails', async () => {
		addDoc.mockRejectedValueOnce(new Error('Firebase error'))
		await expect(add_category('parks')).rejects.toThrow(
			'Could not add category. Try again.'
		)
	})
})

// ── remove_category error path ─────────────────────────────────────────────

describe('remove_category error path', () => {
	beforeEach(() => jest.clearAllMocks())

	it('Then it should throw when updateDoc fails', async () => {
		updateDoc.mockRejectedValueOnce(new Error('Firebase error'))
		await expect(remove_category('cat-1', false)).rejects.toThrow(
			'Could not update category. Try again.'
		)
	})
})
