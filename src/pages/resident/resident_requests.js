import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../../firebase_config.js'
import { fetchResidentRequests } from '../../backend/resident_firebase.js'
import './resident_requests.css'
import LikeButton from '../../components/request_card/like_button/like_button.js'

function ResidentRequests() {
	const [requests, setRequests] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged(async (user) => {
			if (!user) {
				setError('Please log in to view your requests.')
				setLoading(false)
				return
			}

			const loadWithRetry = async (retry = true) => {
				try {
					const data = await fetchResidentRequests(user.uid)
					setRequests(data)
				} catch (err) {
					console.error('Fetch failed:', err)
					if (retry) {
						setTimeout(() => loadWithRetry(false), 1000)
					} else {
						setError(
							'Could not load your requests. Please refresh the page.'
						)
					}
				} finally {
					setLoading(false)
				}
			}
			await loadWithRetry()
		})
		return () => unsubscribe()
	}, [])

	if (loading) {
		return (
			<div className="rr-page">
				<div className="rr-loading">Loading your requests…</div>
			</div>
		)
	}
	if (error) {
		return (
			<div className="rr-page">
				<div className="rr-error">{error}</div>
			</div>
		)
	}

	return (
		<div className="rr-page">
			<div className="rr-container">
				<div className="rr-header">
					<h1>My Service Requests</h1>
					<Link to="/request" className="rr-submit-btn">
						+ Submit New Request
					</Link>
				</div>

				{/* Navigation links */}
				<div className="rr-nav-links">
					<Link to="/resident-dashboard" className="rr-nav-link">
						← Back to Dashboard
					</Link>
					<Link to="/" className="rr-nav-link">
						Home
					</Link>
					<Link to="/dashboard" className="rr-nav-link">
						Public Dashboard
					</Link>
				</div>

				{requests.length === 0 ? (
					<div className="rr-empty-state">
						<p>You haven’t submitted any service requests yet.</p>
					</div>
				) : (
					<ul className="rr-requests-list">
						{requests.map((req) => (
							<li key={req.id} className="rr-request-card">
								<div className="rr-card-header">
									<span className="rr-category">
										{req.category || 'Other'}
									</span>
									<span
										className={`rr-status-badge rr-status-badge--${(req.status || 'open').toLowerCase().replace(/\s+/g, '_')}`}
									>
										{req.status || 'Open'}
									</span>
								</div>
								<p className="rr-description">
									{req.description || 'No description'}
								</p>
								<div className="rr-footer">
									<span className="rr-date">
										Submitted:{' '}
										{req.created_at?.toDate
											? req.created_at
													.toDate()
													.toLocaleDateString()
											: 'Unknown date'}
									</span>
									<LikeButton
										requestId={req.id}
										initialLikeCount={req.like_count || 0}
									/>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}

export default ResidentRequests
