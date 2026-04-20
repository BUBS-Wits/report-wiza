import {
	collection,
	query,
	where,
	getDocs,
	doc,
	getDoc,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'

/**
 * Verifies if the provided UID belongs to a user with the 'worker' role.
 */
export const verify_worker = async (uid) => {
	const user_doc = await getDoc(doc(db, 'users', uid))
	return user_doc.exists() && user_doc.data().role === 'worker'
}

/**
 * Computes summary stats from an array of request documents.
 */
export const compute_worker_stats = (requests) => {
	const by_status = (status) => requests.filter((r) => r.status === status)

	const resolved = by_status('Resolved')
	const pending = by_status('Pending')
	const acknowledged = by_status('Acknowledged')
	const closed = by_status('Closed')

	let avg_resolution_days = 0
	if (resolved.length > 0) {
		const total_ms = resolved.reduce((sum, r) => {
			const assigned = r.assignedAt?.toMillis?.() ?? 0
			const resolved_at =
				r.resolvedAt?.toMillis?.() ?? r.updatedAt?.toMillis?.() ?? 0
			return sum + Math.max(0, resolved_at - assigned)
		}, 0)

		// Convert milliseconds to days
		avg_resolution_days = parseFloat(
			(total_ms / resolved.length / (1000 * 60 * 60 * 24)).toFixed(1)
		)
	}

	return {
		total: requests.length,
		resolved: resolved.length,
		pending: pending.length,
		acknowledged: acknowledged.length,
		closed: closed.length,
		avg_resolution_days,
	}
}

/**
 * Fetches all assigned requests for a worker, aggregates stats,
 * and returns the payload to the frontend.
 */
export const fetch_worker_dashboard_data = async (uid) => {
	// 1. Verify the user has the worker role
	const is_worker = await verify_worker(uid)
	if (!is_worker) {
		throw new Error('Access denied. Worker role required.')
	}

	const user_doc = await getDoc(doc(db, 'users', uid))
	const user_data = user_doc.data()

	// 2. Fetch all requests assigned to this worker
	const requests_ref = collection(db, 'serviceRequests')
	const q = query(requests_ref, where('assignedTo', '==', uid))
	const snapshot = await getDocs(q)

	const requests = snapshot.docs.map((d) => {
		const data = d.data()
		return {
			id: d.id,
			category: data.category ?? 'Uncategorised',
			description: data.description ?? '',
			ward: data.ward ?? 'Unknown ward',
			municipality: data.municipality ?? 'Unknown municipality',
			status: data.status ?? 'Pending',
			priority: data.priority ?? 'Medium',
			assignedAt: data.assignedAt ?? null,
			updatedAt: data.updatedAt ?? null,
			...(data.resolvedAt ? { resolvedAt: data.resolvedAt } : {}),
		}
	})

	// 3. Sort requests by updatedAt descending (handled client-side to avoid index requirements)
	requests.sort((a, b) => {
		const time_a = a.updatedAt?.toMillis?.() ?? 0
		const time_b = b.updatedAt?.toMillis?.() ?? 0
		return time_b - time_a
	})

	// 4. Compute aggregate stats
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
