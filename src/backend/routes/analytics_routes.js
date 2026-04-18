import express from 'express'
import { db } from '../server_db.js'
const router = express.Router()
const REQUEST_CATEGORIES = [
	'potholes',
	'water',
	'electricity',
	'roads',
	'sanitation',
] // Update to match yours
const PENDING_STATUSES = ['pending']
const IN_PROGRESS_STATUSES = ['in_progress', 'acknowledged']
const RESOLVED_STATUSES = ['resolved']

// Math helpers
const compute_avg_hours = (resolved_requests) => {
	if (resolved_requests.length === 0) return null

	const total_ms = resolved_requests.reduce((sum, r) => {
		// Firebase Admin uses _seconds and _nanoseconds for timestamps
		const created = r.created_at ? r.created_at.toDate().getTime() : 0
		const updated = r.updated_at ? r.updated_at.toDate().getTime() : 0
		return sum + Math.max(0, updated - created)
	}, 0)

	return total_ms / resolved_requests.length / (1000 * 60 * 60)
}

// API Endpoint: GET /api/analytics/category-report
router.get('/category-report', async (req, res) => {
	try {
		const { uid } = req.query

		if (!uid) return res.status(401).json({ error: 'Unauthorized' })

		// 1. Verify Admin Status securely on the server
		const user_doc = await db.collection('users').doc(uid).get()
		if (!user_doc.exists || user_doc.data().role !== 'admin') {
			return res.status(403).json({ error: 'Forbidden: Admins only' })
		}

		// 2. Fetch all requests
		const snapshot = await db.collection('service_requests').get()
		const all_requests = snapshot.docs.map((d) => ({
			id: d.id,
			...d.data(),
		}))

		// 3. Build Stats
		const stats = REQUEST_CATEGORIES.map((category) => {
			const cat_requests = all_requests.filter(
				(r) => r.category === category
			)
			const pending = cat_requests.filter((r) =>
				PENDING_STATUSES.includes(r.status)
			)
			const in_progress = cat_requests.filter((r) =>
				IN_PROGRESS_STATUSES.includes(r.status)
			)
			const resolved = cat_requests.filter((r) =>
				RESOLVED_STATUSES.includes(r.status)
			)

			return {
				category,
				total: cat_requests.length,
				pending: pending.length,
				in_progress: in_progress.length,
				resolved: resolved.length,
				avg_hours: compute_avg_hours(resolved),
			}
		})

		// 4. Compute Summary
		const total_resolved = stats.reduce((s, r) => s + r.resolved, 0)
		const total_pending = stats.reduce((s, r) => s + r.pending, 0)
		const categories_with_avg = stats.filter((r) => r.avg_hours !== null)
		const overall_avg_hours =
			categories_with_avg.length > 0
				? categories_with_avg.reduce((s, r) => s + r.avg_hours, 0) /
					categories_with_avg.length
				: null
		const worst_backlog =
			[...stats].sort((a, b) => b.pending - a.pending)[0] ?? null

		// 5. Send clean JSON back to React
		res.status(200).json({
			stats,
			total_requests: all_requests.length,
			summary: {
				total_resolved,
				total_pending,
				overall_avg_hours,
				worst_backlog:
					worst_backlog?.pending > 0 ? worst_backlog : null,
			},
		})
	} catch (err) {
		console.error('Analytics Error:', err)
		res.status(500).json({ error: 'Internal server error' })
	}
})

export default router
