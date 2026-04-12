import { Request } from './request.js'

let TESTS = []

test('input_validation_pass', () => {
	const tmp = new Request(
		'Water',
		'water leakage.',
		'data:image/jpeg;hello=world;that=joke,thisisanexample...'
	)
	expect(tmp.input_validate()).toEqual(true)
	expect(tmp.image_validate()).toEqual(true)
})

test('input_validation_fail', () => {
	const tmp = new Request(undefined, undefined, undefined)
	expect(tmp.input_validate()).not.toEqual(true)
	expect(tmp.image_validate()).not.toEqual(true)
})

TESTS = [
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
	'data:image/jpg,....',
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
	'data:image/jpeg;param=value;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
	'data:image/png;charset=utf-8;base64,iVBORw0KGgoAAAANSUhEUgAA...',
	'data:image/jpg;param1=1;param2=2;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
	'data:image/png,....',
	'data:image/JPEG;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
]
TESTS.forEach((uri, index) => {
	test(`image_validation_pass #${index + 1}`, () => {
		const tmp = new Request('water', 'water leakage.', uri)
		expect(tmp.input_validate()).toEqual(true)
		expect(tmp.image_validate()).toEqual(true)
	})
})

TESTS = [
	'data:image/gif;base64,R0lGODlhPQBEAPeoAJosM....',
	'data:image/png;base64iVBORw0KGgoAAAANSUhEUgAA...',
	'data:imge/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
	'data:;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
	'data:image/tiff;base64,SUkqAAgAAA....',
	'not-a-data-uri',
	'd',
	'',
	'data:image/jpeg;base64AAAAAA',
]
TESTS.forEach((uri, index) => {
	test(`image_validation_fail #${index + 1}`, () => {
		const tmp = new Request('water', 'water leakage.', uri)
		expect(tmp.image_validate()).not.toEqual(true)
	})
})

test('request_stringify_pass', () => {
	const tmp = new Request(
		'Water',
		'water leakage.',
		'data:image/jpeg;base64,/9j/4AAQ...'
	)
	expect(tmp.input_validate()).toEqual(true)
	expect(tmp.image_validate()).toEqual(true)
	expect(tmp.to_string()).toEqual(
		'{"category":"Water","description":"water leakage.","image":"data:image/jpeg;base64,/9j/4AAQ..."}'
	)
})
