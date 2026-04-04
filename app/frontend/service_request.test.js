const {JSDOM} = require("jsdom")
const {assert_equal, assert_not_equal, test} = require("../../tests/test_framework.js")
const {fill_select_options} = require("./service_request.js")
const {REQUEST_CATEGORIES} = require("../../packages/shared/constants.js")

test("categories_addition_pass", () => {
	const dom = new JSDOM('<select id="category"><option value="">Test</option></select>')
	const select = dom.window.document.querySelector("select")
	fill_select_options(dom.window.document, select, REQUEST_CATEGORIES)
	const options = [...select.children].filter(e => e.value).map(e => e.value)
	assert_equal(JSON.stringify(options).trim(), JSON.stringify(REQUEST_CATEGORIES).trim())
})

test("categories_addition_fail", () => {
	const dom = new JSDOM('<select id="category"><option value="">Test</option></select>')
	const select = dom.window.document.querySelector("select")
	fill_select_options(dom.window.document, select, REQUEST_CATEGORIES)
	const options = [...select.children].filter(e => e.value).map(e => "*" + e.value)
	assert_not_equal(JSON.stringify(options).trim(), JSON.stringify(REQUEST_CATEGORIES).trim())
})
