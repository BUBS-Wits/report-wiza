import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase_config.js'

/**
 * Fetches all users with the 'worker' role.
 * @returns {Promise<Array>} Array of worker objects.
 */
export async function fetch_all_workers() {
	try {
		const users_ref = collection(db, 'users')
		const q = query(users_ref, where('role', '==', 'worker'))
		const snapshot = await getDocs(q)

		const workers = []
		snapshot.forEach((doc) => {
			workers.push({
				uid: doc.id,
				...doc.data(),
			})
		})

		return workers
	} catch (error) {
		console.error('Error fetching workers:', error)
		throw error
	}
}

/**
 * Fetches and calculates performance metrics for a specific worker.
 * @param {string} worker_uid - The UID of the worker.
 * @returns {Promise<Object>} The performance statistics.
 */
export async function fetch_worker_performance(worker_uid) {
	try {
		const requests_ref = collection(db, 'service_requests')
		const q = query(
			requests_ref,
			where('assigned_worker_uid', '==', worker_uid)
		)
		const snapshot = await getDocs(q)

		let total_assigned = 0
		let total_resolved = 0
		let total_resolution_time_ms = 0

		snapshot.forEach((doc) => {
			const data = doc.data()
			total_assigned++

			// Normalise to lowercase so 'RESOLVED', 'Resolved', and 'resolved'
			// are all treated identically — Firestore documents may be written
			// with any casing depending on the client that created them.
			const status = (data.status ?? '').toLowerCase()

			if (status === 'resolved' || status === 'closed') {
				total_resolved++

				// Calculate resolution time if timestamps exist
				if (data.created_at && data.resolved_at) {
					const created = data.created_at.toMillis()
					const resolved = data.resolved_at.toMillis()
					total_resolution_time_ms += Math.max(0, resolved - created)
				}
			}
		})

		const avg_resolution_hours =
			total_resolved > 0
				? total_resolution_time_ms / total_resolved / (1000 * 60 * 60)
				: null

		return {
			worker_uid,
			total_assigned,
			total_resolved,
			active_tasks: total_assigned - total_resolved,
			avg_resolution_hours: avg_resolution_hours
				? parseFloat(avg_resolution_hours.toFixed(2))
				: 0,
			completion_rate:
				total_assigned > 0
					? Math.round((total_resolved / total_assigned) * 100)
					: 0,
		}
	} catch (error) {
		console.error(
			`Error calculating performance for worker ${worker_uid}:`,
			error
		)
		throw error
	}
}

/**
 * Aggregates performance data for all workers to feed the Admin Dashboard.
 * @returns {Promise<Array>} Array of worker performance objects.
 */
export async function fetch_aggregate_worker_performance() {
	try {
		const workers = await fetch_all_workers()

		// Fetch stats for each worker concurrently
		const performance_promises = workers.map(async (worker) => {
			const stats = await fetch_worker_performance(worker.uid)
			return {
				...worker,
				...stats,
			}
		})

		const results = await Promise.all(performance_promises)

		// Sort by completion rate descending by default
		return results.sort((a, b) => b.completion_rate - a.completion_rate)
	} catch (error) {
		console.error('Error fetching aggregate worker performance:', error)
		throw error
	}
}
