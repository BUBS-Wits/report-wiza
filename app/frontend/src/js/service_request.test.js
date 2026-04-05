import {JSDOM} from "jsdom"
import {assert_equal, assert_not_equal, test} from "@bubs-wits/tests"
import {REQUEST_CATEGORIES, ResidentRequest} from "@bubs-wits/shared"
import {fill_select_options, get_request_input, get_data_uri} from "./service_request.js"

function create_mock_image_file(name, win) {
	return new win.File(
		// PNG Magic Number: `89 50 4E 47 0D 0A 1A 0A`
		// Only the first four sets of 2 are important for pngs for a minimal png
		[Uint8Array.from([137, 80, 78, 71])],
		name,
		{type: "image/png"}
	)
}

test("categories_addition_pass", () => {
	const dom = new JSDOM('<select id="category"><option value="">Test</option></select>')
	const select = dom.window.document.querySelector("select")
	fill_select_options(dom.window.document, select, REQUEST_CATEGORIES)
	const options = [...select.children].filter(e => e.value).map(e => e.value)
	assert_equal(JSON.stringify(options).trim(), JSON.stringify(REQUEST_CATEGORIES).trim())
	dom.window.close()
})

test("categories_addition_fail", () => {
	const dom = new JSDOM('<select id="category"><option value="">Test</option></select>')
	const select = dom.window.document.querySelector("select")
	fill_select_options(dom.window.document, select, REQUEST_CATEGORIES)
	const options = [...select.children].filter(e => e.value).map(e => "*" + e.value)
	assert_not_equal(JSON.stringify(options).trim(), JSON.stringify(REQUEST_CATEGORIES).trim())
	dom.window.close()
})

test("get_data_uri_pass", async () => {
	const dom = new JSDOM()
	const file = create_mock_image_file("test.png", dom.window)
	assert_equal(await get_data_uri(file), "data:image/png;base64,iVBORw==")
	dom.window.close()
})

test("get_data_uri_fail", async () => {
	const dom = new JSDOM()
	const file = create_mock_image_file("test.png", dom.window)
	assert_not_equal(await get_data_uri(file), "data:image/png;base64,iVBORw=")
	dom.window.close()
})

test("input_fetch_pass", async () => {
	const dom = new JSDOM(
		'<select id="category"><option value="">Test 1</option><option value="test" selected>Test 2</option></select>' +
		'<textarea id="description" name="desc">Hello, world!  </textarea>' + 
		'<input id="image" type="file"></img>',
		{runScripts: "dangerously"}
	)
	const files_input = dom.window.document.querySelector("input#image")
	Object.defineProperty(files_input, "files", {
		value: [create_mock_image_file("test.png", dom.window)],
		writable: false
	})
	const res_request = await get_request_input(dom.window.document)
	assert_equal(res_request.to_string(), JSON.stringify({
		category: "test",
		description: "Hello, world!",
		image: await get_data_uri(files_input.files[0])
	}))
	dom.window.close()
})

test("input_fetch_failed #1", async () => {
	const dom = new JSDOM(
		'<select id="category"><option value="">Test 1</option><option value="test">Test 2</option></select>' +
		'<textarea id="description" name="desc">Hello, world!  </textarea>' + 
		'<input id="image" type="file"></img>',
		{runScripts: "dangerously"}
	)
	const files_input = dom.window.document.querySelector("input#image")
	Object.defineProperty(files_input, "files", {
		value: [create_mock_image_file("test.png", dom.window)],
		writable: false
	})
	const res_request = await get_request_input(dom.window.document)
	assert_equal(res_request, null)
	dom.window.close()
})

test("input_fetch_failed #2", async () => {
	const dom = new JSDOM(
		'<select id="category"><option value="">Test 1</option><option value="test" selected>Test 2</option></select>' +
		'<textarea id="description" name="desc"></textarea>' + 
		'<input id="image" type="file"></img>',
		{runScripts: "dangerously"}
	)
	const files_input = dom.window.document.querySelector("input#image")
	Object.defineProperty(files_input, "files", {
		value: [create_mock_image_file("test.png", dom.window)],
		writable: false
	})
	const res_request = await get_request_input(dom.window.document)
	assert_equal(res_request, null)
	dom.window.close()
})

test("input_fetch_failed #3", async () => {
	const dom = new JSDOM(
		'<select id="category"><option value="">Test 1</option><option value="test" selected>Test 2</option></select>' +
		'<textarea id="description" name="desc">Hello, world!  </textarea>' + 
		'<input id="image" type="file"></img>',
		{runScripts: "dangerously"}
	)
	const files_input = dom.window.document.querySelector("input#image")
	const res_request = await get_request_input(dom.window.document)
	assert_equal(res_request, null)
	dom.window.close()
})
