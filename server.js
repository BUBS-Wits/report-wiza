import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import admin from 'firebase-admin'

/********************* Setup *********************/

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
const service_account = JSON.parse(
	Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString(
		'utf8'
	)
)

admin.initializeApp({
	credential: admin.credential.cert(service_account),
})

const db = admin.firestore()
db.settings({ databaseId: 'report-wiza-db' })
db.listCollections()
	.then(() => console.log('Firebase connected.'))
	.catch((err) => console.error('Firebase failed:', err))

/********************* Utility *********************/

const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23e0e0e0'/><rect x='32' y='32' width='192' height='192' fill='none' stroke='%239e9e9e' stroke-width='4'/><line x1='32' y1='32' x2='224' y2='224' stroke='%239e9e9e' stroke-width='4'/><line x1='224' y1='32' x2='32' y2='224' stroke='%239e9e9e' stroke-width='4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23757575' font-family='Arial, sans-serif' font-size='20'>No Image</text></svg>`

async function get_data_uri(file) {
	if (typeof file !== 'object') {
		return null
	}
	if (typeof window !== 'undefined') {
		// native browser
		return new Promise((resolve) => {
			const reader = new FileReader()
			reader.onload = (e) => {
				const data_uri = e.target.result
				resolve(data_uri)
			}
			reader.readAsDataURL(file)
		})
	} else {
		// nodejs
		const buffer = Buffer.from(await file.arrayBuffer())
		const data_uri = `data:${file.type};base64,${buffer.toString('base64')}`
		return data_uri
	}
}

async function image_validate(image) {
	if (!image) {
		return false
	}
	let image_uri =
		typeof image === 'string' ? image : await get_data_uri(image)
	if (!image_uri) {
		return false
	}
	if (/^(https:\/\/|http:\/\/|ftp:\/\/)/.test(image)) {
		return true
	}
	image_uri = image_uri.trim()
	const image_media_types_suffix = ['jpeg', 'jpg', 'png']
	const image_data_uri_regex = new RegExp(
		`^data:image/(${image_media_types_suffix.join('|')})(;[^,;]+)*,.*$`,
		'i'
	)
	return image_data_uri_regex.test(image_uri)
}

class Request {
	constructor(
		category,
		description = undefined,
		image = undefined,
		longitude = undefined,
		latitude = undefined,
		location_info = undefined
	) {
		try {
			if (typeof category === 'string') {
				this.category = category?.trim()
				this.description = description?.trim()
				this.image = image
				this.longitude = longitude
				this.latitude = latitude
				this.loc_info = location_info
			} else if (typeof category === 'object') {
				const json = category
				this.category = json.category?.trim()
				this.description = json.description?.trim()
				this.image = json.image
				this.longitude = Number(json.longitude)
				this.latitude = Number(json.latitude)
				this.loc_info = json.loc_info
				this.loc_info.ward = Number(this.loc_info.ward)
				this.loc_info.m_id = Number(this.loc_info.m_id)
				if (json.status) {
					this.status = json.status?.trim()
				}
			}
		} catch (err) {}
	}

	async image_validate() {
		if (!this.input_validate()) {
			return false
		}
		return image_validate(this.image)
	}

	input_validate() {
		if (
			this.category &&
			this.description &&
			this.image &&
			this.longitude !== undefined &&
			this.latitude !== undefined &&
			this.loc_info &&
			this.loc_validate()
		) {
			return true
		}
		return false
	}

	to_string() {
		return JSON.stringify(this.to_json())
	}

	to_json() {
		return {
			category: this.category,
			description: this.description,
			image: this.image,
			longitude: this.longitude,
			latitude: this.latitude,
			loc_info: this.loc_info,
		}
	}

	get_municipality() {
		return {
			id: this.loc_info?.m_id,
			code: this.loc_info?.m_code,
			name: this.loc_info?.m_name,
		}
	}

	get_ward() {
		return this.loc_info?.ward
	}

	get_province() {
		return this.loc_info?.province
	}

	loc_validate() {
		const municipality = this.get_municipality()
		if (
			this.get_ward() === undefined ||
			!this.get_province() ||
			!municipality ||
			municipality.id === undefined ||
			!municipality.code ||
			!municipality.name
		) {
			return false
		}
		return true
	}

	set_placeholder_image() {
		this.image = PLACEHOLDER_IMAGE
	}
}

const request_converter = {
	to_firestore: function (user_uid, request, now, ustatus) {
		const municipality = request.get_municipality()
		return {
			user_uid,
			created_at: now.toUTCString(),
			location: `SRID=4326;POINT(${request.longitude} ${request.latitude})`,
			sa_ward: request.get_ward(),
			sa_province: request.get_province(),
			sa_m_id: municipality.id,
			sa_m_code: municipality.code,
			sa_m_name: municipality.name,
			status: ustatus,
			category: request.category,
			description: request.description,
			image: request.image,
		}
	},
	from_firestore: function (snapshot, options) {
		const data = snapshot.data(options)
		data['longitude'] = data.location.replace(
			/SRID=4326;POINT\((-?[0-9\.]*) (-?[0-9\.]*)\)/g,
			'$1'
		)
		data['latitude'] = data.location.replace(
			/SRID=4326;POINT\((-?[0-9\.]*) (-?[0-9\.]*)\)/g,
			'$2'
		)
		data['loc_info'] = {
			ward: data.sa_ward,
			province: data.sa_province,
			m_id: data.sa_m_id,
			m_code: data.sa_m_code,
			m_name: data.sa_m_name,
		}
		return new Request(data)
	},
	from_firestore_doc: function (doc, options) {
		const data = doc
		data['longitude'] = data.location.replace(
			/SRID=4326;POINT\((-?[0-9\.]*) (-?[0-9\.]*)\)/g,
			'$1'
		)
		data['latitude'] = data.location.replace(
			/SRID=4326;POINT\((-?[0-9\.]*) (-?[0-9\.]*)\)/g,
			'$2'
		)
		data['loc_info'] = {
			ward: data.sa_ward,
			province: data.sa_province,
			m_id: data.sa_m_id,
			m_code: data.sa_m_code,
			m_name: data.sa_m_name,
		}
		return new Request(data)
	},
}

class ClaimedRequest {
	constructor(request_uid, worker_uid) {
		this.worker_uid = worker_uid
		this.request_uid = request_uid
	}

	validate() {
		if (this.request_uid && this.worker_uid && this.status) {
			return true
		}
		return false
	}

	to_string() {
		return JSON.stringify(this.to_json())
	}

	to_json() {
		return {
			worker_uid: this.worker_uid,
			request_uid: this.request_uid,
		}
	}
}

const claimed_request_converter = {
	to_firestore: function (claimed_request) {
		return {
			worker_uid: claimed_request.worker_uid,
			request_uid: claimed_request.request_uid,
		}
	},
	from_firestore: function (snapshot, options) {
		const data = snapshot.data(options)
		return new ClaimedRequest(data.request_uid, data.worker_uid)
	},
}

/********************* Backend *********************/

app.use(express.json({ limit: '10mb' }))

const respond = {
	unauthorized: (res) =>
		res.status(400).json({ error: 'Unauthorized access to API endpoint.' }),
	invalid_parameters: (res) =>
		res.status(400).json({ error: 'Invalid parameters provided.' }),
}

const authenticate = async (req, res, next) => {
	try {
		const header = req.headers.authorization

		if (!header || !header.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'No token' })
		}

		const token = header.split('Bearer ')[1]

		const decoded = await admin.auth().verifyIdToken(token)

		req.user = decoded
		next()
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' })
	}
}

const generate_doc_id = (collection, now) => {
	const new_doc_ref = db.collection(collection).doc()

	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	const hours = String(now.getHours()).padStart(2, '0')
	const minutes = String(now.getMinutes()).padStart(2, '0')
	const seconds = String(now.getSeconds()).padStart(2, '0')

	const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`
	return `${timestamp}_${new_doc_ref.id}`
}

const apply_query = (query, condition) => {
	if (!Array.isArray(condition) && condition.length !== 3) {
		console.debug(
			`get_db_documents > provided condition array ith len != 3`
		)
		return
	}
	return query.where(condition[0], condition[1], condition[2])
}

/**
 * get_db_documents() - Returns an array of db docs matching some condition(s)
 * @collection: Collection name as a string in db
 * @conditions: An array of the conditions to check treated as being joined by AND.
 * 	A condition is an array of exactly length 3.
 * 	Given st. conditions[0] is the field to filter,
 * 	conditions[1] is the comparison op,
 * 	and condition[2] is the value.
 */
const get_db_documents = (collection, conditions) => {
	if (!Array.isArray(conditions)) {
		console.error('get_db_documents > conditions not given as array')
		return new Promise.resolve({
			ok: false,
			value: new Error(
				'Argument "conditions" incorrect type passed (Expected Array).'
			),
		})
	}
	const col = db.collection(collection)
	let query = col
	for (const condition of conditions) {
		query = apply_query(query, condition)
	}
	// TODO: add query optimization using `startAt()` and `limit()`
	return query
		.get()
		.then((snapshot) => {
			return {
				ok: true,
				value: snapshot.docs.map((doc_snap) => ({
					id: doc_snap.id,
					...doc_snap.data(),
				})),
			}
		})
		.catch((error) => {
			console.error(
				'get_db_documents > error hile getting documents: ',
				error
			)
			return { ok: false, value: error }
		})
}

const get_db_document = (collection, doc_id) => {
	return db
		.collection(collection)
		.doc(doc_id)
		.get()
		.then((doc_snap) => {
			if (doc_snap.exists) {
				return {
					ok: true,
					value: { id: doc_snap.id, ...doc_snap.data() },
				}
			} else {
				return { ok: true, value: null }
			}
		})
		.catch((error) => {
			console.error(
				'get_db_document > error while getting document: ',
				error
			)
			return { ok: false, value: error }
		})
}

const set_db_document = (collection, doc_id, doc) => {
	return db
		.collection(collection)
		.doc(doc_id)
		.set(doc)
		.then(() => {
			return { ok: true, value: doc_id }
		})
		.catch((error) => {
			return { ok: false, value: error }
		})
}

const update_db_document = (collection, doc_id, doc) =>
	set_db_document(collection, doc_id, doc)

const delete_db_document = (collection, doc_id) => {
	return db
		.collection(collection)
		.doc(doc_id)
		.delete()
		.then(() => {
			return { ok: true, value: `successfully deleted "${doc_id}"` }
		})
		.catch((err) => {
			return { ok: false, value: `failed to delete "${doc_id}"` }
		})
}

const create_db_document = (collection, doc) => {
	const no = new Date(Date.now())
	const doc_id = generate_doc_id(collection, no)

	return set_db_document(collection, doc_id, doc)
}

const exists_db_document = async (collection, doc) => {
	if (typeof doc === 'string') {
		const ret = await get_db_document(collection, doc)
		if (!ret.ok || ret.value) {
			return true
		}
		return false
	}
	const conditions = []
	for (const key of Object.keys(doc)) {
		conditions.push([key, '==', doc[key]])
	}
	const docs =
		conditions.length > 0
			? await get_db_documents(collection, conditions)
			: null
	if (
		!docs || //empty doc
		!docs.ok || // error > it is safer to assume it exists
		(docs.value && docs.value.length > 0)
	) {
		return true
	}
	return false
}

const has_role = (uid, role) => {
	return get_db_document('users', uid).then((ret) => {
		if (!ret.ok) {
			return { ok: false, value: ret.value }
		}
		if (!ret.value) {
			return { ok: true, value: false }
		}
		return { ok: true, value: ret.value.role === role }
	})
}

const role_service = {
	is_resident: (uid) => has_role(uid, 'resident'),
	is_admin: (uid) => has_role(uid, 'admin'),
	is_worker: (uid) => has_role(uid, 'worker'),
}

app.post('/api/submit-request', authenticate, async (req, res) => {
	try {
		const body = req.body

		// DO YOUR VALIDATION DIRECTLY IN THE BACKEND
		if (!body) {
			return respond.invalid_parameters(res)
		}

		const tmp = new Request(body)
		if (!tmp.input_validate()) {
			return respond.invalid_parameters(res)
		}
		console.log('hi')
		const service_request = request_converter.to_firestore(
			req.user.uid,
			tmp,
			new Date(Date.now()),
			'SUBMITTED'
		)

		console.log('hi')
		if (!(await exists_db_document('service_requests', service_request))) {
			console.log('hi')
			const ret = await create_db_document(
				'service_requests',
				service_request
			)
			if (ret.ok) {
				return res.status(200).json({ data: ret.value })
			} else {
				return res.status(400).json({ error: ret.value })
			}
		} else {
			res.status(201).json({ data: 'Request already exists' })
		}
	} catch (err) {
		console.error('Database error:', err)
		res.status(500).json({ error: 'Internal server error' })
	}
})

app.get('/api/claim-request', authenticate, async (req, res) => {
	try {
		const uid = req.user.uid
		const is_worker = await role_service.is_worker(uid)
		if (!is_worker.ok) {
			return res.status(500).json({ error: 'Failed to get role' })
		}
		if (!is_worker.value) {
			return respond.unauthorized(res)
		}
		const request_uid = req.query.request_uid
		if (!request_uid || Object.keys(req.query).length !== 1) {
			return respond.invalid_parameters(res)
		}
		const tmp = await get_db_documents('assignments', [
			['request_uid', '==', request_uid],
		])
		if (tmp.ok && tmp.value.length > 0) {
			return res.status(201).json({
				data: 'Request already claimed in db.',
			})
		}
		const tmp2 = new ClaimedRequest(request_uid, uid)
		const claimed_request = claimed_request_converter.to_firestore(tmp2)
		const ret = await create_db_document('assignments', claimed_request)
		if (!ret.ok) {
			return res.status(400).json({ error: ret.value })
		}
		const ret2 = await get_db_document('service_requests', request_uid)
		if (!ret2.ok) {
			return res.status(400).json({
				error: ret2.value,
				dd: 'Created assignment but failed to change status',
			})
		}
		if (ret2.value === null) {
			return res.status(401).json({
				error: 'Created assignment but failed to change status',
			})
		}
		const tmp3 = request_converter.from_firestore_doc(ret2.value, {})
		const new_request = request_converter.to_firestore(
			uid,
			tmp3,
			new Date(ret2.value['created_at']),
			'ASSIGNED'
		)
		const final_ret = set_db_document(
			'service_requests',
			request_uid,
			new_request
		)
		return res.status(200).json({ data: ret.value })
	} catch (err) {
		console.error('Database error:', err)
		res.status(500).json({ error: 'Internal server error' })
	}
})

app.get('/api/get-requests', async (req, res) => {
	try {
		const conditions = []
		if (req.query.all) {
			if (req.query.all === 'false') {
				if (!authenticate(req, res, () => {})) {
					return respond.unauthorized(res)
				}
				conditions.push(['service_requests', '==', req.user.uid])
			} else if (
				req.query.all !== 'true' ||
				Object.keys(req.query).length !== 1
			) {
				return respond.invalid_parameters(res)
			}
		}
		const ret = await get_db_documents('service_requests', conditions)
		if (!ret.ok) {
			return res.status(400).json({ error: ret.value })
		}
		return res.status(200).json({ data: ret.value })
	} catch (err) {
		console.error('Database error:', err)
		res.status(500).json({ error: 'Internal server error' })
	}
})

app.get('/api/get-claimed-requests', authenticate, async (req, res) => {
	try {
		const uid = req.user.uid
		const is_worker = await role_service.is_worker(uid)
		const is_admin = await role_service.is_admin(uid)
		if (!is_worker.ok || !is_admin.ok) {
			return res.status(500).json({ error: 'Failed to get role' })
		}
		if (!is_worker.value && !is_admin.value) {
			return respond.unauthorized(res)
		}
		let conditions = is_admin.value ? [] : [['worker_uid', '==', uid]]
		let ret = await get_db_documents('assignments', conditions)
		if (!ret.ok) {
			return res.status(400).json({ error: ret.value })
		}
		const claimed_requests = []
		for (const doc of ret.value) {
			const iret = await get_db_document(
				'service_requests',
				doc.request_uid
			)
			if (!iret.ok) {
				return res.status(400).json({ error: iret.value })
			}
			const data = iret.value
			if (data === null) {
				continue
			}
			claimed_requests.push({
				id: data.id,
				status: data.status,
				category: data.category,
				description: data.description,
				location: data.location,
				sa_ward: data['sa_ward'],
				sa_m_name: data['sa_m_name'],
			})
		}
		return res.status(200).json({ data: claimed_requests })
	} catch (err) {
		console.error('Database error:', err)
		res.status(500).json({ error: 'Internal server error' })
	}
})

app.get('/api/get-unclaimed-requests', authenticate, async (req, res) => {
	try {
		const uid = req.user.uid
		const is_worker = await role_service.is_worker(uid)
		const is_admin = await role_service.is_admin(uid)
		if (!is_worker.ok || !is_admin.ok) {
			return res.status(500).json({ error: 'Failed to get role' })
		}
		if (!is_worker.value && !is_admin.value) {
			return respond.unauthorized(res)
		}

		let ret = await get_db_documents('assignments', [])
		if (!ret.ok) {
			return res.status(400).json({ error: ret.value })
		}
		const claimed_requests = ret.value.map((doc) => doc.request_uid)

		ret = await get_db_documents('service_requests', [])
		if (!ret.ok) {
			return res.status(400).json({ error: ret.value })
		}
		const requests = []
		for (const doc of ret.value) {
			if (claimed_requests.indexOf(doc.id) !== -1) {
				continue
			}
			requests.push({
				id: doc.id,
				status: doc.status,
				category: doc.category,
				description: doc.description,
				location: doc.location,
				sa_ward: doc['sa_ward'],
				sa_m_name: doc['sa_m_name'],
			})
		}
		return res.status(200).json({ data: requests })
	} catch (err) {
		console.error('Database error:', err)
		res.status(500).json({ error: 'Internal server error' })
	}
})

/********************* Frontend *********************/

const build_path = path.resolve(path.join(__dirname, 'build'))
app.use(express.static(build_path))

app.get(/.*/, (req, res) => {
	res.sendFile(path.join(build_path, 'index.html'))
})

/********************* Start *********************/

const PORT = process.env.PORT || 3000

app.listen(PORT, () =>
	console.log(`Server running on:\nhttp://localhost:${PORT}`)
)

/********************* End *********************/
