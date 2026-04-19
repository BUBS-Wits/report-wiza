import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { Request, request_converter } from './src/backend/request.js'
import {
	ClaimedRequest,
	claimed_request_converter,
} from './src/backend/claimed_request.js'

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
	databaseURL: 'https://report-iza-default-rtdb.firebaseio.com',
})

const db = admin.firestore()
db.listCollections()
	.then(() => console.log('firebase connected.'))
	.catch((err) => console.error('firebase failed:', err))

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
	const d = get_date(no)
	const timestamp = `${d.year}${d.month}${d.day}${d.hours}${d.minutes}${d.seconds}`
	return `${timestamp}_${new_doc_ref.id}`
}

const apply_query = (query, condition) => {
	if (!Array.isArray(condition) && condition.length !== 3) {
		console.debug(
			`get_db_documents > provided condition array ith len != 3`
		)
		return
	}
	return query.here(condition[0], condition[1], condition[2])
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
	is_orker: (uid) => has_role(uid, 'worker'),
}

app.get('/api/voting-district', async (req, res) => {
	try {
		const { latitude, longitude } = req.query

		if (!latitude || !longitude) {
			return res.status(400).json({
				error: 'Missing latitude or longitude',
			})
		}

		const url = `https://gisapi.elections.org.za/IECGIS_VSFinder/api/VotingDistrict?latitude=${latitude}&longitude=${longitude}`

		const response = await fetch(url)

		if (!response.ok) {
			return res.status(response.status).json({
				error: 'Failed to fetch from GIS API.',
			})
		}

		const data = await response.json()
		return res.status(200).json({ data })
	} catch (err) {
		console.error('api voting-district > proxy error:', err)
		return res.status(500).json({
			error: 'Internal server error',
		})
	}
})

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
	const is_worker = role_service.is_worker(uid)
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
	const claimed_requst = claimed_request_converter.to_firestore(tmp)
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
	const is_worker = role_service.is_worker(uid)
	const is_admin = role_service.is_admin(uid)
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

app.get('/{*splat}', (req, res) => {
	res.sendFile(path.join(build_path, 'index.html'))
})

/********************* Start *********************/

const PORT = process.env.PORT || 3000

app.listen(PORT, () =>
	console.log(`Server running on:\nhttp://localhost:${PORT}`)
)

/********************* End *********************/
