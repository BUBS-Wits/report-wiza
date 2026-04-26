import React, { useEffect, useState } from 'react'
import { auth } from '../../firebase_config.js' // Firebase Auth
import { fetchResidentRequests } from '../../backend/resident_firebase.js' // backend function to fetch requests
import './resident_requests.css' // component-specific styles
import LikeButton from '../../components/request_card/like_button/like_button.js' // like button component
import Navbar from '../../components/nav_bar/nav_bar.js' // navigation bar

function ResidentRequests() {
	// State for storing the list of requests
	const [requests, setRequests] = useState([])
	// Loading state while fetching data
	const [loading, setLoading] = useState(true)
	// Error state if something goes wrong
	const [error, setError] = useState(null)

	// Effect to load requests when component mounts or user changes
	// Uses onAuthStateChanged to wait for Firebase Auth to confirm login state
	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged(async (user) => {
			if (!user) {
				setError('Please log in to view your requests.') // not authenticated
				setLoading(false)
				return
			}

			// Retry logic: if first fetch fails, try once more after 1 second
			const loadWithRetry = async (retry = true) => {
				try {
					const data = await fetchResidentRequests(user.uid) // fetch from Firestore
					setRequests(data) // store in state
				} catch (err) {
					console.error('Fetch failed:', err)
					if (retry) {
						setTimeout(() => loadWithRetry(false), 1000) // one retry
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
	}, []) // empty dependency array means run once on mount

	// Show loading spinner / message
	if (loading) {
		return <div className="loading">Loading your requests...</div>
	}
	// Show error message if any
	if (error) {
		return <div className="error">{error}</div>
	}
	// If no requests exist, show empty state with navbar
	if (requests.length === 0) {
		return (
			<div className="resident_requests_container">
				<Navbar />
				<div className="empty">
					You haven’t submitted any service requests yet.
				</div>
			</div>
		)
	}

	// Main render: list of requests with navbar and like buttons
	return (
		<div className="resident_requests_container">
			<Navbar />
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
							{/* Like button component – passes request id and current like count */}
							<LikeButton
								requestId={req.id}
								initialLikeCount={req.like_count || 0}
							/>
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}

export default ResidentRequests
