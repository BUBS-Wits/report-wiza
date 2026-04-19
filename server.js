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
	databaseURL: 'https://report-wiza-default-rtdb.firebaseio.com',
})

const db = admin.firestore()
db.listCollections()
	.then(() => console.log('firebase connected.'))
	.catch((err) => console.error('firebase failed:', err))

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
	to_firestore: function (user_uid, request, now) {
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
}

class ClaimedRequest {
	constructor(request_uid, worker_uid, tmp_status) {
		this.request_uid = request_uid
		this.worker_uid = worker_uid
		this.status = tmp_status
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
			request_uid: this.request_uid,
			worker_uid: this.worker_uid,
			status: this.status,
		}
	}
}

const claimed_request_converter = {
	to_firestore: function (claimed_request) {
		return {
			request_uid: claimed_request.request_uid,
			worker_uid: claimed_request.worker_uid,
			status: claimed_request.status,
		}
	},
	from_firestore: function (snapshot, options) {
		const data = snapshot.data(options)
		return new ClaimedRequest(
			data.request_uid,
			data.worker_uid,
			data.status
		)
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

const generate_doc_id = (collection, no) => {
	const new_doc_ref = db.collection(collection).doc()
	const now = new Date(Date.now())
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
				'get_db_document > error hile getting document: ',
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
		let body
		try {
			// Tom-Foolery to check if it is even a valid json object
			body = JSON.parse(JSON.stringify(req.body))
		} catch (err) {
			return res.status(400).json({
				error: 'Unknon body. Failed to parse as JSON.',
			})
		}

		const request = new Request(body)
		if (
			!body ||
			!request.input_validate() ||
			(await !request.image_validate())
		) {
			return respond.invalid_parameters(res)
		}

		const service_request = request_converter.to_firestore(
			req.user.uid,
			request,
			new Date(Date.now())
		)
		if (!(await exists_db_document('service_request', service_request))) {
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
			return res.status(201).json({
				data: 'User alredy exists in db.',
			})
		}
	} catch (err) {
		console.error('api submit-request > proxy error: ', err)
		return res.status(500).json({
			error: 'Internal server error',
		})
	}
})

app.get('/api/claim-request', authenticate, async (req, res) => {
	const uid = req.user.uid
	const is_worker = await role_service.is_worker(uid)
	if (!is_worker) {
		return respond.unauthorized(res)
	}
	const request_uid = req.query.request_uid
	if (!request_uid || Object.keys(req.query).length !== 1) {
		return respond.invalid_parameters(res)
	}
	if (await exists_db_document('claimed_requests', request_uid)) {
		return res.status(201).json({
			data: 'Request already claimed in db.',
		})
	}
	const tmp = new ClaimedRequest(request_uid, uid, 'pending')
	const claimed_request = claimed_request_converter.to_firestore(tmp)
	const ret = await create_db_document('claimed_requests', claimed_request)
	if (!ret.ok) {
		return res.status(400).json({ error: ret.value })
	}
	return res.status(200).json({ data: ret.value })
})

app.get('/api/get-requests', async (req, res) => {
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
})

app.get('/api/get-claimed-requests', authenticate, async (req, res) => {
	const uid = req.user.uid
	const is_worker = await role_service.is_worker(uid)
	const is_admin = await role_service.is_admin(uid)
	if (!is_worker && !is_admin) {
		return respond.unauthorized(res)
	}
	const conditions = is_admin ? [] : ['worker_uid', '==', uid]
	const ret = await get_db_documents('claimed_requests', conditions)
	if (!ret.ok) {
		return res.status(400).json({ error: ret.value })
	}
	return res.status(200).json({ data: ret.value })
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
