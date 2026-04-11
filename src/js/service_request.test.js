import {
	JSDOM
} from 'jsdom'
import {
	REQUEST_CATEGORIES
} from './constants'
import {
	reset_preview,
	add_event_listeners,
	fill_select_options,
	get_request_input,
	get_data_uri
} from './service_request.js'

function create_mock_image_file(name, win) {
	return new win.File(
		[Uint8Array.from([137, 80, 78, 71])],
		name, {
			type: 'image/png'
		}
	)
}

test('find_input_elements#1', async () => {
	const dom = new JSDOM(
		'<main><form><img id="preview"/>' +
		'<input id="image" type="file"><input></form></main>', {
			runScripts: 'dangerously'
		}
	)
	reset_preview(dom.window.document)
	dom.window.close()
})

test('add_event_listeners_pass#1', async () => {
	const dom = new JSDOM(
		'<main><select id="category"><option value="">Test 1</option><option value="test" selected>Test 2</option></select>' +
		'<textarea id="description" name="desc">Hello, world!  </textarea>' +
		'<input id="image" type="file"></input>' +
		'<button>Submit</button></main>', {
			runScripts: 'dangerously'
		}
	)
	const submit = dom.window.document.querySelector('button')
	add_event_listeners(dom.window.document)
	submit.click()
	const files_input = dom.window.document.querySelector('input#image')
	Object.defineProperty(files_input, 'files', {
		value: [create_mock_image_file('test.png', dom.window)],
		writable: false
	})
	dom.window.close()
})

test('categories_addition_pass', () => {
	const dom = new JSDOM('<select id="category"><option value="">Test</option></select>')
	const select = dom.window.document.querySelector('select')
	fill_select_options(dom.window.document, select, REQUEST_CATEGORIES)
	const options = [...select.children].filter(e => e.value).map(e => e.value)
	expect(JSON.stringify(options).trim()).toEqual(JSON.stringify(REQUEST_CATEGORIES).trim())
	dom.window.close()
})

test('categories_addition_pass', () => {
	fill_select_options(undefined, undefined, undefined)
})

test('categories_addition_fail', () => {
	const dom = new JSDOM('<select id="category"><option value="">Test</option></select>')
	const select = dom.window.document.querySelector('select')
	fill_select_options(dom.window.document, select, REQUEST_CATEGORIES)
	const options = [...select.children].filter(e => e.value).map(e => '*' + e.value)
	expect(JSON.stringify(options).trim()).not.toEqual(JSON.stringify(REQUEST_CATEGORIES).trim())
	dom.window.close()
})

test('get_data_uri_pass', async () => {
	const dom = new JSDOM()
	const file = create_mock_image_file('test.png', dom.window)
	expect(await get_data_uri(file).toEqual('data:image/png;base64,iVBORw==')
	dom.window.close()
})

test('get_data_uri_fail', async () => {
	const dom = new JSDOM()
	const file = create_mock_image_file('test.png', dom.window)
	expect(await get_data_uri(file)).not.toEqual('data:image/png;base64,iVBORw=')
	dom.window.close()
})

test('input_fetch_pass', async () => {
	const dom = new JSDOM(
		'<select id="category"><option value="">Test 1</option><option value="test" selected>Test 2</option></select>' +
		'<textarea id="description" name="desc">Hello, world!  </textarea>' +
		'<input id="image" type="file"></input>' +
		'<button>Submit</button>', {
			runScripts: 'dangerously'
		}
	)
	const files_input = dom.window.document.querySelector('input#image')
	Object.defineProperty(files_input, 'files', {
		value: [create_mock_image_file('test.png', dom.window)],
		writable: false
	})
	const res_request = await get_request_input(dom.window.document)
	expect(res_request.to_string()).toEqual(JSON.stringify({
		category: 'test',
		description: 'Hello, world!',
		image: await get_data_uri(files_input.files[0])
	}))
	dom.window.close()
})

test('input_fetch_failed #1', async () => {
	const dom = new JSDOM(
		'<select id="category"><option value="">Test 1</option><option value="test">Test 2</option></select>' +
		'<textarea id="description" name="desc">Hello, world!  </textarea>' +
		'<input id="image" type="file"></input>', {
			runScripts: 'dangerously'
		}
	)
	const files_input = dom.window.document.querySelector('input#image')
	Object.defineProperty(files_input, 'files', {
		value: [create_mock_image_file('test.png', dom.window)],
		writable: false
	})
	const res_request = await get_request_input(dom.window.document)
	expect(res_request).toEqual(null)
	dom.window.close()
})

test('input_fetch_failed #2', async () => {
	const dom = new JSDOM(
		'<select id="category"><option value="">Test 1</option><option value="test" selected>Test 2</option></select>' +
		'<textarea id="description" name="desc"></textarea>' +
		'<input id="image" type="file"></input>', {
			runScripts: 'dangerously'
		}
	)
	const files_input = dom.window.document.querySelector('input#image')
	Object.defineProperty(files_input, 'files', {
		value: [create_mock_image_file('test.png', dom.window)],
		writable: false
	})
	const res_request = await get_request_input(dom.window.document)
	expect(res_request).toEqual(null)
	dom.window.close()
})

test('input_fetch_failed #3', async () => {
	const dom = new JSDOM(
		'<select id="category"><option value="">Test 1</option><option value="test" selected>Test 2</option></select>' +
		'<textarea id="description" name="desc">Hello, world!  </textarea>' +
		'<input id="image" type="file"></input>', {
			runScripts: 'dangerously'
		}
	)
	const res_request = await get_request_input(dom.window.document)
	expect(res_request).toEqual(null)
	dom.window.close()
})

test('input_fetch_failed #1', async () => {
	const res_request = await get_request_input(undefined)
	expect(res_request).toEqual(null)
})
