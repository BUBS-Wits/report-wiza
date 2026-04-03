const {assert_equal, test} = require("../test_framework.js")
const {ResidentRequest} = require("../../src/frontend/request.js")
const {send_request} = require("../../src/frontend/submit_request.js")

const ECHO_TEST = "https://httpbin.org/post"
let TESTS = []

test("service request send pass", async () => {
	const tmp = new ResidentRequest("water", "water leakage.", "data:image/jpeg;base64,AD/CE...")
	const response = await send_request(ECHO_TEST, tmp.to_json())
	assert_equal((await response.json()).data, tmp.to_string())
})
