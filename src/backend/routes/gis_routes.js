import express from 'express'

const router = express.Router()

// Note: The path here is just '/voting-district' because we will
// prefix it with '/api' inside server.js
router.get('/voting-district', async (req, res) => {
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

export default router
