import '@testing-library/jest-dom'
import {
	image_validate,
	get_data_uri,
	get_uint8array,
	get_date,
	get_voting_district_info,
	get_location,
} from './utility.js'
import { WARD_API } from './constants.js'

console.log = () => {}
console.debug = () => {}
console.error = () => {}

test('test', () => {})

describe('utility image validation tests', () => {
	test('valid image test', async () => {
		expect(await image_validate('data:image/jpeg;base64,dummy')).toEqual(
			true
		)
	})
	describe('valid image test (file)', () => {
		let file
		test('testing getting data uri and Uint8Array', () => {
			const signature = new Uint8Array([255, 216, 255])
			const image_array = get_uint8array('test')
			const combined = new Uint8Array(
				signature.length + image_array.length
			)
			combined.set(signature)
			combined.set(image_array, signature.length)
			file = new File([combined], 'test.jpg', { type: 'image/jpeg' })
		})
		test('testing validity of image file', async () => {
			expect(await image_validate(file)).toEqual(true)
		})
	})
	test('valid image test (http url)', async () => {
		expect(await image_validate('https://test')).toEqual(true)
	})
	test('invalid image test', async () => {
		expect(await image_validate(undefined)).toEqual(false)
	})
	test('invalid image test', async () => {
		expect(await image_validate(10)).toEqual(false)
	})
})

describe('utility getting Uint8Array', () => {
	test('valid input', () => {
		expect(get_uint8array('test')).toEqual(new Uint8Array([181, 235, 45]))
	})
	test('invalid input', () => {
		expect(get_uint8array(1)).toEqual(null)
	})
	test('invalid input (not base64)', () => {
		expect(get_uint8array('test....')).toEqual(null)
	})
})

describe('utility getting data uri', () => {
	test('valid input', async () => {
		const test_file = expect.any(File)
		const file = new File([new Uint8Array([181, 235, 45])], 'test', {
			type: 'image/jpeg',
		})
		expect(await get_data_uri(file)).toEqual('data:image/jpeg;base64,test')
	})
	test('invalid input', async () => {
		expect(await get_data_uri(undefined)).toEqual(null)
	})
})

describe('utility get date', () => {
	test('expected return', () => {
		expect(get_date(new Date(0))).toHaveProperty('year', 1970)
		expect(get_date(new Date(0))).toHaveProperty('month', '01')
		expect(get_date(new Date(0))).toHaveProperty('day', '01')
	})
})

describe('get location', () => {
	test('success', async () => {
		const mock_response = {
			ok: true,
			json: () => Promise.resolve({ longitude: -5, latitude: 5 }),
		}

		const fetch_spy = jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(mock_response)

		const result = await get_location()
		expect(fetch_spy).toHaveBeenCalledWith('https://ipapi.co/json/')
		expect(result).toEqual([-5, 5])
		fetch_spy.mockRestore()
	})
	test('server returns failed', async () => {
		const mock_response = {
			ok: false,
			json: () => Promise.resolve({ longitude: -5, latitude: 5 }),
		}

		const fetch_spy = jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(mock_response)

		const result = await get_location()
		expect(fetch_spy).toHaveBeenCalledWith('https://ipapi.co/json/')
		expect(result).toEqual(null)
		fetch_spy.mockRestore()
	})
	test('error in processing of result', async () => {
		const mock_response = {
			ok: false,
			json: () => {
				throw new Error()
				return null
			},
		}

		const fetch_spy = jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(mock_response)

		const result = await get_location()
		expect(fetch_spy).toHaveBeenCalledWith('https://ipapi.co/json/')
		expect(result).toEqual(null)
		fetch_spy.mockRestore()
	})
})

describe('get voting district', () => {
	test('success', async () => {
		const mock_response = {
			ok: true,
			json: () =>
				Promise.resolve({
					Municipality: 'my bruh',
					MunicipalityID: 1,
					MunicipalityCode: 'awez',
					Ward: 10,
					Province: 'howzit',
				}),
		}

		const fetch_spy = jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(mock_response)

		const result = await get_voting_district_info([-5, 5])
		expect(fetch_spy).toHaveBeenCalledWith(
			'/api/voting-district?latitude=undefined&longitude=-5,5',
			{ credentials: 'omit' }
		)
		expect(result).toHaveProperty('m_code', 'awez')
		expect(result).toHaveProperty('m_id', 1)
		fetch_spy.mockRestore()
	})
	test('server returns failed', async () => {
		const mock_response = {
			ok: false,
			json: () => Promise.resolve({ longitude: -5, latitude: 5 }),
		}

		const fetch_spy = jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(mock_response)

		const result = await get_voting_district_info([-5, 5])
		expect(fetch_spy).toHaveBeenCalledWith(
			'/api/voting-district?latitude=undefined&longitude=-5,5',
			{ credentials: 'omit' }
		)
		expect(result).toEqual(null)
		fetch_spy.mockRestore()
	})
	test('error in processing of result', async () => {
		const mock_response = {
			ok: false,
			json: () => {
				throw new Error()
				return null
			},
		}

		const fetch_spy = jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(mock_response)

		const result = await get_voting_district_info([-5, 5])
		expect(fetch_spy).toHaveBeenCalledWith(
			'/api/voting-district?latitude=undefined&longitude=-5,5',
			{ credentials: 'omit' }
		)
		expect(result).toEqual(null)
		fetch_spy.mockRestore()
	})
})
