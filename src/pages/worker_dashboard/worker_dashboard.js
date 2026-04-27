import React, { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase_config.js'
import { fetch_worker_dashboard_data } from '../../backend/worker_dashboard_service.js'
import Worker_nav_bar from '../../components/worker_nav_bar/worker_nav_bar.js'
import MessageThread from '../../components/message_thread/message_thread.js'
import './worker_dashboard.css'

/* ── Constants ───────────────────────────────────────────────────────────── */

const STATUSES = ['All', 'Pending', 'Acknowledged', 'Resolved', 'Closed']

const STATUS_BADGE_CLASS = {
	Pending: 'wd-badge--pending',
	Acknowledged: 'wd-badge--acknowledged',
	Resolved: 'wd-badge--resolved',
	Closed: 'wd-badge--closed',
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function WorkerDashboard() {
	const [worker, set_worker] = useState(null)
	const [requests, set_requests] = useState([])
	const [stats, set_stats] = useState(null)
	const [loading, set_loading] = useState(true)
	const [error, set_error] = useState(null)
	const [active_filter, set_filter] = useState('All')
	const [selected_req, set_selected_req] = useState(null) // drives the panel
	const [panel_visible, set_panel_visible] = useState(false) // drives CSS transition

	/* ── Load dashboard data ──────────────────────────────────────────── */

	const load_dashboard = useCallback(async (uid) => {
		set_loading(true)
		set_error(null)
		try {
			const { worker, requests, stats } =
				await fetch_worker_dashboard_data(uid)
			set_worker(worker)
			set_requests(requests)
			set_stats(stats)
		} catch (err) {
			set_error(err.message || 'Failed to load dashboard.')
		} finally {
			set_loading(false)
		}
	}, [])

	/* ── Auth ─────────────────────────────────────────────────────────── */

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, (user) => {
			if (!user) {
				set_error('You are not logged in.')
				set_loading(false)
				return
			}
			load_dashboard(user.uid)
		})
		return unsub
	}, [load_dashboard])

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

	/* ── Panel helpers ────────────────────────────────────────────────── */

	const open_panel = (req) => {
		set_selected_req(req)
		requestAnimationFrame(() => set_panel_visible(true))
	}

	const close_panel = () => {
		set_panel_visible(false)
		setTimeout(() => set_selected_req(null), 280)
	}

	const toggle_panel = (req) => {
		if (selected_req?.id === req.id) {
			close_panel()
		} else {
			open_panel(req)
		}
	}

	/* ── Guards ───────────────────────────────────────────────────────── */

	if (loading) {
		return <LoadingScreen />
	}

	if (error) {
		return (
			<ErrorScreen
				message={error}
				onRetry={() => load_dashboard(auth.currentUser?.uid)}
			/>
		)
	}

	if (!worker || !stats) {
		return null
	}

	/* ── Derived values ───────────────────────────────────────────────── */

	const filtered_requests =
		active_filter === 'All'
			? requests
			: requests.filter((r) => r.status === active_filter)

	const count_by_status = (status) =>
		requests.filter((r) => r.status === status).length

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
			/>

			{/*
			  wd-layout shifts the main content left when the panel is open,
			  making room for the slide-in panel alongside it on desktop.
			  On mobile the panel overlays on top of the backdrop.
			*/}
			<div
				className={`wd-layout${selected_req ? ' wd-layout--panel-open' : ''}`}
			>
				<main className="wd-main">
					{/* ── Performance summary ─────────────────────────────── */}
					<section className="wd-section">
						<h2 className="wd-section-title">
							Performance summary
						</h2>
						<div className="wd-stats-grid">
							<StatCard
								label="Total assigned"
								value={stats.total}
								sub="All time"
							/>
							<StatCard
								label="Resolved"
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
								sub="Pending + acknowledged"
								value_modifier={
									awaiting_action > 0 ? 'warning' : null
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
								Assigned request queue
							</h2>
							<div className="wd-filter-row">
								{STATUSES.map((s) => (
									<button
										key={s}
										onClick={() => set_filter(s)}
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
										on_click={() => toggle_panel(req)}
									/>
								))
							)}
						</div>
					</section>
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

/**
 * Rendered inside the slide-in panel when a row is clicked.
 * Shows request metadata then embeds MessageThread.
 *
 * Expects these extra fields on req (beyond what RequestRow uses):
 *   req.user_uid       {string}  Firebase UID of the resident — required for messaging
 *   req.resident_name  {string}  Display name of the resident — optional
 */
function RequestDetailPanel({ req, worker, on_close }) {
	const display_date = req.updatedAt?.toMillis
		? new Date(req.updatedAt.toMillis()).toISOString().split('T')[0]
		: (req.updatedAt ?? '—')

	const resident_name = req.resident_name || 'Resident'

	return (
		<div className="wd-panel-inner">
			{/* Header */}
			<div className="wd-panel-header">
				<div className="wd-panel-header-left">
					<span className="wd-panel-req-id">{req.id}</span>
					<span
						className={`wd-badge ${STATUS_BADGE_CLASS[req.status] ?? ''}`}
					>
						{req.status}
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
					<dt className="wd-panel-meta-label">Ward</dt>
					<dd className="wd-panel-meta-value">{req.ward}</dd>
				</div>
				<div className="wd-panel-meta-row">
					<dt className="wd-panel-meta-label">Last updated</dt>
					<dd className="wd-panel-meta-value">{display_date}</dd>
				</div>
				<div className="wd-panel-meta-row wd-panel-meta-row--full">
					<dt className="wd-panel-meta-label">Description</dt>
					<dd className="wd-panel-meta-value wd-panel-meta-desc">
						{req.description}
					</dd>
				</div>
			</dl>

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
						Resident information unavailable — messaging is disabled
						for this request.
					</p>
				)}
			</div>
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

/**
 * RequestRow — now a <button> so it's keyboard-accessible.
 * New props vs the original:
 *   is_selected  {boolean}   highlights the row while its panel is open
 *   on_click     {function}  toggles the detail panel
 */
function RequestRow({ req, is_selected, on_click }) {
	const display_date = req.updatedAt?.toMillis
		? new Date(req.updatedAt.toMillis()).toISOString().split('T')[0]
		: (req.updatedAt ?? '—')

	return (
		<button
			className={`wd-req-row${is_selected ? ' wd-req-row--selected' : ''}`}
			onClick={on_click}
			aria-pressed={is_selected}
			aria-label={`Open request ${req.id} — ${req.category}, ${req.status}`}
		>
			<span className="wd-req-id">{req.id}</span>
			<span className="wd-req-cat">{req.category}</span>
			<span className="wd-req-desc">{req.description}</span>
			<span
				className={`wd-badge ${STATUS_BADGE_CLASS[req.status] ?? ''}`}
			>
				{req.status}
			</span>
			<span className="wd-req-meta">
				{req.ward} · {display_date}
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
