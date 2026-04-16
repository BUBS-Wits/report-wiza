import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase_config.js'
import { REQUEST_CATEGORIES } from '../../constants.js'

/**
 * Verifies that the authenticated user has the 'admin' role in Firestore.
 * @param {string} uid - Firebase Auth user ID
 * @returns {Promise<boolean>}
 */
export const verify_admin = async (uid) => {
	const user_doc = await getDoc(doc(db, 'users', uid))
	return user_doc.exists() && user_doc.data().role === 'admin'
}

/**
 * Firestore status values (as stored in DB):
 *   "pending"     → new / not yet actioned  (maps to "open" in UI)
 *   "acknowledged"→ seen by staff            (maps to "in_progress" in UI)
 *   "in_progress" → actively being worked on (maps to "in_progress" in UI)
 *   "resolved"    → completed
 */
const PENDING_STATUSES = ['pending']
const IN_PROGRESS_STATUSES = ['in_progress', 'acknowledged']
const RESOLVED_STATUSES = ['resolved']

/**
 * Computes the average resolution time (in hours) for a set of resolved requests.
 * Uses created_at → updated_at delta from Firestore Timestamps.
 * @param {Array<Object>} resolved_requests
 * @returns {number|null}
 */
const compute_avg_hours = (resolved_requests) => {
	if (resolved_requests.length === 0) {return null}

	const total_ms = resolved_requests.reduce((sum, r) => {
		const created = r.created_at?.toMillis?.() ?? 0
		const updated = r.updated_at?.toMillis?.() ?? 0
		return sum + Math.max(0, updated - created)
	}, 0)

	return total_ms / resolved_requests.length / (1000 * 60 * 60)
}

/**
 * Builds per-category statistics from a flat array of service request documents.
 * @param {Array<Object>} all_requests
 * @returns {Array<Object>}
 */
export const build_category_stats = (all_requests) => {
	return REQUEST_CATEGORIES.map((category) => {
		const cat_requests = all_requests.filter((r) => r.category === category)

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
}

/**
 * Fetches all service_requests from Firestore and returns computed report data.
 * @returns {Promise<{ stats: Array<Object>, total_requests: number }>}
 */
export const fetch_report_data = async () => {
	const snapshot = await getDocs(collection(db, 'service_requests'))
	const all_requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

	return {
		stats: build_category_stats(all_requests),
		total_requests: all_requests.length,
	}
}

/**
 * Derives top-level summary metrics from an array of category stats.
 * @param {Array<Object>} stats
 * @returns {Object}
 */
export const compute_summary = (stats) => {
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

	return {
		total_resolved,
		total_pending,
		overall_avg_hours,
		worst_backlog: worst_backlog?.pending > 0 ? worst_backlog : null,
	}
}

/**
 * Formats a duration in hours to a human-readable string.
 * @param {number|null} hours
 * @returns {string|null}
 */
export const format_resolution_time = (hours) => {
	if (hours === null) {return null}
	if (hours < 1) {return `${Math.round(hours * 60)}m`}
	if (hours < 24) {return `${Math.round(hours)}h`}
	return `${(hours / 24).toFixed(1)}d`
}

/**
 * Returns a CSS class name based on how fast a category resolves requests.
 * @param {number|null} hours
 * @returns {string}
 */
export const get_resolution_class = (hours) => {
	if (hours === null) {return ''}
	if (hours <= 24) {return 'resolution_fast'}
	if (hours <= 72) {return 'resolution_medium'}
	return 'resolution_slow'
}
