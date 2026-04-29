import React from 'react'
import LikeButton from './like_button/like_button.js'
import { STATUS_DISPLAY } from '../../constants.js'

function RequestCard({ request }) {
	const showLikeButton =
		request.status !== 'Resolved' && request.status !== 'Closed'

	return (
		<div className="request_card">
			<div className="request_card_top">
				<h3>{request.category}</h3>
				<span
					className={`status_badge ${STATUS_DISPLAY[request.status].toLowerCase().replace(/\s+/g, '_')}`}
				>
					{STATUS_DISPLAY[request.status]}
				</span>
			</div>
			<p className="request_location">
				{request.sa_ward ? `Ward ${request.sa_ward}` : '—'} ·{' '}
				{request.sa_m_name || '—'}
			</p>
			<p className="request_description">{request.description}</p>

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
