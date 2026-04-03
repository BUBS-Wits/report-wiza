const {assert_equal, assert_true, assert_false, test} = require("../test_framework.js")
const {ResidentRequest} = require("../../src/frontend/submit_request.js")

test("input validation pass", () => {
	const tmp = new ResidentRequest("Water", "water leakage.", "data:image/jpeg;hello=world;that=joke,thisisanexample...")
	assert_true(tmp.input_validate())
	assert_true(tmp.image_validate())
})

test("input validation fail", () => {
	const tmp = new ResidentRequest("Water", "water leakage.")
	assert_false(tmp.input_validate())
	assert_false(tmp.image_validate())
})

test("image validation pass", () => {
	const tests = [
		"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
		"data:image/jpg,....",
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
		"data:image/jpeg;param=value;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
		"data:image/png;charset=utf-8;base64,iVBORw0KGgoAAAANSUhEUgAA...",
		"data:image/jpg;param1=1;param2=2;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
		"data:image/png,....",
		"data:image/JPEG;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
	]
	for (const test of tests) {
		const tmp = new ResidentRequest("water", "water leakage.", test)
		assert_true(tmp.input_validate())
		assert_true(tmp.image_validate())
	}
})

test("image validation fail", () => {
	const tests = [
		"data:image/gif;base64,R0lGODlhPQBEAPeoAJosM....",
		"data:image/png;base64iVBORw0KGgoAAAANSUhEUgAA...",
		"data:imge/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
		"data:;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
		"data:image/tiff;base64,SUkqAAgAAA....",
		"not-a-data-uri",
		"",
		"data:image/jpeg;base64AAAAAA"
	]
	for (const test of tests) {
		const tmp = new ResidentRequest("water", "water leakage.", test)
		assert_true(tmp.input_validate())
		assert_false(tmp.image_validate())
	}
})
