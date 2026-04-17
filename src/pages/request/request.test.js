import { Request } from './request.js'

let TESTS = []
const [longitude, latitude] = [-5, 5]
const tmp_loc = {
	m_id: 10,
	m_code: 'test_mcode',
	m_name: 'test_mname',
	province: 'test_prov',
	ward: 'test_ward',
}

test('input_validation_pass', async () => {
	const tmp = new Request(
		'Water',
		'water leakage.',
		'data:image/jpeg;hello=world;that=joke,thisisanexample...',
		longitude,
		latitude,
		tmp_loc
	)
	expect(tmp.input_validate()).toEqual(true)
	expect(await tmp.image_validate()).toEqual(true)
	expect(tmp.loc_validate()).toEqual(true)
})

test('input_validation_fail', async () => {
	const tmp = new Request(
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined
	)
	expect(tmp.input_validate()).not.toEqual(true)
	expect(await tmp.image_validate()).not.toEqual(true)
	expect(tmp.loc_validate()).not.toEqual(true)
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
	test(`image_validation_pass #${index + 1}`, async () => {
		const tmp = new Request(
			'water',
			'water leakage.',
			uri,
			longitude,
			latitude,
			tmp_loc
		)
		expect(tmp.input_validate()).toEqual(true)
		expect(await tmp.image_validate()).toEqual(true)
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
	test(`image_validation_fail #${index + 1}`, async () => {
		const tmp = new Request(
			'water',
			'water leakage.',
			uri,
			longitude,
			latitude,
			tmp_loc
		)
		expect(await tmp.image_validate()).not.toEqual(true)
		tmp.set_placeholder_image()
	})
})

test('request_stringify_pass', async () => {
	const tmp = new Request(
		'Water',
		'water leakage.',
		'data:image/jpeg;base64,/9j/4AAQ...',
		longitude,
		latitude,
		tmp_loc
	)
	expect(tmp.input_validate()).toEqual(true)
	expect(await tmp.image_validate()).toEqual(true)
	expect(tmp.to_string()).toEqual(
		`{"category":"Water","description":"water leakage.","image":"data:image/jpeg;base64,/9j/4AAQ...","longitude":${longitude},"latitude":${latitude},"loc_info":${JSON.stringify(tmp_loc)}}`
	)
	const tmp2 = new Request(tmp.to_json())
	expect(tmp2.input_validate()).toEqual(true)
	expect(await tmp2.image_validate()).toEqual(true)
	expect(tmp2.to_string()).toEqual(
		`{"category":"Water","description":"water leakage.","image":"data:image/jpeg;base64,/9j/4AAQ...","longitude":${longitude},"latitude":${latitude},"loc_info":${JSON.stringify(tmp_loc)}}`
	)
})
