import { db } from '../firebase_config.js'
import {
	collection,
	onSnapshot,
	query,
	orderBy,
	limit,
} from 'firebase/firestore'
import { parseLocation } from '../utils/parse_location.js'

// Statuses treated as "active" (Open Requests section)
// All lowercase for case‑insensitive matching
const ACTIVE_STATUSES = new Set([
	'submitted',
	'unassigned',
	'assigned',
	'in_progress',
	'open',
	'acknowledged',
	'pending',
])

// Only 'resolved' goes to the resolved list; 'closed' is intentionally excluded
const RESOLVED_LIMIT = 20

/**
 * Normalises a raw Firestore request document into the shape
 * expected by the public dashboard and RequestCard component.
 */
const normalise_request = (id, data) => {
	const coords = parseLocation(data.location)

	return {
		id,
		category: data.category ?? 'Unknown',
		// Normalise status to lowercase so all comparisons work
		status: (data.status ?? 'unassigned').toLowerCase(),
		ward: `Ward ${data.sa_ward ?? 'Unknown'}`,
		// Loose != null catches both null and undefined; avoids "undefined" string
		sa_ward:
			data.sa_ward !== null && data.sa_ward !== undefined
				? String(data.sa_ward)
				: data.sa_ward,
		municipality: data.sa_m_name ?? 'Unknown Municipality',
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
 * LIVE LISTENER: Fetches all public dashboard data: active, resolved, and stats.
 */
export const subscribe_to_public_dashboard = (on_update, on_error) => {
	const requests_ref = collection(db, 'service_requests')

	const q = query(requests_ref, orderBy('updated_at', 'desc'), limit(200))

	const unsubscribe = onSnapshot(
		q,
		(snapshot) => {
			const active = []
			const resolved = []
			const wards_seen = new Set()

			snapshot.forEach((doc_snap) => {
				const normalised = normalise_request(
					doc_snap.id,
					doc_snap.data()
				)

				wards_seen.add(String(normalised.sa_ward))

				// Only 'resolved' goes to the resolved list
				if (normalised.status === 'resolved') {
					if (resolved.length < RESOLVED_LIMIT) {
						resolved.push(normalised)
					}
				} else if (ACTIVE_STATUSES.has(normalised.status)) {
					active.push(normalised)
				} else {
					// Any other status (e.g. 'escalated', 'blocked') still shows as active
					active.push(normalised)
				}
			})

			// Push the freshly calculated payload to React
			on_update({
				active,
				resolved,
				stats: {
					open_count: active.length,
					resolved_count: resolved.length,
					wards_affected: wards_seen.size,
				},
			})
		},
		(error) => {
			console.error('Error fetching public dashboard data:', error)
			if (on_error) {
				on_error(error)
			}
		}
	)

	return unsubscribe
}
