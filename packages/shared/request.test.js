import {assert_not_equal, assert_equal, assert_true, assert_false, test} from '@bubs-wits/tests'
import {ResidentRequest} from './request.js'

let TESTS = []

test('input_validation_pass', () => {
	const tmp = new ResidentRequest('Water', 'water leakage.', 'data:image/jpeg;hello=world;that=joke,thisisanexample...')
	assert_true(tmp.input_validate())
	assert_true(tmp.image_validate())
})

test('input_validation_fail', () => {
	const tmp = new ResidentRequest(undefined, undefined, undefined)
	assert_false(tmp.input_validate())
	assert_false(tmp.image_validate())
})

TESTS = [
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
	'data:image/jpg,....',
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
	'data:image/jpeg;param=value;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
	'data:image/png;charset=utf-8;base64,iVBORw0KGgoAAAANSUhEUgAA...',
	'data:image/jpg;param1=1;param2=2;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
	'data:image/png,....',
	'data:image/JPEG;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
]
TESTS.forEach((uri, index) => {
	test(`image_validation_pass #${index + 1}`, () => {
		const tmp = new ResidentRequest('water', 'water leakage.', uri)
		assert_true(tmp.input_validate())
		assert_true(tmp.image_validate())
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
	'data:image/jpeg;base64AAAAAA'
]
TESTS.forEach((uri, index) => {
	test(`image_validation_fail #${index + 1}`, () => {
		const tmp = new ResidentRequest('water', 'water leakage.', uri)
		assert_false(tmp.image_validate())
	})
})

test('request_stringify_pass', () => {
	const tmp = new ResidentRequest('Water', 'water leakage.', 'data:image/jpeg;base64,/9j/4AAQ...')
	assert_true(tmp.input_validate())
	assert_true(tmp.image_validate())
	assert_equal(tmp.to_string(), '{"category":"Water","description":"water leakage.","image":"data:image/jpeg;base64,/9j/4AAQ..."}')
})
