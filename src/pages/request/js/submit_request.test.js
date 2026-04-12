import { Request } from '../../js/request.js'
import { send_request } from './submit_request.js'

const ECHO_TEST = 'https://httpbin.org/post'

test('service_request_send_pass', async () => {
	const tmp = new Request(
		'water',
		'water leakage.',
		'data:image/jpeg;base64,AD/CE...'
	)
	const response = await send_request(ECHO_TEST, tmp.to_json())
	const data = (await response.json()).data
	expect(data).toEqual(tmp.to_string())
})

test('service_request_send_fail#1', async () => {
	const tmp = new Request(
		'water',
		'water leakage.',
		'data:image/jpeg;base64,AD/CE...'
	)
	const response = await send_request('', tmp.to_json())
	expect(response).toEqual(null)
})

test('service_request_send_fail#2', async () => {
	const response = await send_request(ECHO_TEST, undefined)
	expect(response).toEqual(null)
})

test('service_request_send_fail#2', async () => {
	const response = await send_request(ECHO_TEST, { test: 10n })
	expect(response).toEqual(null)
})
