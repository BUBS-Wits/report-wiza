import React from 'react'
import LikeButton from './like_button/like_button.js'
import { STATUS, STATUS_DISPLAY } from '../../constants.js'

const PRIORITY_META = {
	Low: { label: 'Low', cls: 'priority--low' },
	Medium: { label: 'Medium', cls: 'priority--medium' },
	High: { label: 'High', cls: 'priority--high' },
	Critical: { label: 'Critical', cls: 'priority--critical' },
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
	// Merge default visibility with any admin overrides
	const fields = {
		category: true,
		status: true,
		ward: true,
		municipality: true,
		description: true,
		likes: true,
		...visibleFields,
	}

	// Case‑insensitive status for reliable comparisons
	const rawStatus = (request.status || '').toLowerCase().trim()
	const isResolved = rawStatus === 'resolved' || rawStatus === 'closed'

	const showLikeButton = fields.likes && !isResolved
	const showPriority = !isResolved
	const showStatus = fields.status && !isResolved

	const statusLabel = STATUS_DISPLAY[rawStatus] || request.status || 'Unknown'
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
					{fields.municipality && (request.municipality || request.sa_m_name || '—')}
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
