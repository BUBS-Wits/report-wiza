/* global jest, describe, beforeEach, afterEach, test, expect */
import {
	register_worker_email,
	confirm_worker_role,
	subscribe_to_workers, // <-- UPDATED
	revoke_worker_role,
} from '../backend/admin_firebase.js'
import { sendSignInLinkToEmail } from 'firebase/auth'
import {
	doc,
	setDoc,
	updateDoc,
	collection,
	query,
	where,
	getDocs,
	serverTimestamp,
	onSnapshot, // <-- ADDED
} from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('firebase/auth', () => ({
	sendSignInLinkToEmail: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	setDoc: jest.fn(),
	updateDoc: jest.fn(),
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	getDocs: jest.fn(),
	serverTimestamp: jest.fn(),
	onSnapshot: jest.fn(), // <-- ADDED
}))

jest.mock('../firebase_config.js', () => ({
	auth: {},
	db: {},
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('Admin Firebase Service', () => {
	let consoleErrorSpy

	beforeEach(() => {
		jest.clearAllMocks()

		// Mock implementations to survive CRA's resetMocks
		serverTimestamp.mockReturnValue('mock-timestamp')
		doc.mockImplementation((db, coll, id) => `${coll}/${id}`)
		collection.mockImplementation((db, coll) => coll)
		query.mockImplementation((coll, condition) => `query-${coll}`)
		where.mockImplementation((field, op, val) => `${field}${op}${val}`)

		// Spy on console.error to keep test logs clean during expected error tests
		consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		// Mock localStorage
		Storage.prototype.setItem = jest.fn()
	})

	afterEach(() => {
		consoleErrorSpy.mockRestore()
		jest.restoreAllMocks()
	})

	describe('register_worker_email', () => {
		test('sends email link, saves to Firestore, and sets localStorage', async () => {
			getDocs.mockResolvedValue({
				empty: false,
				docs: [{ data: () => ({ role: 'resident' }) }],
			})
			sendSignInLinkToEmail.mockResolvedValue()
			setDoc.mockResolvedValue()

			const result = await register_worker_email('test@capetown.gov.za')

			expect(sendSignInLinkToEmail).toHaveBeenCalledTimes(1)
			expect(sendSignInLinkToEmail).toHaveBeenCalledWith(
				expect.anything(),
				'test@capetown.gov.za',
				expect.objectContaining({ handleCodeInApp: true })
			)

			expect(setDoc).toHaveBeenCalledTimes(1)

			expect(window.localStorage.setItem).toHaveBeenCalledWith(
				'worker_email_for_sign_in',
				'test@capetown.gov.za'
			)

			expect(result).toEqual({ success: true })
		})

		test('throws an error if the user is not found', async () => {
			getDocs.mockResolvedValue({ empty: true, docs: [] })

			await expect(
				register_worker_email('test@capetown.gov.za')
			).rejects.toThrow()

			expect(consoleErrorSpy).toHaveBeenCalled()
		})

		test('throws an error if the user is already a worker', async () => {
			getDocs.mockResolvedValue({
				empty: false,
				docs: [{ data: () => ({ role: 'worker' }) }],
			})

			await expect(
				register_worker_email('test@capetown.gov.za')
			).rejects.toThrow()

			expect(consoleErrorSpy).toHaveBeenCalled()
		})

		test('throws an error if sending the email fails', async () => {
			getDocs.mockResolvedValue({
				empty: false,
				docs: [{ data: () => ({ role: 'resident' }) }],
			})
			sendSignInLinkToEmail.mockRejectedValue(new Error('Auth failed'))

			await expect(
				register_worker_email('test@capetown.gov.za')
			).rejects.toThrow()

			expect(consoleErrorSpy).toHaveBeenCalled()
		})
	})

	describe('confirm_worker_role', () => {
		test('updates the user document and pending_workers list', async () => {
			updateDoc.mockResolvedValue()

			const personal_details = { name: 'John Doe', phone: '1234567890' }
			const result = await confirm_worker_role(
				'user_123',
				'worker@test.com',
				personal_details
			)

			expect(updateDoc).toHaveBeenCalledTimes(2)

			// First call: update users collection
			expect(updateDoc).toHaveBeenNthCalledWith(1, 'users/user_123', {
				role: 'worker',
				email: 'worker@test.com',
				name: 'John Doe',
				phone: '1234567890',
				verified_at: 'mock-timestamp',
			})

			// Second call: update pending_workers collection
			expect(updateDoc).toHaveBeenNthCalledWith(
				2,
				'pending_workers/worker@test.com',
				{
					status: 'verified',
				}
			)

			expect(result).toEqual({ success: true })
		})

		test('throws an error if updating fails', async () => {
			updateDoc.mockRejectedValue(new Error('Firestore error'))

			await expect(
				confirm_worker_role('user_123', 'worker@test.com', {})
			).rejects.toThrow('Could not complete registration. Try again.')
			expect(consoleErrorSpy).toHaveBeenCalled()
		})
	})

	describe('subscribe_to_workers', () => {
		test('calls on_update with mapped user documents with role == worker', () => {
			const mockDocs = [
				{ id: 'worker_1', data: () => ({ name: 'Alice' }) },
				{ id: 'worker_2', data: () => ({ name: 'Bob' }) },
			]

			const mockUnsubscribe = jest.fn()

			// Instantly trigger the listener with mock data
			onSnapshot.mockImplementationOnce((q, onNext, onError) => {
				onNext({ docs: mockDocs })
				return mockUnsubscribe
			})

			const on_update = jest.fn()
			const on_error = jest.fn()

			const unsub = subscribe_to_workers(on_update, on_error)

			expect(collection).toHaveBeenCalledWith(expect.anything(), 'users')
			expect(where).toHaveBeenCalledWith('role', '==', 'worker')
			expect(onSnapshot).toHaveBeenCalledTimes(1)

			expect(on_update).toHaveBeenCalledWith([
				{ id: 'worker_1', name: 'Alice' },
				{ id: 'worker_2', name: 'Bob' },
			])
			expect(on_error).not.toHaveBeenCalled()
			expect(unsub).toBe(mockUnsubscribe)
		})

		test('calls on_error if snapshot fails', () => {
			// Instantly trigger the listener error callback
			onSnapshot.mockImplementationOnce((q, onNext, onError) => {
				onError(new Error('Network error'))
				return jest.fn()
			})

			const on_update = jest.fn()
			const on_error = jest.fn()

			subscribe_to_workers(on_update, on_error)

			expect(on_error).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Could not load workers. Try again later.',
				})
			)
			expect(consoleErrorSpy).toHaveBeenCalled()
		})
	})

	describe('revoke_worker_role', () => {
		test('updates the user document role to resident', async () => {
			updateDoc.mockResolvedValue()

			const result = await revoke_worker_role('worker_123')

			expect(updateDoc).toHaveBeenCalledTimes(1)
			expect(updateDoc).toHaveBeenCalledWith('users/worker_123', {
				role: 'resident',
			})
			expect(result).toEqual({ success: true })
		})

		test('throws an error if revocation fails', async () => {
			updateDoc.mockRejectedValue(new Error('Permissions error'))

			await expect(revoke_worker_role('worker_123')).rejects.toThrow(
				'Could not revoke worker role. Try again.'
			)
			expect(consoleErrorSpy).toHaveBeenCalled()
		})
	})
})
