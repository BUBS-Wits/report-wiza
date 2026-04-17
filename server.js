import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { Request } from './src/pages/request/request.js'
import { get_date } from './src/js/utility.js'

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
	.then(() => console.log('Firebase connected.'))
	.catch((err) => console.error('Firebase failed:', err))

/********************* Backend *********************/

app.use(express.json({ limit: '10mb' }))

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

const get_new_doc_id = (collection, now) => {
	const new_doc_ref = db.collection(collection).doc()
	const d = get_date(now)
	const timestamp = `${d.year}${d.month}${d.day}${d.hours}${d.minutes}${d.seconds}`
	return `${timestamp}_${new_doc_ref.id}`
}

const create_service_request = (req, request, now) => {
	const municipality = request.get_municipality()
	return {
		user_id: req.user.uid,
		created_at: now.toUTCString(),
		location: `SRID=4326;POINT(${request.longitude} ${request.latitude})`,
		sa_ward: request.get_ward(),
		sa_m_id: municipality.id,
		sa_m_code: municipality.code,
		sa_m_name: municipality.name,
		status: 'pending',
		category: request.category,
		description: request.description,
		image: request.image,
	}
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
				error: 'Failed to fetch from GIS API',
			})
		}

		const data = await response.json()
		res.status(200).json(data)
	} catch (err) {
		console.error('Proxy error:', err)
		res.status(500).json({
			error: 'Internal server error',
		})
	}
})

app.post('/api/submit-request', authenticate, async (req, res) => {
	try {
		let body
		try {
			body = JSON.parse(JSON.stringify(req.body))
		} catch (err) {
			return res.status(400).json({
				error: 'Unknown body. Failed to parse as JSON.',
			})
		}

		const request = new Request(body)
		if (
			!body ||
			!request.input_validate() ||
			(await !request.image_validate())
		) {
			return res.status(400).json({
				error: 'Missing parameters in request object.',
			})
		}

		const now = new Date(Date.now())
		const new_doc_id = get_new_doc_id('service_requests', now)
		const service_request = create_service_request(req, request, now)

		db.collection('service_requests')
			.doc(new_doc_id)
			.set(service_request)
			.then(() => {
				res.status(200).json(new_doc_id)
			})
			.catch((error) => {
				res.status(400).json(error)
			})
	} catch (err) {
		console.error('Proxy error:', err)
		res.status(500).json({
			error: 'Internal server error',
		})
	}
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
