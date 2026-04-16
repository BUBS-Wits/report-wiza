import React, { useEffect, useState } from 'react'
import { auth } from '../../firebase_config.js'
import { fetchResidentRequests } from '../../backend/resident_firebase.js'
import './resident_requests.css'

function ResidentRequests() {
	const [requests, setRequests] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		const user = auth.currentUser
		if (!user) {
			setError('Please log in to view your requests.')
			setLoading(false)
			return
		}

		const loadRequests = async () => {
			try {
				const data = await fetchResidentRequests(user.uid)
				setRequests(data)
			} catch (err) {
				setError(err.message)
			} finally {
				setLoading(false)
			}
		}

		loadRequests()
	}, [])

	if (loading) {
		return <div className="loading">Loading your requests...</div>
	}
	if (error) {
		return <div className="error">{error}</div>
	}
	if (requests.length === 0) {
		return (
			<div className="empty">
				You haven’t submitted any service requests yet.
			</div>
		)
	}

	return (
		<div className="resident_requests_container">
			<h2>My Service Requests</h2>
			<ul className="requests_list">
				{requests.map((req) => (
					<li key={req.id} className="request_item">
						<div className="request_header">
							<span className="request_category">
								{req.category || 'Other'}
							</span>
							<span
								className={`request_status status_${req.status || 'open'}`}
							>
								{req.status || 'open'}
							</span>
						</div>
						<p className="request_description">
							{req.description || 'No description'}
						</p>
						<div className="request_footer">
							<span className="request_date">
								Submitted:{' '}
								{req.created_at?.toDate
									? req.created_at
											.toDate()
											.toLocaleDateString()
									: 'Unknown date'}
							</span>
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}

export default ResidentRequests
