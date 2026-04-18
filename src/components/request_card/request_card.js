import React from 'react'
import LikeButton from './like_button/like_button.js'

function RequestCard({ request }) {
	const showLikeButton =
		request.status !== 'Resolved' && request.status !== 'Closed'

	return (
		<div className="request_card">
			<div className="request_card_top">
				<h3>{request.category}</h3>
				<span
					className={`status_badge ${request.status.toLowerCase().replace(/\s+/g, '_')}`}
				>
					{request.status}
				</span>
			</div>
			<p className="request_location">
				{request.ward} - {request.municipality}
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
