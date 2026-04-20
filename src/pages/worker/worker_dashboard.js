import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase_config.js'
import {
	get_claimed_requests,
	get_unclaimed_requests,
	claim_request,
} from '../../backend/worker_firebase.js'
import RequestCard from '../../components/request_card/request_card.js'
import './worker_dashboard.css'

const STATUS_FILTERS = ['ALL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']

function WorkerDashboard() {
	const [my_requests, set_my_requests] = useState([])
	const [unclaimed_requests, set_unclaimed_requests] = useState([])
	const [loading, set_loading] = useState(true)
	const [claiming_id, set_claiming_id] = useState(null)
	const [active_filter, set_active_filter] = useState('all')
	const [active_section, set_active_section] = useState('my_requests')
	const navigate = useNavigate()

	const load_requests = async () => {
		if (!auth.currentUser) {
			navigate('/login')
			return
		}
		try {
			const [claimed, unclaimed] = await Promise.all([
				get_claimed_requests(auth.currentUser.uid),
				get_unclaimed_requests(),
			])
			set_my_requests(claimed)
			set_unclaimed_requests(unclaimed)
		} catch (err) {
			console.error(err)
		} finally {
			set_loading(false)
		}
	}

	useEffect(() => {
		load_requests()
	}, [navigate])

	const handle_signout = async () => {
		await signOut(auth)
		navigate('/login')
	}

	const handle_claim = async (request_id) => {
		set_claiming_id(request_id)
		try {
			await claim_request(request_id, auth.currentUser.uid)
			await load_requests()
			set_active_section('my_requests')
		} catch (err) {
			console.error(err)
		} finally {
			set_claiming_id(null)
		}
	}

	const filtered_requests =
		active_filter === 'all'
			? my_requests
			: my_requests.filter((r) => r.status === active_filter)

	return (
		<div className="worker_page">
			<aside className="worker_sidebar">
				<div className="worker_sidebar_logo">
					REPORT-<span>WIZA</span>
				</div>
				<div className="worker_sidebar_role">Worker Portal</div>
				<nav className="worker_sidebar_nav">
					<div
						className={`worker_sidebar_item ${active_section === 'my_requests' ? 'active' : ''}`}
						onClick={() => set_active_section('my_requests')}
					>
						My Requests
					</div>
					<div
						className={`worker_sidebar_item ${active_section === 'available' ? 'active' : ''}`}
						onClick={() => set_active_section('available')}
					>
						Available Requests
						{unclaimed_requests.length > 0 && (
							<span className="worker_sidebar_badge">
								{unclaimed_requests.length}
							</span>
						)}
					</div>
				</nav>
				<div className="worker_sidebar_bottom">
					<div className="worker_sidebar_avatar">
						{auth.currentUser?.displayName?.[0] || 'W'}
					</div>
					<div className="worker_sidebar_user_info">
						<div className="worker_sidebar_user_name">
							{auth.currentUser?.displayName || 'Worker'}
						</div>
						<div className="worker_sidebar_user_role">
							Municipal Worker
						</div>
					</div>
				</div>
			</aside>

			<div className="worker_main">
				<div className="worker_top_bar">
					<div>
						<h1 className="worker_top_bar_title">
							{active_section === 'my_requests'
								? 'My Requests'
								: 'Available Requests'}
						</h1>
						<p className="worker_top_bar_sub">
							{active_section === 'my_requests'
								? 'Manage and update your assigned service requests'
								: 'Unclaimed requests you can take ownership of'}
						</p>
					</div>
					<button
						className="worker_signout_btn"
						onClick={handle_signout}
					>
						Sign out
					</button>
				</div>

				<div className="worker_content">
					{active_section === 'my_requests' && (
						<>
							<div className="worker_filters">
								{STATUS_FILTERS.map((f) => (
									<button
										key={f}
										className={`worker_filter_btn ${active_filter === f ? 'active' : ''}`}
										onClick={() => set_active_filter(f)}
									>
										{f.replace('_', ' ')}
									</button>
								))}
							</div>
							{loading ? (
								<p className="worker_loading">
									Loading requests...
								</p>
							) : filtered_requests.length === 0 ? (
								<p className="worker_empty">
									No requests found.
								</p>
							) : (
								<div className="worker_requests_grid">
									{filtered_requests.map((request) => (
										<div
											key={request.id}
											className="worker_card_wrapper"
											onClick={() =>
												navigate(
													`/worker/requests/${request.id}`
												)
											}
										>
											<RequestCard request={request} />
										</div>
									))}
								</div>
							)}
						</>
					)}

					{active_section === 'available' && (
						<>
							{loading ? (
								<p className="worker_loading">Loading...</p>
							) : unclaimed_requests.length === 0 ? (
								<p className="worker_empty">
									No unclaimed requests.
								</p>
							) : (
								<div className="worker_requests_grid">
									{unclaimed_requests.map((request) => (
										<div
											key={request.id}
											className="worker_unclaimed_card"
										>
											<div className="request_card">
												<div className="request_card_top">
													<h3>{request.category}</h3>
													<span
														className={`status_badge ${request.status}`}
													>
														{request.status}
													</span>
												</div>
												<p className="request_location">
													{request.sa_ward
														? `Ward ${request.sa_ward}`
														: '—'}{' '}
													· {request.sa_m_name || '—'}
												</p>
												<p className="request_description">
													{request.description}
												</p>
												<button
													className="worker_claim_btn"
													onClick={() =>
														handle_claim(request.id)
													}
													disabled={
														claiming_id ===
														request.id
													}
												>
													{claiming_id === request.id
														? 'Claiming...'
														: 'Claim'}
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	)
}

export default WorkerDashboard
