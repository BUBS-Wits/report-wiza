// src/backend/public_dashboard_service.js
import { db } from '../firebase_config.js'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { parseLocation } from '../utils/parse_location.js'

// Statuses treated as "open" / active on the public dashboard
const ACTIVE_STATUSES = new Set([
	'SUBMITTED',
	'UNASSIGNED',
	'ASSIGNED',
	'IN_PROGRESS',
	'open',
	'acknowledged',
	'in_progress',
])

const RESOLVED_STATUSES = new Set(['RESOLVED', 'resolved'])

const RESOLVED_LIMIT = 20

const normalise_status = (status) => {
	if (status === undefined || status === null || status === '') {
		return 'UNASSIGNED'
	}

	return status
}

/**
 * Normalises a raw Firestore request document into the shape expected by
 * the public dashboard, request cards, filters, and map markers.
 */
const normalise_request = (id, data) => {
	const coords = parseLocation(data.location)

	if (!coords) {
		return null
	}

	const status = normalise_status(data.status)
	const ward = data.sa_ward ?? data.ward ?? null
	const municipality =
		data.sa_m_name ?? data.municipality ?? 'Unknown Municipality'

	return {
		id,
		category: data.category ?? 'Unknown',
		status,
		ward: ward ? `Ward ${ward}` : 'Ward Unknown',
		sa_ward: ward,
		municipality,
		sa_m_name: municipality,
		sa_m_code: data.sa_m_code ?? '',
		sa_province: data.sa_province ?? '',
		description: data.description ?? '',
		image: data.image ?? null,
		like_count: data.like_count ?? 0,
		created_at: data.created_at ?? null,
		updated_at: data.updated_at ?? null,
		latitude: coords.latitude,
		longitude: coords.longitude,
	}
}

export const fetchPublicDashboardData = async () => {
	const requests_ref = collection(db, 'service_requests')

	const q = query(requests_ref, orderBy('updated_at', 'desc'), limit(200))
	const snapshot = await getDocs(q)

	const active = []
	const resolved = []
	const wards_seen = new Set()

	snapshot.forEach((doc_snap) => {
		const normalised = normalise_request(doc_snap.id, doc_snap.data())

		if (!normalised) {
			return
		}

		if (normalised.sa_ward !== null && normalised.sa_ward !== undefined) {
			wards_seen.add(String(normalised.sa_ward))
		}

		if (RESOLVED_STATUSES.has(normalised.status)) {
			if (resolved.length < RESOLVED_LIMIT) {
				resolved.push(normalised)
			}
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
