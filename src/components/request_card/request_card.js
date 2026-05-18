import React from 'react'
import LikeButton from './like_button/like_button.js'
import { STATUS_DISPLAY } from '../../constants.js'

const PRIORITY_META = {
	Low: { label: 'Low', cls: 'priority--low' },
	Medium: { label: 'Medium', cls: 'priority--medium' },
	High: { label: 'High', cls: 'priority--high' },
	Critical: { label: 'Critical', cls: 'priority--critical' },
}

// Aliases for legacy/lowercase status strings not present in STATUS_DISPLAY.
// These are the values that arrive from the public dashboard after normalisation.
const STATUS_LABEL_ALIASES = {
	open: 'Submitted',
	submitted: 'Submitted',
	unassigned: 'Unassigned',
	assigned: 'Assigned',
	acknowledged: 'Assigned',
	in_progress: 'In Progress',
	resolved: 'Resolved',
	closed: 'Closed',
}

function format_date(ts) {
	if (!ts) {
		return '—'
	}
	const d = ts.toDate ? ts.toDate() : new Date(ts)
	return d.toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

function RequestCard({ request, onLikeChange = () => {}, visibleFields }) {
	const fields = {
		category: true,
		status: true,
		ward: true,
		municipality: true,
		description: true,
		likes: true,
		...visibleFields,
	}

	const rawStatus = (request.status || '').toLowerCase().trim()
	const isResolved = rawStatus === 'resolved' || rawStatus === 'closed'

	const showLikeButton = fields.likes && !isResolved
	const showPriority = !isResolved
	const showStatus = fields.status && !isResolved

	// Try STATUS_DISPLAY (uppercase key) first, then the local alias map,
	// then fall back to the raw status string
	const statusLabel =
		STATUS_DISPLAY[rawStatus.toUpperCase()] ??
		STATUS_LABEL_ALIASES[rawStatus] ??
		request.status ??
		'Unknown'

	const priorityMeta = PRIORITY_META[request.priority] ?? null

	return (
		<div className="request_card">
			<div className="request_card_top">
				{fields.category && <h3>{request.category}</h3>}

				<div className="request_card_status_group">
					{showStatus && (
						<span
							className={`status_badge ${statusLabel
								.toLowerCase()
								.replace(/\s+/g, '_')}`}
						>
							Status: {statusLabel}
						</span>
					)}

					{showPriority && priorityMeta && (
						<div className="request_priority_row">
							<span
								className={`priority_badge ${priorityMeta.cls}`}
							>
								Priority: {priorityMeta.label}
							</span>
						</div>
					)}
				</div>
			</div>

			{(fields.ward || fields.municipality) && (
				<p className="request_location">
					{fields.ward &&
						(request.sa_ward ? `Ward ${request.sa_ward}` : '—')}
					{fields.ward && fields.municipality && ' · '}
					{fields.municipality &&
						(request.municipality || request.sa_m_name || '—')}
				</p>
			)}

			{fields.description && (
				<p className="request_description">{request.description}</p>
			)}

			<div className="request_meta_row">
				<span className="request_date">
					{format_date(request.created_at)}
				</span>
			</div>

			{showLikeButton && (
				<div className="request_footer">
					<LikeButton
						requestId={request.id}
						initialLikeCount={request.like_count || 0}
						onLikeChange={onLikeChange}
					/>
				</div>
			)}
		</div>
	)
}

export default RequestCard
