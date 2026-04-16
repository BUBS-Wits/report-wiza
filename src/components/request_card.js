import React from 'react'

function RequestCard({ request }) {
	return (
		<div className="request_card">
			<div className="request_card_top">
				<h3>{request.category}</h3>
				<span
					className={`status_badge ${request.status
						.toLowerCase()
						.replace(/\s+/g, '_')}`}
				>
					{request.status}
				</span>
			</div>

			<p className="request_location">
				{request.ward} - {request.municipality}
			</p>

			<p className="request_description">{request.description}</p>
		</div>
	)
}

export default RequestCard
