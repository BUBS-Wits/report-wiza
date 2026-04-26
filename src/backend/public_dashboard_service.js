// src/backend/public_dashboard_service.js
import { db } from '../firebase_config.js'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { parseLocation } from '../utils/parse_location.js'

// Statuses treated as "open" (active) on the public dashboard
const ACTIVE_STATUSES = new Set([
	'SUBMITTED',
	'UNASSIGNED',
	'ASSIGNED',
	'IN_PROGRESS',
])

// Max resolved requests to surface on the public dashboard
const RESOLVED_LIMIT = 20

/**
 * Normalises a raw Firestore request document into the shape
 * expected by the public dashboard and RequestCard component.
 *
 * @param {string} id - Firestore document ID
 * @param {object} data - Raw Firestore document data
 * @returns {object|null} Normalised request, or null if location is unparseable
 */
const normalise_request = (id, data) => {
	const coords = parseLocation(data.location)
	if (!coords) return null // skip requests with no valid location

	return {
		id, // string — Firestore doc ID
		category: data.category ?? 'Unknown',
		status: data.status ?? 'UNASSIGNED',
		ward: `Ward ${data.sa_ward ?? 'Unknown'}`,
		sa_ward: data.sa_ward,
		municipality: data.sa_m_name ?? 'Unknown Municipality',
		sa_m_code: data.sa_m_code ?? '',
		sa_province: data.sa_province ?? '',
		description: data.description ?? '',
		image: data.image ?? null,
		like_count: data.like_count ?? 0,
		user_uid: data.user_uid ?? null,
		created_at: data.created_at ?? null,
		updated_at: data.updated_at ?? null,
		latitude: coords.latitude,
		longitude: coords.longitude,
	}
}

/**
 * Fetches all public dashboard data in a single call.
 * Returns separate arrays for active and resolved requests,
 * plus aggregate stats.
 *
 * @returns {{ active: object[], resolved: object[], stats: object }}
 */
export const fetchPublicDashboardData = async () => {
	const requests_ref = collection(db, 'requests')

	// Fetch all requests ordered by most recently updated.
	// A whereIn on status would require a composite index; a full
	// fetch + client-side split is acceptable for the public dashboard
	// volume and avoids extra index setup.
	const q = query(requests_ref, orderBy('updated_at', 'desc'), limit(200))
	const snapshot = await getDocs(q)

	const active = []
	const resolved = []
	const wards_seen = new Set()

	snapshot.forEach((doc_snap) => {
		const normalised = normalise_request(doc_snap.id, doc_snap.data())
		if (!normalised) return

		wards_seen.add(String(normalised.sa_ward))

		if (normalised.status === 'RESOLVED') {
			if (resolved.length < RESOLVED_LIMIT) resolved.push(normalised)
		} else if (ACTIVE_STATUSES.has(normalised.status)) {
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
