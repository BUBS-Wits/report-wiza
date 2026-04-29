import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase_config.js'
import { STATUS, STATUS_DISPLAY } from '../../constants.js'
import RequestCard from '../../components/request_card/request_card.js'
import './worker_dashboard.css'

const FILTER_TABS = [
	{ label: 'All', value: null },
	{ label: STATUS_DISPLAY[STATUS.ASSIGNED], value: STATUS.ASSIGNED },
	{ label: STATUS_DISPLAY[STATUS.IN_PROGRESS], value: STATUS.IN_PROGRESS },
	{ label: STATUS_DISPLAY[STATUS.RESOLVED], value: STATUS.RESOLVED },
	{ label: STATUS_DISPLAY[STATUS.CLOSED], value: STATUS.CLOSED },
]

const STATUS_BADGE_CLASS = {
	[STATUS.SUBMITTED]: 'wd-badge--submitted',
	[STATUS.ASSIGNED]: 'wd-badge--assigned',
	[STATUS.IN_PROGRESS]: 'wd-badge--in-progress',
	[STATUS.RESOLVED]: 'wd-badge--resolved',
	[STATUS.CLOSED]: 'wd-badge--closed',
}
const SectionHeader = ({ title, description }) => (
	<div>
		<h1 className="worker_top_bar_title">{title}</h1>
		<p className="worker_top_bar_sub">{description}</p>
	</div>
)

const SECTIONS = {
	my_requests: {
		title: 'My Requests',
		description: 'Manage and update your assigned service requests',
	},
	available: {
		title: 'Available Requests',
		description: 'Unclaimed requests you can take ownership of',
	},
	/*
	analytics: {
		title: 'Analytics',
		description: 'Worker request analytics',
	},
	*/
}

function WorkerDashboard() {
	const [my_requests, set_my_requests] = useState([])
	const [unclaimed_requests, set_unclaimed_requests] = useState([])
	const [loading, set_loading] = useState(false)
	const [claiming_id, set_claiming_id] = useState(null)
	const [active_filter, set_active_filter] = useState(null)
	const [active_section, set_active_section] = useState('my_requests')
	const navigate = useNavigate()

	const get_claimed_requests = async () => {
		const token = await auth.currentUser.getIdToken()
		const ret = await fetch('/api/get-claimed-requests', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		})
		if (!ret.ok) {
			console.error('Failed: ', await ret.json())
			return []
		}
		const tmp = await ret.json()
		const data = tmp.data
		console.log('claimed: ', data)
		return data
	}

	const get_unclaimed_requests = async () => {
		const token = await auth.currentUser.getIdToken()
		const ret = await fetch('/api/get-unclaimed-requests', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		})
		if (!ret.ok) {
			console.error('Failed: ', await ret.json())
			return []
		}
		const tmp = await ret.json()
		const data = tmp.data
		console.log('unclaimed: ', data)
		return data
	}

	const load_requests = async () => {
		set_loading(true)
		try {
			const [claimed, unclaimed] = await Promise.all([
				get_claimed_requests(auth.currentUser.uid),
				get_unclaimed_requests(),
			])
			console.log(claimed, unclaimed)
			set_my_requests(claimed)
			set_unclaimed_requests(unclaimed)
		} catch (err) {
			console.error(err)
		} finally {
			set_loading(false)
		}
	}

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, (user) => {
			if (!auth.currentUser) {
				navigate('/login')
				return
			}
			if (loading) {
				return
			}
			load_requests()
		})
		return unsub
	}, [navigate, active_section])

	const handle_signout = async () => {
		await signOut(auth)
		navigate('/login')
	}

	const claim_request = async (request_id) => {
		const token = await auth.currentUser.getIdToken()
		const req = await fetch(
			`/api/claim-request?request_uid=${request_id}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			}
		)
		if (!req.ok) {
			alert('Failed to claim request. Browse console logs.')
			console.error('Failed:\n', await req.json())
			return
		}
		console.log(await req.json())
		return
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
		active_filter === null
			? my_requests
			: active_filter === STATUS.SUBMITTED
				? my_requests.filter(
						(r) =>
							r.status === STATUS.SUBMITTED ||
							r.status === STATUS.ASSIGNED
					)
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
					<div
						className={`worker_sidebar_item ${active_section === 'analytics' ? 'active' : ''}`}
						onClick={() => navigate('/worker-analytics')}
					>
						Analytics
					</div>
					<div
						className={`worker_sidebar_item ${active_section === 'messages' ? 'active' : ''}`}
						onClick={() => navigate('/worker-dashboard/messages')}
					>
						Messages
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
						<SectionHeader {...SECTIONS[active_section]} />
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
								{FILTER_TABS.map((f) => (
									<button
										key={f}
										className={`worker_filter_btn ${active_filter === f.value ? 'active' : ''}`}
										onClick={() =>
											set_active_filter(f.value)
										}
									>
										{f.label}
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
														className={`status_badge ${STATUS_BADGE_CLASS[request.status]}`}
													>
														{
															STATUS_DISPLAY[
																request.status
															]
														}
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
					{/*active_section === 'analytics' && <WorkerDashboard />*/}
				</div>
			</div>
		</div>
	)
}

export default WorkerDashboard
