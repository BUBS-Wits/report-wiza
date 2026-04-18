import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { Request } from './src/pages/request/request.js'
import { get_date } from './src/utility.js'

/********************* Setup *********************/

// 1. ALL imports must be at the top of the file!
import gis_routes from './src/backend/routes/gis_routes.js'
import analytics_routes from './src/backend/routes/analytics_routes.js'

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

// 2. Mount your APIs
app.use('/api', gis_routes)
app.use('/api/analytics', analytics_routes)

// 3. Fallback for React Router
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

/********************* Start *********************/

const PORT = process.env.PORT || 3000

app.listen(PORT, () =>
    console.log(`Server running on:\nhttp://localhost:${PORT}`)
)

/********************* End *********************/
