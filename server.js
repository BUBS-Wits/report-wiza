import { Readable } from 'node:stream'
import express from 'express'
import rate_limit from 'express-rate-limit'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import {
	S3Client,
	ListBucketsCommand,
	PutObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
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
		console.log('Buckets in BackBlaze account:')
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

const get_file_hash = (buffer) => {
	// Strip metadata so the same photo taken twice hashes identically
	// const normalized = await sharp(buffer).toBuffer();
	return crypto.createHash('sha256').update(buffer).digest('hex')
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
const b2_check_exists = (key) => {
	return b2_client
		.send(
			new HeadObjectCommand({
				Bucket: process.env.B2_BUCKET,
				Key: key,
			})
		)
		.then((response) => {
			return { ok: true, value: response }
		})
		.catch((err) => {
			if (
				err.name !== 'NotFound' &&
				err['$metadata']?.httpStatusCode !== 404
			) {
				console.error(
					`b2_check_exists > error checking existance: `,
					err
				)
			}
			return { ok: false, value: err }
		})
}

const b2_key_to_signed_url = (key_name) => {
	const command = b2_get_content_command(key_name)
	return b2_get_signed_url(command)
}

const b2_upload_data_uri = async (data_uri, key_name) => {
	const base64Content = data_uri.split(',')[1]
	const buffer = Buffer.from(base64Content, 'base64')
	const file_stream = Readable.from(buffer)

	const mime_type = get_content_type(data_uri)
	const hash = get_file_hash(buffer)
	const tmp = await b2_check_exists(hash)
	if (tmp.ok) {
		/*
		console.log(
			`upload_file > already exists (${hash}): ${JSON.stringify(tmp.value, null, 2)}`
		)
		*/
		return { ok: true, value: hash }
	}

	return b2_client
		.send(
			new PutObjectCommand({
				Bucket: process.env.B2_BUCKET,
				Key: hash,
				Body: file_stream,
				ContentType: mime_type,
				ContentLength: buffer.length,
			})
		)
		.then((response) => {
			/*
			console.log(
				`upload_file > uploaded (${buffer.length} bytes): ${JSON.stringify(response, null, 2)}`
			)
			*/
			return { ok: true, value: hash }
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

const b2_get_expiry_from_signed_url = (signed_url) => {
	let url
	let date
	let expires_in
	try {
		url = new URL(signed_url)
		date = url.searchParams.get('X-Amz-Date')
		expires_in = url.searchParams.get('X-Amz-Expires')
		if (!date || !expires_in) {
			throw new Error()
		}
	} catch (err) {
		return new Date(0)
	}

	const created = new Date(
		date.replace(
			/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
			'$1-$2-$3T$4:$5:$6Z'
		)
	)
	return new Date(created.getTime() + parseInt(expires_in) * 1000)
}

const b2_is_expired = (expires_at) => {
	const expiry = expires_at
	const now = new Date()
	const buffer_ms = 5 * 60 * 1000

	return expiry.getTime() - now.getTime() < buffer_ms
}

const b2_refresh_signed_url = async (
	image_hash,
	image_url,
	expires = undefined
) => {
	let expires_at = expires
	if (expires === undefined || expires === null) {
		expires_at = b2_get_expiry_from_signed_url(image_url)
	}
	if (b2_is_expired(expires_at)) {
		let new_signed_url = await b2_key_to_signed_url(image_hash)
		if (!new_signed_url.ok) {
			return {}
		}
		new_signed_url = new_signed_url.value
		const expires_at = new Date(
			Date.now() + B2_SIGNED_URL_EXPIRES_IN * 1000
		)
		return { new_signed_url, expires_at }
	}
	return {}
}

/********************* Backend *********************/

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

const respond = {
	unauthorized: (res) =>
		res.status(400).json({ error: 'Unauthorized access to API endpoint.' }),
	invalid_parameters: (res) =>
		res.status(400).json({ error: 'Invalid parameters provided.' }),
}

// STRICT AUTH: For Admin and Worker routes (Requires Token)
const authenticate = async (req, res, next) => {
	try {
		const header = req.headers.authorization

		if (!header || !header.startsWith('Bearer ')) {
			return res
				.status(401)
				.json({ error: 'Unauthorized access to API endpoint.' })
		}

		const token = header.split('Bearer ')[1]
		const decoded = await admin.auth().verifyIdToken(token)

		req.user = decoded
		next()
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' })
	}
}

// OPTIONAL AUTH: For public submission form (Allows Anonymous)
const authenticate_optional = async (req, res, next) => {
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

/********************* Backend Spam *********************/

const limiter = rate_limit({
	windowMs: 10 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many submissions, please try again later.' },
})

const entropy_check = (string, threshold = 0.9) => {
	const character_dictionary = {}
	let space_count = 0
	const lower = string.toLowerCase()

	for (const chr of lower) {
		if (chr === ' ') {
			space_count++
			continue
		}
		character_dictionary[chr] = (character_dictionary[chr] ?? 0) + 1
	}

	// The more spaces you have, the better in long strings as that makes it more likely to be a coherent sentence
	// Note, string.length >= space_count in all cases.
	// The smaller the ratio of string length to spaces, the higher the space_multiplier which benefits the frequency_total
	let space_multiplier =
		space_count > 0
			? 1.0 / (1 + Math.log(1 + string.length / (space_count + 1)))
			: 1.0 / string.length

	space_multiplier = Math.max(0.3, space_multiplier)

	let frequency_total = 0
	// Entropy = -1 * Sum(p * log_{2}{p}) = Sum(-1 * p * log_{2}{p})
	for (const chr in character_dictionary) {
		let p = character_dictionary[chr] / string.length
		let frequency = -1 * p * (Math.log(p) / Math.log(2))
		frequency_total += frequency
	}

	frequency_total *= space_multiplier

	return frequency_total < threshold ? false : true
}

function repetition_check(string) {
	const words = string.toLowerCase().split(/\s+/).filter(Boolean)
	const unique = new Set(words)
	const unique_ratio = unique.size / words.length

	return unique_ratio < 0.5 ? false : true
}

const spam_middleware = (req, res, next) => {
	const body = req.body
	if (!body || !body.description) {
		return respond.invalid_parameters(res)
	}
	const description = body.description
	const is_ham = entropy_check(description, 0.9)
	const is_unique = repetition_check(description)
	if (!is_ham || !is_unique) {
		console.debug(
			`Possible Spam Rejected: '${description.replace("'", "\\'")}'`
		)
		return res.status(400).json({
			error: 'Invalid description. Rejected due to the possibility of being spam.',
			cause: !is_ham ? 'entropy' : 'repetition',
		})
	}
	next()
}

/********************* Backend Routes *********************/

app.post(
	'/api/submit-request',
	limiter,
	authenticate,
	spam_middleware,
	async (req, res) => {
		try {
			const user_uid = req.user.uid
			const is_resident = await role_service.is_resident(user_uid)
			if (!is_resident.ok) {
				return res.status(400).json({ error: 'Failed to get role.' })
			}
			if (!is_resident.value) {
				return respond.unauthorized(res)
			}

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
				return res
					.status(500)
					.json({ error: 'Failed to save request.' })
			}
			let ret = await b2_upload_data_uri(image, doc_result.value)
			if (!ret.ok) {
				console.error(ret.value)
				await delete_db_document('service_requests', doc_result.value)
				return res
					.status(500)
					.json({ error: 'Failed to upload image.' })
			}
			const mime_type = get_content_type(image)
			const key_name = ret.value
			ret = await b2_key_to_signed_url(key_name)
			if (!ret.ok) {
				console.error(ret.value)
				await delete_db_document('service_requests', doc_result.value)
				return res.status(500).json({
					error: `Failed to get signed url of "${key_name}".`,
				})
			}
			ret = await update_db_document(
				'service_requests',
				doc_result.value,
				[
					['image_hash', key_name],
					['image', ret.value],
					[
						'image_expires_at',
						new Date(
							Date.now() + B2_SIGNED_URL_EXPIRES_IN * 1000
						).toUTCString(),
					],
				]
			)
			if (!ret.ok) {
				console.error(ret.value)
				await delete_db_document('service_requests', doc_result.value)
				return res
					.status(500)
					.json({ error: 'Failed to save signed url.' })
			}
			return res.status(200).json({ data: doc_result.value })
		} catch (err) {
			console.error('Database error:', err)
			res.status(500).json({ error: 'Internal server error' })
		}
	}
)

app.get('/api/claim-request', authenticate, async (req, res) => {
	try {
		const uid = req.user.uid
		const is_worker = await role_service.is_worker(uid)
		if (!is_worker.ok) {
			return res.status(400).json({ error: 'Failed to get role.' })
		}
		if (!is_worker.value) {
			return respond.unauthorized(res)
		}
		const request_uid = req.query.request_uid
		if (!request_uid || Object.keys(req.query).length !== 1) {
			return respond.invalid_parameters(res)
		}

		if (await exists_db_document('assignments', request_uid)) {
			return res.status(401).json({
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
			return res.status(500).json({
				error: 'Failed to assign request.',
				dd: ret.value,
			})
		}
		const ret2 = await update_db_document('service_requests', request_uid, [
			['status', STATUS.ASSIGNED],
			['updated_at', new Date().toUTCString()],
			['assigned_at', new Date().toUTCString()],
		])
		if (!ret2.ok || ret2.value === null) {
			return res.status(500).json({
				error: 'Created assignment but failed to change status.',
				dd: ret2.value,
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
			return res.status(400).json({
				error: 'Failed to get requests.',
				dd: ret.value,
			})
		}
		for (const tmp of ret.value) {
			const url = await b2_refresh_signed_url(
				tmp.image_hash,
				tmp.image,
				tmp.image_expires_at
			)
			if (url.expires_at) {
				await update_db_document('service_requests', tmp.id, [
					['image', url.new_signed_url],
					['image_expires_at', url.expires_at.toUTCString()],
				])
				tmp.image = url.new_signed_url
			}
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
			return res.status(500).json({ error: 'Failed to get role.' })
		}
		if (!is_worker.value && !is_admin.value) {
			return respond.unauthorized(res)
		}
		let conditions = is_admin.value ? [] : [['worker_uid', '==', uid]]
		let ret = await get_db_documents('assignments', conditions)
		if (!ret.ok) {
			return res.status(400).json({
				error: 'Failed to get assignments.',
				dd: ret.value,
			})
		}
		const claimed_requests = []
		for (const doc of ret.value) {
			const iret = await get_db_document(
				'service_requests',
				doc.request_uid
			)
			if (!iret.ok) {
				return res.status(400).json({
					error: 'Failed to get request.',
					dd: ret.value,
				})
			}
			const data = iret.value
			if (data === null) {
				continue
			}
			const url = await b2_refresh_signed_url(
				data.image_hash,
				data.image,
				data.image_expires_at
			)
			if (url.expires_at) {
				await update_db_document('service_requests', data.id, [
					['image', url.new_signed_url],
					['image_expires_at', url.expires_at.toUTCString()],
				])
				data.image = url.new_signed_url
			}
			claimed_requests.push({
				id: data.id,
				created_at: data.created_at,
				updated_at: data.updated_at,
				status: data.status,
				comment: data.comment,
				rating: data.rating,
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
			return res.status(500).json({ error: 'Failed to get role.' })
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
			const url = await b2_refresh_signed_url(
				doc.image_hash,
				doc.image,
				doc.image_expires_at
			)
			if (url.expires_at) {
				await update_db_document('service_requests', doc.id, [
					['image', url.new_signed_url],
					['image_expires_at', url.expires_at.toUTCString()],
				])
				doc.image = url.new_signed_url
			}
			requests.push({
				id: doc.id,
				created_at: doc.created_at,
				updated_at: doc.updated_at,
				status: doc.status,
				comment: doc.comment,
				rating: doc.rating,
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

app.get('/api/get-signed-url', async (req, res) => {
	try {
		const request_uid = req.query.request_uid
		if (!request_uid || Object.keys(req.query).length !== 1) {
			return respond.invalid_parameters(res)
		}
		const iret = await get_db_document('service_requests', request_uid)
		if (!iret.ok) {
			return res.status(400).json({ error: iret.value })
		}
		const data = iret.value
		if (data === null) {
			return res
				.status(400)
				.json({ error: 'Failed to get requested service request.' })
		}
		const url = await b2_refresh_signed_url(
			data.image_hash,
			data.image,
			data.image_expires_at ? new Date(data.image_expires_at) : undefined
		)
		if (url.expires_at) {
			await update_db_document('service_requests', data.id, [
				['image', url.new_signed_url],
				['image_expires_at', url.expires_at.toUTCString()],
			])
			return res.status(200).json({ data: url.new_signed_url })
		}
		return res.status(400).json({
			error: "Failed to get requested service request's signed url.",
		})
	} catch (err) {
		console.error('Database error:', err)
		res.status(500).json({ error: 'Internal server error' })
	}
})

app.post('/api/submit-review', authenticate, async (req, res) => {
	try {
		const body = req.body
		if (
			body === undefined ||
			body.comment === undefined ||
			body.rating === undefined ||
			body.request_uid === undefined ||
			!(await exists_db_document('service_requests', body.request_uid))
		) {
			return respond.invalid_parameters(res)
		}
		const request_uid = body.request_uid
		const comment = body.comment
		const rating = body.rating
		const user_uid = req.user.uid
		let iret = await get_db_documents('service_requests', [
			['__name__', '==', request_uid],
			['user_uid', '==', user_uid],
		])
		if (!iret.ok) {
			return res.status(400).json({ error: iret.value })
		}
		let data = iret.value
		if (data === null || data.length <= 0) {
			return res
				.status(400)
				.json({ error: 'Failed to get requested service request.' })
		}
		data = data[0]
		if (data.status !== STATUS.CLOSED || data.status !== STATUS.RESOLVED) {
			return res.status(400).json({
				error: 'Request selected has not been closed as complete.',
				dd: data[0],
			})
		}
		iret = await update_db_document('service_requests', data.id, [
			['updated_at', new Date().toUTCString()],
			['comment', comment],
			['rating', rating],
		])
		if (!iret.ok) {
			return res.status(400).json({ error: iret.value })
		}
		return res.status(200).json({ data: request_uid })
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
