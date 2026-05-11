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

function RequestCard({ request, onLikeChange = () => {} }) {
	const rawStatus = (request.status || '').toLowerCase().trim()

	const isResolved =
		rawStatus === STATUS.RESOLVED || rawStatus === STATUS.CLOSED

	const showLikeButton = !isResolved
	const showPriority = !isResolved
	const showStatus = !isResolved

	const statusLabel = STATUS_DISPLAY[rawStatus] || request.status || 'Unknown'
	const priorityMeta = PRIORITY_META[request.priority] ?? null

	return (
		<div className="request_card">
			<div className="request_card_top">
				<h3>{request.category}</h3>
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

			<p className="request_location">
				{request.sa_ward ? `Ward ${request.sa_ward}` : '—'}
				{request.sa_m_name ? ` · ${request.sa_m_name}` : ''}
			</p>

			<p className="request_description">{request.description}</p>

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
