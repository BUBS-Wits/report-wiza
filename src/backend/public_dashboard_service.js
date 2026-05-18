import { db } from '../firebase_config.js'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { parseLocation } from '../utils/parse_location.js'

// Statuses treated as "active" — all lowercase to match normalised status field
const ACTIVE_STATUSES = new Set([
	'submitted',
	'unassigned',
	'assigned',
	'in_progress',
	'open',
	'acknowledged',
	'pending',
])

const RESOLVED_LIMIT = 20

/**
 * Normalises a raw Firestore document into the shape expected by the
 * public dashboard and RequestCard component.
 */
const normalise_request = (id, data) => {
	const coords = parseLocation(data.location)

	return {
		id,
		category: data.category ?? 'Unknown',
		// Always lowercase so RequestCard and filter comparisons are consistent
		status: (data.status ?? 'unassigned').toLowerCase(),
		ward: `Ward ${data.sa_ward ?? 'Unknown'}`,
		// Loose != null catches both null and undefined; avoids "undefined" string
		sa_ward:
			data.sa_ward !== null && data.sa_ward !== undefined
				? String(data.sa_ward)
				: data.sa_ward,
		municipality: data.sa_m_name ?? 'Unknown Municipality',
		sa_m_name: data.sa_m_name ?? 'Unknown Municipality',
		sa_m_code: data.sa_m_code ?? '',
		sa_province: data.sa_province ?? '',
		description: data.description ?? '',
		image: data.image ?? null,
		like_count: data.like_count ?? 0,
		priority: data.priority ?? null,
		user_uid: data.user_uid ?? null,
		created_at: data.created_at ?? null,
		updated_at: data.updated_at ?? null,
		latitude: coords ? coords.latitude : null,
		longitude: coords ? coords.longitude : null,
	}
}

/**
 * Fetches all public dashboard data: active requests, resolved requests,
 * and summary stats.
 */
export const fetchPublicDashboardData = async () => {
	const requests_ref = collection(db, 'service_requests')
	const q = query(requests_ref, orderBy('updated_at', 'desc'), limit(200))
	const snapshot = await getDocs(q)

	const active = []
	const resolved = []
	const wards_seen = new Set()

	snapshot.forEach((doc_snap) => {
		const normalised = normalise_request(doc_snap.id, doc_snap.data())

		wards_seen.add(String(normalised.sa_ward))

		if (normalised.status === 'resolved') {
			if (resolved.length < RESOLVED_LIMIT) {
				resolved.push(normalised)
			}
		} else if (ACTIVE_STATUSES.has(normalised.status)) {
			active.push(normalised)
		} else {
			// 'closed' and any unknown statuses show as active
			active.push(normalised)
		}
	})

	return {
		active,
		resolved,
		stats: {
			open_count: active.length,
			resolved_count: resolved.length,
			wards_affected: wards_seen.size,
		},
	}
}
