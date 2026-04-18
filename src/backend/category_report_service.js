// 1. New Fetch Call to your Custom Backend
export const fetch_report_data = async (uid) => {
	// Pass the UID to the backend to verify admin status
	const response = await fetch(`/api/analytics/category-report?uid=${uid}`)

	if (!response.ok) {
		throw new Error('Failed to fetch analytics data')
	}

	const data = await response.json()
	// Returns { stats, total_requests, summary }
	return data
}

// 2. UI Formatting Helpers (Keep these on the frontend!)
export const format_resolution_time = (hours) => {
	if (hours === null) return null
	if (hours < 1) return `${Math.round(hours * 60)}m`
	if (hours < 24) return `${Math.round(hours)}h`
	return `${(hours / 24).toFixed(1)}d`
}

export const get_resolution_class = (hours) => {
	if (hours === null) return ''
	if (hours <= 24) return 'resolution_fast'
	if (hours <= 72) return 'resolution_medium'
	return 'resolution_slow'
}
