import {
	collection,
	query,
	where,
	getDocs,
	doc,
	getDoc,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'

/* ── Constants ───────────────────────────────────────────────────────────── */

// Normalise Firestore status strings to display form
const NORMALISE_STATUS = {
	OPEN: 'Pending',
	PENDING: 'Pending',
	ACKNOWLEDGED: 'Acknowledged',
	IN_PROGRESS: 'Acknowledged',
	RESOLVED: 'Resolved',
	CLOSED: 'Closed',
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Verifies if the provided UID belongs to a user with the 'worker' role.
 * Returns the user document snapshot if valid, throws otherwise.
 */
const verify_worker_and_get_profile = async (uid) => {
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
			const raw_status = String(data.status ?? '').toUpperCase()
			requests.push({
				id: d.id,
				category: data.category ?? 'Uncategorised',
				description: data.description ?? '',
				ward:
					data.location?.ward_name ??
					(data.sa_ward ? `Ward ${data.sa_ward}` : 'Unknown ward'),
				municipality: data.municipality ?? 'Unknown municipality',
				status: NORMALISE_STATUS[raw_status] ?? 'Pending',
				priority: data.priority ?? 'Medium',
				assignedAt: data.assigned_at ?? null,
				updatedAt: data.updated_at ?? null,
				...(data.resolved_at ? { resolvedAt: data.resolved_at } : {}),
			})
		})
	})

	// Sort newest-updated first
	requests.sort((a, b) => {
		const ts = (t) => t?.toMillis?.() ?? 0
		return ts(b.updatedAt) - ts(a.updatedAt)
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

	const resolved = by_status('Resolved')

	let avg_resolution_days = 0
	if (resolved.length > 0) {
		const total_ms = resolved.reduce((sum, r) => {
			const assigned = r.assignedAt?.toMillis?.() ?? 0
			const resolved_at =
				r.resolvedAt?.toMillis?.() ?? r.updatedAt?.toMillis?.() ?? 0
			return sum + Math.max(0, resolved_at - assigned)
		}, 0)

		avg_resolution_days = parseFloat(
			(total_ms / resolved.length / (1000 * 60 * 60 * 24)).toFixed(1)
		)
	}

	return {
		total: requests.length,
		resolved: resolved.length,
		pending: by_status('Pending').length,
		acknowledged: by_status('Acknowledged').length,
		closed: by_status('Closed').length,
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
