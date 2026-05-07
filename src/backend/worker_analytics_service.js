import {
	collection,
	query,
	where,
	getDocs,
	doc,
	getDoc,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'
import { STATUS, STATUS_DISPLAY } from '../constants.js'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Verifies if the provided UID belongs to a user with the 'worker' role.
 * Returns the user document snapshot if valid, throws otherwise.
 */
export const verify_worker_and_get_profile = async (uid) => {
	const snap = await getDoc(doc(db, 'users', uid))
	if (!snap.exists()) {
		throw new Error('Not authenticated.')
	}
	if (snap.data().role !== 'worker') {
		throw new Error('Access denied. Worker role required.')
	}
	return snap
}

/**
 * Fetches all request IDs assigned to this worker via the `assignments`
 * collection, then batch-fetches the corresponding `service_requests` docs.
 * Firestore `in` queries are capped at 30 items, so IDs are chunked.
 */
const fetch_assigned_requests = async (worker_uid) => {
	const assignment_snap = await getDocs(
		query(
			collection(db, 'assignments'),
			where('worker_uid', '==', worker_uid)
		)
	)

	if (assignment_snap.empty) {
		return []
	}

	const request_ids = assignment_snap.docs.map((d) => d.data().request_uid)

	// Chunk into groups of 30 (Firestore `in` limit)
	const chunks = []
	for (let i = 0; i < request_ids.length; i += 30) {
		chunks.push(request_ids.slice(i, i + 30))
	}

	const chunk_results = await Promise.all(
		chunks.map((chunk) =>
			getDocs(
				query(
					collection(db, 'service_requests'),
					where('__name__', 'in', chunk)
				)
			)
		)
	)

	const requests = []
	chunk_results.forEach((snap) => {
		snap.docs.forEach((d) => {
			const data = d.data()
			const raw_status = data.status ?? 0
			requests.push({
				id: d.id,
				category: data.category ?? 'Uncategorised',
				description: data.description ?? '',
				ward:
					data.location?.ward_name ??
					(data.sa_ward ? `Ward ${data.sa_ward}` : 'Unknown ward'),
				municipality: data.municipality ?? 'Unknown municipality',
				status: data.status ?? 1,
				priority: data.priority ?? 'Medium',
				assigned_at: data.assigned_at ?? null,
				updated_at: data.updated_at ?? null,
				...(data.resolved_at ? { resolved_at: data.resolved_at } : {}),
			})
		})
	})

	// Sort newest-updated first
	requests.sort((a, b) => {
		const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0
		const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0

		return timeB - timeA
	})

	return requests
}

/* ── Exported functions ──────────────────────────────────────────────────── */

/**
 * Computes summary stats from an array of request objects.
 * Exported separately so it can be unit-tested without Firestore.
 */
export const compute_worker_stats = (requests) => {
	const by_status = (status) => requests.filter((r) => r.status === status)

	const resolved = by_status(STATUS.RESOLVED)

	let avg_resolution_days = 0
	let count = 0
	if (resolved.length > 0) {
		const total_ms = resolved.reduce((sum, r) => {
			if (!r.assigned_at || !r.updated_at) {
				return sum
			}

			const start = new Date(r.assigned_at).getTime()
			const end = new Date(r.updated_at).getTime()

			if (end > start) {
				count++
				return sum + (end - start)
			}

			return sum
		}, 0)

		avg_resolution_days =
			count === 0
				? 0
				: parseFloat(
						(total_ms / count / (1000 * 60 * 60 * 24)).toFixed(1)
					)
		console.debug('Avg. Resolution Days: ' + avg_resolution_days)
	}

	return {
		total: requests.length,
		resolved: resolved.length,
		pending: by_status(STATUS.ASSIGNED).length,
		acknowledged: by_status(STATUS.IN_PROGRESS).length,
		closed: by_status(STATUS.CLOSED).length,
		avg_resolution_days,
	}
}

/**
 * Fetches all dashboard data for a given worker UID.
 * Verifies the worker role, fetches assigned requests, and computes stats.
 */
export const fetch_worker_dashboard_data = async (uid) => {
	const user_snap = await verify_worker_and_get_profile(uid)
	const user_data = user_snap.data()

	const requests = await fetch_assigned_requests(uid)
	const stats = compute_worker_stats(requests)

	return {
		worker: {
			uid,
			name: user_data.name ?? 'Municipal Worker',
			email: user_data.email ?? '',
			role: user_data.role,
		},
		requests,
		stats,
	}
}
