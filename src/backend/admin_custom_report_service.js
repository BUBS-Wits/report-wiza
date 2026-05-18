import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase_config.js'

/**
 * Safely converts any timestamp representation to milliseconds.
 * Handles: Firestore Timestamp, ISO/RFC string, JS Date, raw number.
 */
const ts_to_ms = (ts) => {
	if (!ts) {
		return NaN
	}
	if (typeof ts.toMillis === 'function') {
		return ts.toMillis()
	} // Firestore Timestamp
	if (ts instanceof Date) {
		return ts.getTime()
	}
	return new Date(ts).getTime() // string or number
}

/**
 * Utility to extract nested object properties safely (e.g. 'ward_info.ward_name')
 */
const get_nested_value = (obj, path) => {
	return path.split('.').reduce((acc, part) => acc && acc[part], obj)
}

/**
 * Normalises a status string so comparisons work regardless of DB casing.
 * e.g. "resolved", "RESOLVED", "Resolved" all become "RESOLVED"
 */
const normalise_status = (status) => (status || '').toUpperCase()

/**
 * Generates a custom aggregated report based on dynamic dimensions and filters.
 */
export async function generate_custom_report(
	start_date,
	end_date,
	dimensions = [],
	filters = {}
) {
	try {
		// 1. Fetch all service requests
		const snapshot = await getDocs(collection(db, 'service_requests'))

		// 2. Build UID → display name lookup only when needed
		let user_map = {}
		if (dimensions.includes('assigned_worker_uid')) {
			const users_snapshot = await getDocs(collection(db, 'users'))
			users_snapshot.forEach((doc) => {
				const data = doc.data()
				user_map[doc.id] = data.display_name || data.email || doc.id
			})
		}

		// 3. Apply custom field filters in-memory (case-insensitive)
		//    Note: start_date / end_date are accepted for API compatibility but
		//    date-range filtering is not applied here — callers should pre-filter
		//    or pass dimension-level filters instead.
		const raw_docs = []

		snapshot.forEach((doc) => {
			const data = doc.data()

			for (const [key, expected_value] of Object.entries(filters)) {
				if (expected_value) {
					const actual_value = get_nested_value(data, key)
					if (
						String(actual_value).toLowerCase() !==
						String(expected_value).toLowerCase()
					) {
						return // skip this doc
					}
				}
			}

			raw_docs.push(data)
		})

		// 4. Global totals path (no grouping)
		if (dimensions.length === 0) {
			return calculate_totals(raw_docs, 'Global Filtered Range')
		}

		// 5. Group by the requested dynamic dimensions
		const grouped_data = {}

		raw_docs.forEach((data) => {
			const key_parts = dimensions.map((dim) => {
				let val = get_nested_value(data, dim)
				if (dim === 'assigned_worker_uid' && val) {
					val = user_map[val] || val
				}
				return val || 'Unknown'
			})

			const group_key = key_parts.join(' | ')

			if (!grouped_data[group_key]) {
				grouped_data[group_key] = {
					group_id: group_key,
					count: 0,
					resolved_count: 0,
					total_resolution_time_ms: 0,
				}

				dimensions.forEach((dim, idx) => {
					const clean_key = dim.includes('.')
						? dim.split('.').pop()
						: dim
					grouped_data[group_key][clean_key] = key_parts[idx]
				})
			}

			grouped_data[group_key].count++

			const s = normalise_status(data.status)
			if (s === 'RESOLVED' || s === 'CLOSED') {
				grouped_data[group_key].resolved_count++

				const end_ms = ts_to_ms(data.resolved_at || data.updated_at)
				const start_ms = ts_to_ms(data.created_at)

				if (!isNaN(start_ms) && !isNaN(end_ms)) {
					const diff = end_ms - start_ms
					if (diff > 0) {
						grouped_data[group_key].total_resolution_time_ms += diff
					}
				}
			}
		})

		// 6. Format and calculate final averages
		const final_report = Object.values(grouped_data).map((group) => {
			const avg_time_ms =
				group.resolved_count > 0
					? group.total_resolution_time_ms / group.resolved_count
					: null

			const avg_time_hours =
				avg_time_ms !== null ? avg_time_ms / (1000 * 60 * 60) : null

			delete group.total_resolution_time_ms

			return {
				...group,
				resolution_rate:
					group.count > 0
						? Math.round((group.resolved_count / group.count) * 100)
						: 0,
				avg_resolution_hours:
					avg_time_hours !== null
						? parseFloat(avg_time_hours.toFixed(2))
						: null,
			}
		})

		return final_report.sort((a, b) => b.count - a.count)
	} catch (error) {
		console.error('Error generating custom report:', error)
		throw error
	}
}

/**
 * Calculates a single row of global totals (used when no dimensions are passed).
 */
function calculate_totals(docs, label) {
	let resolved_count = 0
	let total_time_ms = 0

	docs.forEach((data) => {
		const s = normalise_status(data.status)
		if (s === 'RESOLVED' || s === 'CLOSED') {
			resolved_count++

			const end_ms = ts_to_ms(data.resolved_at || data.updated_at)
			const start_ms = ts_to_ms(data.created_at)

			if (!isNaN(start_ms) && !isNaN(end_ms)) {
				const diff = end_ms - start_ms
				if (diff > 0) {
					total_time_ms += diff
				}
			}
		}
	})

	const avg_time_hours =
		resolved_count > 0
			? parseFloat(
					(total_time_ms / resolved_count / (1000 * 60 * 60)).toFixed(
						2
					)
				)
			: null

	return [
		{
			group_id: label,
			count: docs.length,
			resolved_count,
			resolution_rate:
				docs.length > 0
					? Math.round((resolved_count / docs.length) * 100)
					: 0,
			avg_resolution_hours: avg_time_hours,
		},
	]
}
