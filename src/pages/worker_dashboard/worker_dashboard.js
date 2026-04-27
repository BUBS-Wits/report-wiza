import React, { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase_config.js'
import { fetch_worker_dashboard_data } from '../../backend/worker_dashboard_service.js'
import Worker_nav_bar from '../../components/worker_nav_bar/worker_nav_bar.js'
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

	/* ── Wait for Firebase Auth, then load ────────────────────────────── */

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

	/* ── Loading / error guards ───────────────────────────────────────── */

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

	/* ── Derived display values ───────────────────────────────────────── */

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

			<main className="wd-main">
				{/* ── Performance summary — US-049 ─────────────────────────── */}
				<section className="wd-section">
					<h2 className="wd-section-title">Performance summary</h2>
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
										<span className="wd-stat-unit"> d</span>
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

				{/* ── Assigned request queue — US-022 ──────────────────────── */}
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
								<RequestRow key={req.id} req={req} />
							))
						)}
					</div>
				</section>
			</main>
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

function RequestRow({ req }) {
	const display_date = req.updatedAt?.toMillis
		? new Date(req.updatedAt.toMillis()).toISOString().split('T')[0]
		: (req.updatedAt ?? '—')

	return (
		<div className="wd-req-row">
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
		</div>
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
