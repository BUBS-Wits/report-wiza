import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../firebase_config.js'
import {
	collection,
	query,
	where,
	orderBy,
	onSnapshot,
} from 'firebase/firestore'
import { STATUS, STATUS_DISPLAY } from '../../constants.js'
import {
	verify_worker_and_get_profile,
	compute_worker_stats,
} from '../../backend/worker_analytics_service.js'
import { update_request_status } from '../../backend/worker_firebase.js'
import Worker_nav_bar from '../../components/worker_nav_bar/worker_nav_bar.js'
import ClaimBtn from '../request/claim/claim_btn.js'
import MessageThread from '../../components/message_thread/message_thread.js'
import WorkerMessages from '../worker_messages/worker_messages.js'
import './worker_dashboard.css'

const AVAILABLE_STATUSES = [
	STATUS.ASSIGNED,
	STATUS.IN_PROGRESS,
	STATUS.RESOLVED,
]

const STATUSES = [
	'All',
	STATUS_DISPLAY[STATUS.ASSIGNED],
	STATUS_DISPLAY[STATUS.IN_PROGRESS],
	STATUS_DISPLAY[STATUS.RESOLVED],
	STATUS_DISPLAY[STATUS.CLOSED],
]

const STATUS_BADGE_CLASS = {
	Pending: 'wd-badge--assigned',
	Acknowledged: 'wd-badge--in-progress',
	Resolved: 'wd-badge--resolved',
	Closed: 'wd-badge--closed',
}

export default function WorkerDashboard() {
	const [worker, set_worker] = useState(null)
	const [claimed_requests, set_claimed_requests] = useState([])
	const [unclaimed_requests, set_unclaimed_requests] = useState([])
	const [stats, set_stats] = useState({
		total: 0,
		resolved: 0,
		pending: 0,
		acknowledged: 0,
		avg_resolution_days: null,
	})
	const [loading, set_loading] = useState(true)
	const [error, set_error] = useState(null)
	const [active_filter, set_filter] = useState('All')
	const [active_section, set_active_section] = useState(null)
	const [selected_req, set_selected_req] = useState(null)
	const [panel_visible, set_panel_visible] = useState(false)
	const [show_busy_tip, set_show_busy_tip] = useState(false)
	const [busy_tip, set_busy_tip] = useState('Already Loading Dashboard Info…')
	const navigate = useNavigate()
	const busy_ref = useRef(false)

	const popup_busy = (text) => {
		set_show_busy_tip(true)
		set_busy_tip(text)
		setTimeout(() => set_show_busy_tip(false), 2000)
	}

	/* ── Load dashboard data ──────────────────────────────────────────── */

	const get_claimed_requests = async (uid) => {
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

	const load_dashboard = useCallback(async (uid, load = false) => {
		if (busy_ref.current) {
			popup_busy('Already Loading Dashboard Info...')
			return
		}
		busy_ref.current = true
		set_error(null)
		try {
			load && set_loading(true)
			const { worker, tmp_requests, stats } =
				await fetch_worker_dashboard_data(uid)
			set_worker(worker)
			set_stats(stats)
			const [claimed, unclaimed] = await Promise.all([
				get_claimed_requests(uid),
				get_unclaimed_requests(),
			])
			set_claimed_requests(claimed)
			set_unclaimed_requests(unclaimed)
			return { claimed, unclaimed }
		} catch (err) {
			set_error(err.message || 'Failed to load dashboard.')
		} finally {
			busy_ref.current = false
			load && set_loading(false)
		}
	}, [])

	/* ── Panel helpers ────────────────────────────────────────────────── */

	const open_panel = useCallback((req) => {
		set_selected_req(req)
		requestAnimationFrame(() => set_panel_visible(true))
	}, [])

	const active_section_ref = useRef(active_section)
	useEffect(() => {
		active_section_ref.current = active_section
	}, [active_section])

	const close_panel = useCallback(() => {
		set_panel_visible(false)
		setTimeout(() => set_selected_req(null), 280)
	}, [])

	const toggle_panel = useCallback(
		(req) => {
			if (selected_req?.id === req.id) {
				close_panel()
			} else {
				open_panel(req)
			}
		},
		[selected_req, close_panel, open_panel]
	)

	const set_queue_requests = () => {
		if (busy_ref.current) {
			popup_busy('Already Loading Dashboard Info...')
			return
		}
		set_active_section('queue')
		close_panel()
	}

	const set_available_requests = () => {
		if (busy_ref.current) {
			popup_busy('Already Loading Dashboard Info...')
			return
		}
		set_active_section('available')
		close_panel()
	}
	const set_messages_section = () => {
		if (busy_ref.current) {
			popup_busy('Already Loading Dashboard Info...')
			return
		}
		set_active_section('messages')
		close_panel()
	}

	const set_messages_section = () => {
		if (busy_ref.current) {
			popup_busy('Already Loading Dashboard Info...')
			return
		}
		set_active_section('messages')
		close_panel()
	}

	/* ── Auth ─────────────────────────────────────────────────────────── */

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				set_error('You are not logged in.')
				set_loading(false)
				return
			}
			load_dashboard(user.uid, true).then((data) => {
				if (data) {
					set_requests(data.claimed)
					set_active_section('queue')
				}
			})
			set_loading(false)
		})
		return () => unsub()
	}, [])

	/* Listen for any new additions to the assignments collection directed */
	useEffect(() => {
		if (!worker?.uid) {
			return
		}
		let requests_unsub_list = null
		const chunk = (arr, size) => {
			return Array.from(
				{ length: Math.ceil(arr.length / size) },
				(_, i) => arr.slice(i * size, i * size + size)
			)
		}
		const assignments_query = query(
			collection(db, 'assignments'),
			where('worker_uid', '==', worker.uid)
		)
		const assignments_snapshot_handler = async (assignments_snapshot) => {
			if (requests_unsub_list) {
				requests_unsub_list.forEach((unsub) => unsub())
				requests_unsub_list = null
			}

			const claimed_request_uids = assignments_snapshot.docs.map(
				(doc) => doc.data().request_uid
			)

			const all_claimed_requests = new Map()
			const all_unclaimed_requests = new Map()
			if (claimed_request_uids.length === 0) {
				set_claimed_requests([])
			} else {
				const batches = chunk(claimed_request_uids, 30)

				requests_unsub_list = batches.map((batch) => {
					const claimed_q = query(
						collection(db, 'service_requests'),
						where('__name__', 'in', batch)
					)
					return onSnapshot(claimed_q, (snapshot) => {
						snapshot.docChanges().forEach((change) => {
							const id = change.doc.id
							const data = change.doc.data()

							if (
								change.type === 'added' ||
								change.type === 'modified'
							) {
								all_claimed_requests.set(id, { id, ...data })
							}

							if (change.type === 'removed') {
								all_claimed_requests.delete(id)
							}
						})
						const tmp = [...all_claimed_requests.values()]
						set_claimed_requests(tmp)
						set_stats(compute_worker_stats(tmp))
						console.log('claimed: ', tmp)
					})
				})
			}
			const unclaimed_unsub = onSnapshot(
				query(
					collection(db, 'service_requests'),
					where('status', '==', STATUS.SUBMITTED)
				),
				(snapshot) => {
					const data = snapshot.docs.map((doc) => ({
						id: doc.id,
						...doc.data(),
					}))
					set_unclaimed_requests(data)
					console.log('unclaimed: ', data)
				}
			)

			if (requests_unsub_list) {
				requests_unsub_list.push(unclaimed_unsub)
			} else {
				requests_unsub_list = [unclaimed_unsub]
			}

			console.log('Listeners set...')
		}
		const assigment_unsub = onSnapshot(
			assignments_query,
			assignments_snapshot_handler
		)
		return () => {
			assigment_unsub()
			if (requests_unsub_list) {
				requests_unsub_list.forEach((unsub) => unsub())
			}
		}
	}, [worker?.uid])

	/* ── Close panel on Escape ────────────────────────────────────────── */

	useEffect(() => {
		const on_key = (e) => {
			if (e.key === 'Escape') {
				close_panel()
			}
		}
		window.addEventListener('keydown', on_key)
		return () => window.removeEventListener('keydown', on_key)
	}, [])

	/* ── Guards ───────────────────────────────────────────────────────── */

	if (loading) {
		return <LoadingScreen />
	}

	if (error) {
		return <ErrorScreen message={error} onRetry={() => null} />
	}

	if (!worker || !stats) {
		return null
	}

	/* ── Derived values ───────────────────────────────────────────────── */

	const requests =
		active_section === 'queue' ? claimed_requests : unclaimed_requests

	const filtered_requests =
		active_filter === 'All'
			? requests
			: requests.filter((r) => STATUS_DISPLAY[r.status] === active_filter)

	const count_by_status = (status) =>
		claimed_requests.filter((r) => STATUS_DISPLAY[r.status] === status)
			.length

	const awaiting_action = stats.pending + stats.acknowledged

	const resolved_pct =
		stats.total > 0
			? `${Math.round((stats.resolved / stats.total) * 100)}% of assigned`
			: '—'

	const avg_display =
		stats.avg_resolution_days !== null ? stats.avg_resolution_days : '—'

	/* ── Render ───────────────────────────────────────────────────────── */
	return (
		<div className="wd-page">
			<Worker_nav_bar
				user={{
					uid: worker.uid,
					name: worker.name,
					email: worker.email,
					role: worker.role,
					initials: get_initials(worker.name),
				}}
				requests={{
					claimed: claimed_requests.length,
					unclaimed: unclaimed_requests.length,
				}}
				sections={{
					queue_onclick: set_queue_requests,
					available_onclick: set_available_requests,
					messages_onclick: set_messages_section,
				}}
				active_section={active_section}
			/>

			<BusyToolTip show_busy_tip={show_busy_tip} busy_tip={busy_tip} />

			<div
				className={`wd-layout${selected_req ? ' wd-layout--panel-open' : ''}`}
			>
				<main className="wd-main">
					{active_section === 'messages' ? (
						<WorkerMessages
							worker={worker}
							requests={[
								...claimed_requests,
								...unclaimed_requests,
							]}
						/>
					) : (
						<>
							{/* ── Performance summary ─────────────────────────────── */}
							<section className="wd-section">
								<h2 className="wd-section-title">
									Performance summary
								</h2>
								<div className="wd-stats-grid">
									<StatCard
										label={
											'Total ' +
											STATUS_DISPLAY[STATUS.ASSIGNED]
										}
										value={stats.total}
										sub="All time"
									/>
									<StatCard
										label={STATUS_DISPLAY[STATUS.RESOLVED]}
										value={stats.resolved}
										sub={resolved_pct}
										value_modifier="success"
									/>
									<StatCard
										label="Avg. resolution time"
										value={
											avg_display !== '—' ? (
												<>
													{avg_display}
													<span className="wd-stat-unit">
														{' '}
														d
													</span>
												</>
											) : (
												'—'
											)
										}
										sub="Across resolved requests"
									/>
									<StatCard
										label="Awaiting action"
										value={awaiting_action}
										sub={`${STATUS_DISPLAY[STATUS.ASSIGNED]} + ${STATUS_DISPLAY[STATUS.IN_PROGRESS]}`}
										value_modifier={
											awaiting_action > 0
												? 'warning'
												: null
										}
									/>
								</div>
							</section>

							{/* ── Request queue ───────────────────────────────────── */}
							<section className="wd-section">
								<div className="wd-queue-top-row">
									<h2
										className="wd-section-title"
										style={{ marginBottom: 0 }}
									>
										{active_section === 'queue'
											? 'Assigned request queue'
											: 'Available requests'}
									</h2>
									{active_section === 'queue' && (
										<div className="wd-filter-row">
											{STATUSES.map((s) => (
												<button
													key={s}
													onClick={() =>
														set_filter(s)
													}
													className={`wd-filter-btn${active_filter === s ? ' wd-filter-btn--active' : ''}`}
												>
													{s}
													{s !== 'All' && (
														<span className="wd-filter-count">
															{count_by_status(s)}
														</span>
													)}
												</button>
											))}
										</div>
									)}
								</div>

								<div className="wd-queue-card">
									{filtered_requests.length === 0 ? (
										<EmptyQueue filter={active_filter} />
									) : (
										filtered_requests.map((req) => (
											<RequestRow
												key={req.id}
												req={req}
												is_selected={
													selected_req?.id === req.id
												}
												on_click={() =>
													toggle_panel(req)
												}
											/>
										))
									)}
								</div>
							</section>
						</>
					)}
				</main>

				{/* ── Slide-in detail + message panel ─────────────────────── */}
				{selected_req && (
					<aside
						className={`wd-detail-panel${panel_visible ? ' wd-detail-panel--visible' : ''}`}
						aria-label="Request detail and messaging"
					>
						<RequestDetailPanel
							req={selected_req}
							worker={worker}
							on_close={close_panel}
							active_section={active_section}
							popup_busy={popup_busy}
						/>
					</aside>
				)}
			</div>

			{/* ── Mobile backdrop ─────────────────────────────────────────── */}
			{selected_req && (
				<div
					className={`wd-backdrop${panel_visible ? ' wd-backdrop--visible' : ''}`}
					onClick={close_panel}
					aria-hidden="true"
				/>
			)}
		</div>
	)
}

/* ── RequestDetailPanel ──────────────────────────────────────────────────── */

function RequestDetailPanel({
	req,
	worker,
	on_close,
	active_section,
	popup_busy,
}) {
	const updating = useRef(false)
	const navigate = useNavigate()

	const display_date = req.updated_at
		? new Date(req.updated_at).toISOString().split('T')[0]
		: req.created_at
			? new Date(req.created_at).toISOString().split('T')[0]
			: '-'

	const resident_name = req.resident_name || 'Resident'

	const post_claim = async () => {
		navigate('/worker-dashboard')
	}

	const on_status_change = async (req_uid, new_status) => {
		if (updating.current === true) {
			return
		}
		updating.current = true
		try {
			const ret = await update_request_status(req_uid, new_status)
			popup_busy('Successfully updated request status.')
		} catch (err) {
			console.error(err)
			popup_busy(err.message || 'Failed to update request status.')
		} finally {
			updating.current = false
			on_close()
		}
	}

	return (
		<div className="wd-panel-inner">
			{/* Header */}
			<div className="wd-panel-header">
				<div className="wd-panel-header-left">
					<span className="wd-panel-req-id">{req.id}</span>
					<span
						className={`wd-badge ${STATUS_BADGE_CLASS[req.status] ?? ''}`}
					>
						{STATUS_DISPLAY[req.status]}
					</span>
				</div>
				<button
					className="wd-panel-close"
					onClick={on_close}
					aria-label="Close panel"
				>
					<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path
							d="M3 3l10 10M13 3L3 13"
							stroke="currentColor"
							strokeWidth="1.75"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			</div>

			{/* Metadata */}
			<dl className="wd-panel-meta">
				<div className="wd-panel-meta-row">
					<dt className="wd-panel-meta-label">Category</dt>
					<dd className="wd-panel-meta-value">{req.category}</dd>
				</div>
				<div className="wd-panel-meta-row">
					<dt className="wd-panel-meta-label">Province</dt>
					<dd className="wd-panel-meta-value">{req.sa_province}</dd>
				</div>
				<div className="wd-panel-meta-row">
					<dt className="wd-panel-meta-label">Municipality</dt>
					<dd className="wd-panel-meta-value">{req.sa_m_name}</dd>
				</div>
				<div className="wd-panel-meta-row">
					<dt className="wd-panel-meta-label">Ward</dt>
					<dd className="wd-panel-meta-value">{req.sa_ward}</dd>
				</div>
				<div className="wd-panel-meta-row">
					<dt className="wd-panel-meta-label">Created At</dt>
					<dd className="wd-panel-meta-value">
						{req.created_at
							? new Date(req.created_at)
									.toISOString()
									.split('T')[0]
							: '-'}
					</dd>
				</div>
				<div className="wd-panel-meta-row">
					<dt className="wd-panel-meta-label">Last Updated At</dt>
					<dd className="wd-panel-meta-value">{display_date}</dd>
				</div>
				<div className="wd-panel-meta-row wd-panel-meta-row--full">
					<dt className="wd-panel-meta-label">Description</dt>
					<dd className="wd-panel-meta-value wd-panel-meta-desc">
						{req.description}
					</dd>
				</div>
				<div className="wd-panel-meta-row wd-panel-meta-row--full">
					<dt className="wd-panel-meta-label">Status</dt>
					<dd className="wd-panel-meta-value wd-panel-meta-desc">
						{STATUS_DISPLAY[req.status]}
					</dd>
				</div>
			</dl>

			{active_section === 'queue' ? (
				<>
					{/* Status update */}
					<div className="wd-panel-divider">
						<span>Update Status</span>
					</div>
					<div className="wd-panel-status-row">
						{AVAILABLE_STATUSES.map((status) => (
							<button
								key={status}
								className={`wd-status-opt${req.status === status ? ' wd-status-opt--active' : ''}`}
								onClick={() => on_status_change(req.id, status)}
								disabled={req.status === status}
							>
								{STATUS_DISPLAY[status]}
							</button>
						))}
					</div>

					{/* Section label */}
					<div className="wd-panel-divider">
						<span>Conversation with resident</span>
					</div>

					{/* MessageThread */}
					<div className="wd-panel-thread">
						{req.user_uid ? (
							<MessageThread
								request_id={req.id}
								current_uid={worker.uid}
								current_name={worker.name}
								current_role="worker"
								other_uid={req.user_uid}
								other_name={resident_name}
							/>
						) : (
							<p className="wd-panel-no-resident">
								Resident information unavailable — messaging is
								disabled for this request.
							</p>
						)}
					</div>
				</>
			) : (
				<ClaimBtn request_uid={req.id} post_claim={post_claim} />
			)}
		</div>
	)
}

/* ── Utility ─────────────────────────────────────────────────────────────── */

function get_initials(name = '') {
	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0].toUpperCase())
		.join('')
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StatCard({ label, value, sub, value_modifier }) {
	const cls = [
		'wd-stat-value',
		value_modifier && `wd-stat-value--${value_modifier}`,
	]
		.filter(Boolean)
		.join(' ')

	return (
		<div className="wd-stat-card">
			<div className="wd-stat-label">{label}</div>
			<div className={cls}>{value}</div>
			<div className="wd-stat-sub">{sub}</div>
		</div>
	)
}

function RequestRow({ req, is_selected, on_click }) {
	const display_date = req.updated_at
		? new Date(req.updated_at).toISOString().split('T')[0]
		: req.created_at
			? new Date(req.created_at).toISOString().split('T')[0]
			: '-'

	return (
		<button
			className={`wd-req-row${is_selected ? ' wd-req-row--selected' : ''}`}
			onClick={on_click}
			aria-pressed={is_selected}
			aria-label={`Open request ${req.id} — ${req.category}, ${STATUS_DISPLAY[req.status]}`}
		>
			<span className="wd-req-id">{req.id}</span>
			<span className="wd-req-cat">{req.category}</span>
			<span className="wd-req-desc">{req.description}</span>
			<span
				className={`wd-badge ${STATUS_BADGE_CLASS[req.status] ?? ''}`}
			>
				{STATUS_DISPLAY[req.status]}
			</span>
			<span className="wd-req-meta">
				{req.sa_ward} · {display_date}
			</span>
			<span className="wd-req-chevron" aria-hidden="true">
				›
			</span>
		</button>
	)
}

function EmptyQueue({ filter }) {
	return (
		<div className="wd-empty-queue">
			No {filter === 'All' ? '' : `${filter.toLowerCase()} `}requests
			assigned to you.
		</div>
	)
}

function LoadingScreen() {
	return (
		<div className="wd-centered-screen">
			<div className="wd-loading-text">Loading dashboard…</div>
		</div>
	)
}

function ErrorScreen({ message, onRetry }) {
	return (
		<div className="wd-centered-screen">
			<div className="wd-error-text">{message}</div>
			<button className="wd-retry-btn" onClick={onRetry}>
				Try again
			</button>
		</div>
	)
}

function BusyToolTip({ show_busy_tip, busy_tip }) {
	return (
		<div
			className="wd-busy-tooltip"
			style={{ position: 'relative', display: 'inline-block' }}
		>
			{show_busy_tip && <div className="wd-tooltip">{busy_tip}</div>}
		</div>
	)
}
