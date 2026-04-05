import {assert_equal, test} from "@bubs-wits/tests"
import {ResidentRequest} from "@bubs-wits/shared"
import {send_request} from "./submit_request.js"

const ECHO_TEST = "https://httpbin.org/post"
let TESTS = []

test("service_request_send_pass", async () => {
	const tmp = new ResidentRequest("water", "water leakage.", "data:image/jpeg;base64,AD/CE...")
	const response = await send_request(ECHO_TEST, tmp.to_json())
	assert_equal((await response.json()).data, tmp.to_string())
})
