import '@testing-library/jest-dom'
import { ClaimedRequest, claimed_request_converter } from './claimed_request.js'

test('validation pass', async () => {
	const tmp = new ClaimedRequest(
		'test_request_uid',
		'test_worker_uid',
		'pending'
	)
	expect(tmp.validate()).toEqual(true)
})

test('validation fail', async () => {
	const tmp = new ClaimedRequest(undefined, undefined, undefined)
	expect(tmp.validate()).not.toEqual(true)
})

test('request stringify pass', async () => {
	const tmp = new ClaimedRequest(
		'test_request_uid',
		'test_worker_uid',
		'pending'
	)
	expect(tmp.validate()).toEqual(true)
	expect(JSON.parse(tmp.to_string())).toEqual({
		request_uid: 'test_request_uid',
		worker_uid: 'test_worker_uid',
		status: 'pending',
	})
})

test('converter to firestore', () => {
	const tmp = new ClaimedRequest(
		'test_request_uid',
		'test_worker_uid',
		'pending'
	)
	const tmp_date = new Date(Date.now())
	expect(claimed_request_converter.to_firestore(tmp)).toEqual({
		request_uid: 'test_request_uid',
		worker_uid: 'test_worker_uid',
		status: 'pending',
	})
})

test('converter from firestore', () => {
	const tmp = new ClaimedRequest(
		'test_request_uid',
		'test_worker_uid',
		'pending'
	)
	const tmp_snapshot = {
		data: (options) => ({
			request_uid: 'test_request_uid',
			worker_uid: 'test_worker_uid',
			status: 'pending',
		}),
	}
	expect(claimed_request_converter.from_firestore(tmp_snapshot, {})).toEqual(
		tmp
	)
})
