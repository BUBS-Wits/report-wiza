import { Request, request_converter } from './request.js'
import { image_validate } from '../../utility.js'

jest.mock('../../utility.js', () => ({
	image_validate: jest.fn(),
}))

/* ── Shared fixtures ─────────────────────────────────────────────────────── */

const VALID_LOC_INFO = {
	ward: 5,
	province: 'Gauteng',
	m_id: 798,
	m_code: 'GT011',
	m_name: 'City of Johannesburg',
}

const valid_string_args = () => [
	'Electricity',
	'Street light is out',
	'data:image/png;base64,abc123',
	28.0473,
	-26.2041,
	{ ...VALID_LOC_INFO },
]

const valid_json = () => ({
	category: 'Electricity',
	description: 'Street light is out',
	image: 'data:image/png;base64,abc123',
	longitude: '28.0473',
	latitude: '-26.2041',
	loc_info: { ...VALID_LOC_INFO },
	created_at: '2024-01-15T10:00:00Z',
	updated_at: '2024-01-16T12:00:00Z',
	status: 1, // STATUS.ASSIGNED = 1
})

/* ══════════════════════════════════════════════════════════════════════════
   Request — string constructor
   ══════════════════════════════════════════════════════════════════════════ */

describe('Request — string constructor', () => {
	test('sets all fields correctly', () => {
		const [cat, desc, img, lon, lat, loc] = valid_string_args()
		const r = new Request(cat, desc, img, lon, lat, loc)

		expect(r.category).toBe('Electricity')
		expect(r.description).toBe('Street light is out')
		expect(r.image).toBe(img)
		expect(r.longitude).toBe(lon)
		expect(r.latitude).toBe(lat)
		expect(r.loc_info).toEqual(loc)
		expect(r.created_at).toBeInstanceOf(Date)
		expect(r.updated_at).toBeInstanceOf(Date)
	})

	test('trims whitespace from category and description', () => {
		const r = new Request('  Water  ', '  Leak  ', 'img', 0, 0, {
			...VALID_LOC_INFO,
		})
		expect(r.category).toBe('Water')
		expect(r.description).toBe('Leak')
	})

	test('undefined optional args stay undefined', () => {
		const r = new Request('Roads')
		expect(r.description).toBeUndefined()
		expect(r.image).toBeUndefined()
		expect(r.longitude).toBeUndefined()
		expect(r.latitude).toBeUndefined()
		expect(r.loc_info).toBeUndefined()
	})

	test('does not set status', () => {
		const r = new Request(...valid_string_args())
		expect(r.status).toBeUndefined()
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   Request — object (JSON) constructor
   ══════════════════════════════════════════════════════════════════════════ */

describe('Request — object constructor', () => {
	test('parses all fields from a valid JSON object', () => {
		const r = new Request(valid_json())

		expect(r.category).toBe('Electricity')
		expect(r.description).toBe('Street light is out')
		expect(r.longitude).toBe(28.0473)
		expect(r.latitude).toBe(-26.2041)
		expect(r.created_at).toEqual(new Date('2024-01-15T10:00:00Z'))
		expect(r.updated_at).toEqual(new Date('2024-01-16T12:00:00Z'))
	})

	test('casts longitude and latitude to numbers', () => {
		const r = new Request(valid_json())
		expect(typeof r.longitude).toBe('number')
		expect(typeof r.latitude).toBe('number')
	})

	test('casts loc_info.ward and m_id to numbers', () => {
		const json = valid_json()
		json.loc_info.ward = '7'
		json.loc_info.m_id = '42'
		const r = new Request(json)
		expect(typeof r.loc_info.ward).toBe('number')
		expect(typeof r.loc_info.m_id).toBe('number')
	})

	test('falls back to new Date() when created_at is missing', () => {
		const json = valid_json()
		delete json.created_at
		const before = new Date()
		const r = new Request(json)
		expect(r.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime())
	})

	test('falls back to new Date() when updated_at is missing', () => {
		const json = valid_json()
		delete json.updated_at
		const before = new Date()
		const r = new Request(json)
		expect(r.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime())
	})

	test('does not set status when json.status is absent', () => {
		const json = valid_json()
		delete json.status
		const r = new Request(json)
		expect(r.status).toBeUndefined()
	})

	test('does not throw when constructor receives a broken object', () => {
		expect(() => new Request({ loc_info: null })).not.toThrow()
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   input_validate
   ══════════════════════════════════════════════════════════════════════════ */

describe('input_validate', () => {
	test('returns true for a fully valid request', () => {
		const r = new Request(...valid_string_args())
		expect(r.input_validate()).toBe(true)
	})

	test('returns false when category is missing', () => {
		const r = new Request(...valid_string_args())
		r.category = undefined
		expect(r.input_validate()).toBe(false)
	})

	test('returns false when description is missing', () => {
		const r = new Request(...valid_string_args())
		r.description = undefined
		expect(r.input_validate()).toBe(false)
	})

	test('returns false when image is missing', () => {
		const r = new Request(...valid_string_args())
		r.image = undefined
		expect(r.input_validate()).toBe(false)
	})

	test('returns false when longitude is undefined', () => {
		const r = new Request(...valid_string_args())
		r.longitude = undefined
		expect(r.input_validate()).toBe(false)
	})

	test('returns false when latitude is undefined', () => {
		const r = new Request(...valid_string_args())
		r.latitude = undefined
		expect(r.input_validate()).toBe(false)
	})

	test('returns false when loc_info is missing', () => {
		const r = new Request(...valid_string_args())
		r.loc_info = undefined
		expect(r.input_validate()).toBe(false)
	})

	test('returns false when loc_validate fails', () => {
		const r = new Request(...valid_string_args())
		r.loc_info = { ...VALID_LOC_INFO, ward: undefined }
		expect(r.input_validate()).toBe(false)
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   loc_validate
   ══════════════════════════════════════════════════════════════════════════ */

describe('loc_validate', () => {
	test('returns true for valid loc_info', () => {
		const r = new Request(...valid_string_args())
		expect(r.loc_validate()).toBe(true)
	})

	test('returns false when ward is undefined', () => {
		const r = new Request(...valid_string_args())
		r.loc_info = { ...VALID_LOC_INFO, ward: undefined }
		expect(r.loc_validate()).toBe(false)
	})

	test('returns false when province is falsy', () => {
		const r = new Request(...valid_string_args())
		r.loc_info = { ...VALID_LOC_INFO, province: '' }
		expect(r.loc_validate()).toBe(false)
	})

	test('returns false when municipality id is undefined', () => {
		const r = new Request(...valid_string_args())
		r.loc_info = { ...VALID_LOC_INFO, m_id: undefined }
		expect(r.loc_validate()).toBe(false)
	})

	test('returns false when municipality code is falsy', () => {
		const r = new Request(...valid_string_args())
		r.loc_info = { ...VALID_LOC_INFO, m_code: '' }
		expect(r.loc_validate()).toBe(false)
	})

	test('returns false when municipality name is falsy', () => {
		const r = new Request(...valid_string_args())
		r.loc_info = { ...VALID_LOC_INFO, m_name: '' }
		expect(r.loc_validate()).toBe(false)
	})

	test('returns false when loc_info is undefined', () => {
		const r = new Request(...valid_string_args())
		r.loc_info = undefined
		expect(r.loc_validate()).toBe(false)
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   image_validate (async)
   ══════════════════════════════════════════════════════════════════════════ */

describe('image_validate', () => {
	beforeEach(() => image_validate.mockReset())

	test('returns false when input_validate fails', async () => {
		const r = new Request('Only category')
		const result = await r.image_validate()
		expect(result).toBe(false)
		expect(image_validate).not.toHaveBeenCalled()
	})

	test('delegates to utility image_validate when inputs are valid', async () => {
		image_validate.mockResolvedValue(true)
		const r = new Request(...valid_string_args())
		const result = await r.image_validate()
		expect(image_validate).toHaveBeenCalledWith(r.image)
		expect(result).toBe(true)
	})

	test('returns false when utility image_validate returns false', async () => {
		image_validate.mockResolvedValue(false)
		const r = new Request(...valid_string_args())
		expect(await r.image_validate()).toBe(false)
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   Getters
   ══════════════════════════════════════════════════════════════════════════ */

describe('get_municipality', () => {
	test('returns correct municipality object', () => {
		const r = new Request(...valid_string_args())
		expect(r.get_municipality()).toEqual({
			id: VALID_LOC_INFO.m_id,
			code: VALID_LOC_INFO.m_code,
			name: VALID_LOC_INFO.m_name,
		})
	})

	test('returns undefined fields gracefully when loc_info is absent', () => {
		const r = new Request('Roads')
		expect(r.get_municipality()).toEqual({
			id: undefined,
			code: undefined,
			name: undefined,
		})
	})
})

describe('get_ward', () => {
	test('returns ward number', () => {
		const r = new Request(...valid_string_args())
		expect(r.get_ward()).toBe(VALID_LOC_INFO.ward)
	})

	test('returns undefined when loc_info is absent', () => {
		const r = new Request('Roads')
		expect(r.get_ward()).toBeUndefined()
	})
})

describe('get_province', () => {
	test('returns province string', () => {
		const r = new Request(...valid_string_args())
		expect(r.get_province()).toBe(VALID_LOC_INFO.province)
	})

	test('returns undefined when loc_info is absent', () => {
		const r = new Request('Roads')
		expect(r.get_province()).toBeUndefined()
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   Serialisation
   ══════════════════════════════════════════════════════════════════════════ */

describe('to_json', () => {
	test('returns correct shape', () => {
		const [cat, desc, img, lon, lat, loc] = valid_string_args()
		const r = new Request(cat, desc, img, lon, lat, loc)
		expect(r.to_json()).toEqual({
			category: cat,
			description: desc,
			image: img,
			longitude: lon,
			latitude: lat,
			loc_info: loc,
		})
	})

	test('does not include status or timestamps', () => {
		const r = new Request(valid_json())
		const json = r.to_json()
		expect(json).not.toHaveProperty('status')
		expect(json).not.toHaveProperty('created_at')
		expect(json).not.toHaveProperty('updated_at')
	})
})

describe('to_string', () => {
	test('returns valid JSON string matching to_json', () => {
		const r = new Request(...valid_string_args())
		expect(JSON.parse(r.to_string())).toEqual(r.to_json())
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   set_placeholder_image
   ══════════════════════════════════════════════════════════════════════════ */

describe('set_placeholder_image', () => {
	test('sets image to the placeholder SVG data URI', () => {
		const r = new Request(...valid_string_args())
		r.set_placeholder_image()
		expect(r.image).toMatch(/^data:image\/svg\+xml/)
		expect(r.image).toContain('No Image')
	})

	test('input_validate still passes after placeholder is set', () => {
		const r = new Request(...valid_string_args())
		r.set_placeholder_image()
		expect(r.input_validate()).toBe(true)
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   request_converter.to_firestore
   ══════════════════════════════════════════════════════════════════════════ */

describe('request_converter.to_firestore', () => {
	const make_request = () => new Request(...valid_string_args())
	const created = new Date('2024-01-15T10:00:00Z')
	const updated = new Date('2024-01-16T12:00:00Z')

	test('returns correct shape with numeric status', () => {
		const doc = request_converter.to_firestore(
			'uid_123',
			make_request(),
			created,
			updated,
			1 // STATUS.ASSIGNED
		)
		expect(doc).toMatchObject({
			user_uid: 'uid_123',
			status: 1,
			category: 'Electricity',
			description: 'Street light is out',
			sa_ward: VALID_LOC_INFO.ward,
			sa_province: VALID_LOC_INFO.province,
			sa_m_id: VALID_LOC_INFO.m_id,
			sa_m_code: VALID_LOC_INFO.m_code,
			sa_m_name: VALID_LOC_INFO.m_name,
		})
	})

	test('encodes location as WKT POINT string', () => {
		const doc = request_converter.to_firestore(
			'uid_123',
			make_request(),
			created,
			updated,
			1
		)
		expect(doc.location).toBe('SRID=4326;POINT(28.0473 -26.2041)')
	})

	test('stores created_at and updated_at as UTC strings', () => {
		const doc = request_converter.to_firestore(
			'uid_123',
			make_request(),
			created,
			updated,
			1
		)
		expect(doc.created_at).toBe(created.toUTCString())
		expect(doc.updated_at).toBe(updated.toUTCString())
	})

	test('passes STATUS.SUBMITTED = 0 through correctly', () => {
		const doc = request_converter.to_firestore(
			'uid_123',
			make_request(),
			created,
			updated,
			0
		)
		expect(doc.status).toBe(0)
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   request_converter.from_firestore
   ══════════════════════════════════════════════════════════════════════════ */

const make_firestore_snapshot = (overrides = {}) => {
	const data = {
		category: 'Electricity',
		description: 'Street light is out',
		image: 'data:image/png;base64,abc123',
		location: 'SRID=4326;POINT(28.0473 -26.2041)',
		sa_ward: 5,
		sa_province: 'Gauteng',
		sa_m_id: 798,
		sa_m_code: 'GT011',
		sa_m_name: 'City of Johannesburg',
		status: 1, // STATUS.ASSIGNED
		created_at: '2024-01-15T10:00:00Z',
		updated_at: '2024-01-16T12:00:00Z',
		...overrides,
	}
	return { data: () => data }
}

describe('request_converter.from_firestore', () => {
	test('returns a Request instance', () => {
		const r = request_converter.from_firestore(make_firestore_snapshot())
		expect(r).toBeInstanceOf(Request)
	})

	test('extracts longitude and latitude from WKT', () => {
		const r = request_converter.from_firestore(make_firestore_snapshot())
		expect(r.longitude).toBe(28.0473)
		expect(r.latitude).toBe(-26.2041)
	})

	test('builds loc_info correctly', () => {
		const r = request_converter.from_firestore(make_firestore_snapshot())
		expect(r.loc_info).toEqual({
			ward: 5,
			province: 'Gauteng',
			m_id: 798,
			m_code: 'GT011',
			m_name: 'City of Johannesburg',
		})
	})

	test('passes numeric status through', () => {
		const r = request_converter.from_firestore(make_firestore_snapshot())
		expect(r.status).toBe(1)
	})

	// STATUS.SUBMITTED = 0 is falsy — make sure it isn't swallowed
	test('handles STATUS.SUBMITTED = 0 correctly', () => {
		const r = request_converter.from_firestore(
			make_firestore_snapshot({ status: 0 })
		)
		expect(r.status).toBe(0)
	})

	test('handles all STATUS values', () => {
		;[0, 1, 2, 3, 4].forEach((status) => {
			const r = request_converter.from_firestore(
				make_firestore_snapshot({ status })
			)
			expect(r.status).toBe(status)
		})
	})
})

/* ══════════════════════════════════════════════════════════════════════════
   request_converter.from_firestore_doc
   ══════════════════════════════════════════════════════════════════════════ */

const make_firestore_doc = (overrides = {}) => ({
	category: 'Electricity',
	description: 'Street light is out',
	image: 'data:image/png;base64,abc123',
	location: 'SRID=4326;POINT(28.0473 -26.2041)',
	sa_ward: 5,
	sa_province: 'Gauteng',
	sa_m_id: 798,
	sa_m_code: 'GT011',
	sa_m_name: 'City of Johannesburg',
	status: 1,
	created_at: '2024-01-15T10:00:00Z',
	updated_at: '2024-01-16T12:00:00Z',
	...overrides,
})

describe('request_converter.from_firestore_doc', () => {
	test('returns a Request instance', () => {
		const r = request_converter.from_firestore_doc(make_firestore_doc())
		expect(r).toBeInstanceOf(Request)
	})

	test('extracts longitude and latitude from WKT', () => {
		const r = request_converter.from_firestore_doc(make_firestore_doc())
		expect(r.longitude).toBe(28.0473)
		expect(r.latitude).toBe(-26.2041)
	})

	test('builds loc_info correctly', () => {
		const r = request_converter.from_firestore_doc(make_firestore_doc())
		expect(r.loc_info).toEqual({
			ward: 5,
			province: 'Gauteng',
			m_id: 798,
			m_code: 'GT011',
			m_name: 'City of Johannesburg',
		})
	})

	test('handles negative longitude in WKT', () => {
		const r = request_converter.from_firestore_doc(
			make_firestore_doc({
				location: 'SRID=4326;POINT(-73.9857 40.7484)',
			})
		)
		expect(r.longitude).toBe(-73.9857)
		expect(r.latitude).toBe(40.7484)
	})

	test('passes all STATUS values through correctly', () => {
		;[0, 1, 2, 3, 4].forEach((status) => {
			const r = request_converter.from_firestore_doc(
				make_firestore_doc({ status })
			)
			expect(r.status).toBe(status)
		})
	})
})
