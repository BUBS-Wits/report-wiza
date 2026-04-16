import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

/********************* Setup *********************/

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/********************* Backend *********************/

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

/********************* Frontend *********************/

const build_path = path.resolve(path.join(__dirname, '../build'))
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
