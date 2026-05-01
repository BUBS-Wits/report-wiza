import { Readable } from 'node:stream'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import {
	S3Client,
	ListBucketsCommand,
	PutObjectCommand,
	GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import http from 'http'
import { Request, request_converter } from './backend/request.js'
import {
	ClaimedRequest,
	claimed_request_converter,
} from './backend/claimed_request.js'
import { STATUS } from './backend/constants.js'

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

const db_name = process.env.REACT_APP_FIREBASE_DB_NAME || '(default)'
const db = admin.firestore()
db.settings({
	databaseId: db_name,
})
db.listCollections()
	.then(() => console.log(`Firebase connected using db '${db_name}'.`))
	.catch((err) =>
		console.error(`Firebase failed to connect using db '${db_name}':`, err)
	)

const b2_client = new S3Client({
	endpoint: process.env.B2_ENDPOINT,
	region: process.env.B2_REGION,
	credentials: {
		accessKeyId: process.env.B2_KEY_ID_RO,
		secretAccessKey: process.env.B2_APPLICATION_KEY_RO,
	},
})

b2_client
	.send(new ListBucketsCommand({}))
	.then((response) => {
		console.log('Buckets in BlackBlaze account:')
		if (
			response.Buckets.map((e) => e.Name).indexOf(process.env.B2_BUCKET) <
			0
		) {
			throw new Error(`"${process.env.B2_BUCKET}" bucket not created`)
		}
		response.Buckets.forEach((bucket) => {
			console.log(`\t${bucket.Name}`)
		})
	})
	.catch((err) => {
		console.error('Error listing buckets:', err)
	})
const B2_SIGNED_URL_EXPIRES_IN = 5 * 24 * 60 * 60 // 5 days in seconds

/********************* B2 Backend *********************/

const get_content_type = (data_uri) => {
	return data_uri.split(';')[0].split(':')[1]
}

const b2_get_content_command = (key_name) => {
	return new GetObjectCommand({
		Bucket: process.env.B2_BUCKET,
		Key: key_name,
	})
}

const b2_get_signed_url = (command) => {
	return getSignedUrl(b2_client, command, {
		expiresIn: B2_SIGNED_URL_EXPIRES_IN,
	})
		.then((response) => {
			return { ok: true, value: response }
		})
		.catch((err) => {
			console.error('get_signed_url > error getting signed url:', err)
			return { ok: false, value: err }
		})
}

const b2_key_to_signed_url = (key_name) => {
	const command = b2_get_content_command(key_name)
	return b2_get_signed_url(command)
}

const b2_upload_data_uri = (data_uri, key_name) => {
	const base64Content = data_uri.split(',')[1]
	const buffer = Buffer.from(base64Content, 'base64')
	const file_stream = Readable.from(buffer)

	const mime_type = get_content_type(data_uri)

	return b2_client
		.send(
			new PutObjectCommand({
				Bucket: process.env.B2_BUCKET,
				Key: key_name,
				Body: file_stream,
				ContentType: mime_type,
				ContentLength: buffer.length,
			})
		)
		.then((response) => {
			console.log(
				`upload_file > uploaded (${buffer.length} bytes): ${JSON.stringify(response, null, 2)}`
			)
			return { ok: true, value: response }
		})
		.catch((err) => {
			console.error('upload_file > error uploading file:', err)
			return { ok: false, value: err }
		})
}

const b2_get_content = (key_name) => {
	return b2_client
		.send(b2_get_content_command(key_name))
		.then((response) => {
			return { ok: true, value: response }
		})
		.catch((err) => {
			console.error('b2_get_content > error getting file:', err)
			return { ok: false, value: err }
		})
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
			req.user = null // anonymous — allowed through
			return next()
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

const update_db_document = (collection, doc_id, fields) => {
	const replacements = {}
	for (const field of fields) {
		replacements[field[0]] = field[1]
	}
	return db
		.collection(collection)
		.doc(doc_id)
		.update(replacements)
		.then(() => {
			return { ok: true, value: doc_id }
		})
		.catch((error) => {
			return { ok: false, value: error }
		})
}

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

		if (!body || !body.image || !/^data:/.test(body.image)) {
			return respond.invalid_parameters(res)
		}

		let image = body.image
		body.image = ''

		const tmp = new Request(body)
		if (!tmp.input_validate()) {
			return respond.invalid_parameters(res)
		}

		const user_uid = req.user?.uid ?? null

		const service_request = request_converter.to_firestore(
			user_uid,
			tmp,
			new Date(Date.now()),
			new Date(Date.now()),
			STATUS.SUBMITTED
		)

		const doc_result = await create_db_document(
			'service_requests',
			service_request
		)
		if (!doc_result.ok) {
			console.error(doc_result.value)
			return res.status(500).json({ error: 'Failed to save request.' })
		}
		let ret = await b2_upload_data_uri(image, doc_result.value)
		if (!ret.ok) {
			console.error(ret.value)
			await delete_db_document('service_requests', doc_result.value)
			return res.status(500).json({ error: 'Failed to upload image.' })
		}
		const mime_type = get_content_type(image)
		const key_name = doc_result.value
		ret = await b2_key_to_signed_url(key_name)
		if (!ret.ok) {
			console.error(ret.value)
			await delete_db_document('service_requests', doc_result.value)
			return res
				.status(500)
				.json({ error: `Failed to get signed url of "${key_name}"` })
		}
		ret = await update_db_document('service_requests', doc_result.value, [
			['image', ret.value],
		])
		if (!ret.ok) {
			console.error(ret.value)
			await delete_db_document('service_requests', doc_result.value)
			return res.status(500).json({ error: 'Failed to save signed url.' })
		}
		return res.status(200).json({ data: doc_result.value })
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

		if (await exists_db_document('assignments', request_uid)) {
			return res.status(201).json({
				data: 'Request already claimed in db.',
			})
		}
		const tmp2 = new ClaimedRequest(request_uid, uid)
		const claimed_request = claimed_request_converter.to_firestore(tmp2)
		const ret = await set_db_document(
			'assignments',
			request_uid,
			claimed_request
		)
		if (!ret.ok) {
			return res.status(400).json({ error: ret.value })
		}
		const ret2 = await update_db_document('service_requests', request_uid, [
			['status', STATUS.ASSIGNED],
			['updated_at', new Date().toUTCString()],
			['assigned_at', new Date().toUTCString()],
		])
		if (!ret2.ok || ret2.value === null) {
			return res.status(400).json({
				error: ret2.value,
				dd: 'Created assignment but failed to change status',
			})
		}
		return res.status(200).json({ data: ret.value })
	} catch (err) {
		console.error('Database error:', err)
		res.status(500).json({ error: 'Internal server error' })
	}
})

/* /api/get-requests?all={true|false} */
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
				created_at: data.created_at,
				updated_at: data.updated_at,
				status: data.status,
				category: data.category,
				description: data.description,
				image: data.image,
				location: data.location,
				sa_ward: data['sa_ward'],
				sa_m_name: data['sa_m_name'],
				sa_province: data['sa_province'],
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
		const ret = await get_db_documents('service_requests', [])
		if (!ret.ok) {
			return res.status(400).json({ error: ret.value })
		}
		const requests = []
		for (const doc of ret.value) {
			if (await exists_db_document('assignments', doc.id)) {
				continue
			}
			requests.push({
				id: doc.id,
				created_at: doc.created_at,
				updated_at: doc.updated_at,
				status: doc.status,
				category: doc.category,
				description: doc.description,
				image: doc.image,
				location: doc.location,
				sa_ward: doc['sa_ward'],
				sa_m_name: doc['sa_m_name'],
				sa_province: doc['sa_province'],
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

// Bug 2 Fix: Increase header limit for Azure proxy and Firebase JWT headers
const server = http.createServer({ maxHeaderSize: 32768 }, app)

server.listen(PORT, () =>
	console.log(`Server running on:\nhttp://localhost:${PORT}`)
)

/********************* End *********************/
