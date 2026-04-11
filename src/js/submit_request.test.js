import {
	assert_equal,
	test
} from '@bubs-wits/tests'
import {
	ResidentRequest
} from '@bubs-wits/shared'
import {
	send_request
} from './submit_request.js'

const ECHO_TEST = 'https://httpbin.org/post'

test('service_request_send_pass', async () => {
	const tmp = new ResidentRequest('water', 'water leakage.', 'data:image/jpeg;base64,AD/CE...')
	const response = await send_request(ECHO_TEST, tmp.to_json())
	assert_equal((await response.json()).data, tmp.to_string())
})

test('service_request_send_fail#1', async () => {
	const tmp = new ResidentRequest('water', 'water leakage.', 'data:image/jpeg;base64,AD/CE...')
	const response = await send_request('', tmp.to_json())
	assert_equal(response, null)
})

test('service_request_send_fail#2', async () => {
	const response = await send_request(ECHO_TEST, undefined)
	assert_equal(response, null)
})

test('service_request_send_fail#2', async () => {
	const response = await send_request(ECHO_TEST, {'test': 10n})
	assert_equal(response, null)
})
