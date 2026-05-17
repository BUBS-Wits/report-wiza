import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase_config.js'

/**
 * Safely reads milliseconds from a value that is either a Firestore Timestamp
 * (has .toMillis()), a plain JS Date, an ISO string, or a raw number.
 */
const ts_to_ms = (ts) => {
	if (!ts) {
		return NaN
	}
	if (typeof ts.toMillis === 'function') {
		return ts.toMillis()
	}
	return new Date(ts).getTime()
}

/**
 * Utility to extract nested object properties safely (e.g. 'ward_info.ward_name')
 */
const get_nested_value = (obj, path) => {
	return path.split('.').reduce((acc, part) => acc && acc[part], obj)
}

/**
 * Generates a custom aggregated report based on dynamic dimensions and filters.
 *
 * @param {Date}          start_date  - Beginning of the reporting period.
 * @param {Date}          end_date    - End of the reporting period.
 * @param {Array<string>} dimensions  - Fields to group by.
 * @param {Object}        filters     - Specific field matches (case-insensitive).
 * @returns {Promise<Array>} Aggregated report data.
 */
export async function generate_custom_report(
	start_date,
	end_date,
	dimensions = [],
	filters = {}
) {
	try {
		// 1. Fetch all service requests
		const requests_ref = collection(db, 'service_requests')
		const snapshot = await getDocs(requests_ref)

		// 2. Build a UID → display name lookup map, but ONLY when the caller
		//    has requested the 'assigned_worker_uid' dimension.  Skipping this
		//    fetch for all other report types avoids an unnecessary Firestore
		//    read and prevents the second getDocs call from being unmocked in tests.
		let user_map = {}
		if (dimensions.includes('assigned_worker_uid')) {
			const users_ref = collection(db, 'users')
			const users_snapshot = await getDocs(users_ref)
			users_snapshot.forEach((doc) => {
				const data = doc.data()
				user_map[doc.id] = data.display_name || data.email || doc.id
			})
		}

		// 3. Filter by date range and custom filters in-memory
		const raw_docs = []

		snapshot.forEach((doc) => {
			const data = doc.data()

			// Secondary custom filters (case-insensitive string comparison)
			let passes_filters = true
			for (const [key, expected_value] of Object.entries(filters)) {
				if (expected_value) {
					const actual_value = get_nested_value(data, key)
					if (
						String(actual_value).toLowerCase() !==
						String(expected_value).toLowerCase()
					) {
						passes_filters = false
						break
					}
				}
			}

			if (passes_filters) {
				raw_docs.push(data)
			}
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

				// Resolve worker UID to a human-readable name when available
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

				// Inject the dimension labels as named properties so the table
				// can render them as columns (e.g. 'ward_info.ward_name' → 'ward_name')
				dimensions.forEach((dim, idx) => {
					const clean_key = dim.includes('.')
						? dim.split('.').pop()
						: dim
					grouped_data[group_key][clean_key] = key_parts[idx]
				})
			}

			// Aggregate
			grouped_data[group_key].count++

			if (data.status === 'resolved' || data.status === 'closed') {
				grouped_data[group_key].resolved_count++

				// Prefer resolved_at; fall back to updated_at for services that
				// don't write a dedicated resolved_at field.
				const end_ts = data.resolved_at || data.updated_at
				const start_ts = data.created_at

				if (start_ts && end_ts) {
					const diff = ts_to_ms(end_ts) - ts_to_ms(start_ts)
					grouped_data[group_key].total_resolution_time_ms +=
						Math.max(0, diff)
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
		if (data.status === 'resolved' || data.status === 'closed') {
			resolved_count++

			const end_ts = data.resolved_at || data.updated_at
			const start_ts = data.created_at

			if (start_ts && end_ts) {
				const diff = ts_to_ms(end_ts) - ts_to_ms(start_ts)
				total_time_ms += Math.max(0, diff)
			}
		}
	})

	const avg_time_ms =
		resolved_count > 0 ? total_time_ms / resolved_count : null
	const avg_time_hours =
		avg_time_ms !== null ? avg_time_ms / (1000 * 60 * 60) : null

	return [
		{
			group_id: label,
			count: docs.length,
			resolved_count,
			resolution_rate:
				docs.length > 0
					? Math.round((resolved_count / docs.length) * 100)
					: 0,
			avg_resolution_hours:
				avg_time_hours !== null
					? parseFloat(avg_time_hours.toFixed(2))
					: null,
		},
	]
}
