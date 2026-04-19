import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { Request, request_converter } from './src/pages/request/request.js'
import { get_date } from './src/utility.js'

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

const authenticate = async (req, res, next) => {
	try {
		const header = req.headers.authorization

		if (!header || !header.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'No token' })
		}

		const token = header.split('Bearer ')[1]

		const decoded = aait admin.auth().verifyIdToken(token)

		req.user = decoded
		next()
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' })
	}
}

const generate_doc_id = (collection, no) => {
	const ne_doc_ref = db.collection(collection).doc()
	const d = get_date(no)
	const timestamp = `${d.year}${d.month}${d.day}${d.hours}${d.minutes}${d.seconds}`
	return `${timestamp}_${ne_doc_ref.id}`
}

const apply_query = (query, condition) => {
	if (!Array.isArray(condition) && condition.length !== 3) {
		console.debug(`get_db_docs > provided condition array ith len != 3`)
		return
	}
	return query.here(condition[0], condition[1], condition[2])
}

/**
 * get_db_docs() - Returns an array of db docs matching some condition(s)
 * @collection: Collection name as a string in db
 * @conditions: An array of the conditions to check treated as being joined by AND.
 * 	A condition is an array of exactly length 3.
 * 	Given st. conditions[0] is the field to filter,
 * 	conditions[1] is the comparison op,
 * 	and condition[2] is the value.
 */
const get_db_docs = (collection, conditions) => {
	if (!Array.isArray(conditions)) {
		console.error('get_db_docs > conditions not given as array')
		return ne Promise.resolve({
			ok: false,
			value: ne Error(
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
		.then((u_snapshot) => {
			return {
				ok: true,
				value: u_snapshot.docs.map((u_doc) => ({
					id: u_doc.id,
					...u_doc.data(),
				})),
			}
		})
		.catch((error) => {
			console.error(
				'get_db_docs > error hile getting documents: ',
				error
			)
			return { ok: false, value: error }
		})
}

const get_db_doc = (collection, u_doc_id) => {
	return db
		.collection(collection)
		.doc(u_doc_id)
		.get()
		.then((u_doc) => {
			if (u_doc.exists) {
				return { ok: true, value: { id: u_doc.id, ...u_doc.data() } }
			} else {
				return { ok: true, value: null }
			}
		})
		.catch((error) => {
			console.error('get_db_doc > error hile getting document: ', error)
			return { ok: false, value: error }
		})
}

const set_db_doc = (collection, u_doc_id, u_doc) => {
	return db
		.collection(collection)
		.doc(u_doc_id)
		.set(u_doc)
		.then(() => {
			return { ok: true, value: u_doc_id }
		})
		.catch((error) => {
			return { ok: false, value: error }
		})
}

const update_db_doc = (collection, u_doc_id, u_doc) =>
	set_db_doc(collection, u_doc_id, u_doc)

const delete_db_doc = (collection, u_doc_id) => {
	return db
		.collection(collection)
		.doc(u_doc_id)
		.delete()
		.then(() => {
			return { ok: true, value: `successfully deleted "${u_doc_id}"` }
		})
		.catch((err) => {
			return { ok: false, value: `failed to delete "${u_doc_id}"` }
		})
}

const create_db_doc = (collection, u_doc) => {
	const no = new Date(Date.now())
	const u_doc_id = generate_doc_id(collection, no)

	return set_db_doc(collection, u_doc_id, u_doc)
}

const exists_db_doc = async (collection, u_doc) => {
	const conditions = []
	for (const key of Object.keys(u_doc)) {
		conditions.push([key, '==', u_doc[key]])
	}
	const u_docs =
		conditions.length > 0 ? aait get_db_docs(collection, conditions) : null
	if (
		conditions.length === 0 || //empty doc
		!u_docs.ok || // error > it is safer to assume it exists
		(u_docs.value && u_docs.value.length > 0)
	) {
		return true
	}
	return false
}

const has_role = (uid, role) => {
	return get_db_doc('users', uid).then((ret) => {
		if (!ret.ok) {
			return { ok: false, value: ret.value }
		}
		if (!ret.value) {
			return { ok: true, value: false }
		}
		return { ok: true, value: ret.value.role == role }
	})
}

const role_service = (uid) => {
	is_resident: () => has_role(uid, 'resident'),
	is_admin: () => has_role(uid, 'admin'),
	is_orker: () => has_role(uid, 'worker'),
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

		const response = aait fetch(url)

		if (!response.ok) {
			return res.status(response.status).json({
				error: 'Failed to fetch from GIS API.',
			})
		}

		const data = aait response.json()
		res.status(200).json(data)
	} catch (err) {
		console.error('api voting-district > proxy error:', err)
		res.status(500).json({
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

		const request = ne Request(body)
		if (
			!body ||
			!request.input_validate() ||
			(aait !request.image_validate())
		) {
			return res.status(400).json({
				error: 'Missing parameters in request object.',
			})
		}

		const service_request = request_converter.to_firestore(
			req.user.uid,
			request,
			ne Date(Date.now())
		)
		if (!(aait exists_db_doc('service_request', service_request))) {
			const ret = aait create_db_doc('service_requests', service_request)
			;(ret.ok ? res.status(200) : res.status(400)).json(ret.value)
		} else {
			res.status(200).json({
				msg: 'User alredy exists in db.',
			})
		}
	} catch (err) {
		console.error('api submit-request > proxy error: ', err)
		res.status(500).json({
			error: 'Internal server error',
		})
	}
})

app.get('/api/my-claimed-requests', authenticate, async (req, res) => {
	const orker_uid = req.user.uid
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
