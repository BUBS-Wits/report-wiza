// src/components/admin_messaging_review/amr_utils.js

export const STATUS_LABELS = {
	open: 'Open',
	acknowledged: 'Assigned',
	in_progress: 'In Progress',
	resolved: 'Resolved',
	closed: 'Closed',
}

export function format_thread_time(date) {
	if (!date) {
		return ''
	}
	const now = new Date()
	const diff_ms = now - date
	const diff_mins = Math.floor(diff_ms / 60000)
	if (diff_mins < 1) {
		return 'Just now'
	}
	if (diff_mins < 60) {
		return `${diff_mins}m ago`
	}
	const diff_hours = Math.floor(diff_mins / 60)
	if (diff_hours < 24) {
		return `${diff_hours}h ago`
	}
	const diff_days = Math.floor(diff_hours / 24)
	if (diff_days === 1) {
		return 'Yesterday'
	}
	return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function format_message_time(date) {
	if (!date) {
		return ''
	}
	return date.toLocaleTimeString('en-ZA', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function format_date_label(date) {
	if (!date) {
		return ''
	}
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const diff = Math.round((today - d) / 86400000)
	if (diff === 0) {
		return 'Today'
	}
	if (diff === 1) {
		return 'Yesterday'
	}
	return date.toLocaleDateString('en-ZA', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	})
}

export function same_day(a, b) {
	if (!a || !b) {
		return false
	}
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}
