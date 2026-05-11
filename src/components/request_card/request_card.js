import React from 'react'
import LikeButton from './like_button/like_button.js'
import { STATUS, STATUS_DISPLAY } from '../../constants.js'

function RequestCard({ request, visibleFields }) {
	const fields = {
		category: true,
		status: true,
		ward: true,
		municipality: true,
		description: true,
		likes: true,
		...visibleFields,
	}

	const statusText =
		STATUS_DISPLAY[request.status] ?? request.status ?? 'unknown'

	const showLikeButton =
		fields.likes &&
		request.status !== STATUS.RESOLVED &&
		request.status !== STATUS.CLOSED

	return (
		<div className="request_card">
			<div className="request_card_top">
				{fields.category && <h3>{request.category}</h3>}

				{fields.status && (
					<span
						className={`status_badge ${statusText
							.toLowerCase()
							.replace(/\s+/g, '_')}`}
					>
						{statusText}
					</span>
				)}
			</div>

			{(fields.ward || fields.municipality) && (
				<p className="request_location">
					{fields.ward &&
						(request.sa_ward ? `Ward ${request.sa_ward}` : '—')}
					{fields.ward && fields.municipality && ' · '}
					{fields.municipality && (request.sa_m_name || '—')}
				</p>
			)}

			{fields.description && (
				<p className="request_description">{request.description}</p>
			)}

			{showLikeButton && (
				<div className="request_footer">
					<LikeButton
						requestId={request.id}
						initialLikeCount={request.like_count || 0}
					/>
				</div>
			)}
		</div>
	)
}

export default RequestCard
