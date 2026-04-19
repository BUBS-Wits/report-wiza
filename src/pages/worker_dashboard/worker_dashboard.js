import { useState, useEffect, useCallback } from 'react'
import { getAuth } from 'firebase/auth'
import { fetch_worker_dashboard_data } from '../../backend/worker_dashboard_service.js'
import './worker_dashboard.css'

const STATUSES = ['All', 'Pending', 'Acknowledged', 'Resolved', 'Closed']

const STATUS_BADGE_CLASS = {
	Pending: 'wd-badge--pending',
	Acknowledged: 'wd-badge--acknowledged',
	Resolved: 'wd-badge--resolved',
	Closed: 'wd-badge--closed',
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function WorkerDashboard() {
	const [dashData, setDashData] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [activeFilter, setActiveFilter] = useState('All')

	const loadDashboard = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const auth = getAuth()
			const user = auth.currentUser
			if (!user) throw new Error('Not authenticated.')

			// Direct call to the client-side Firebase service
			const data = await fetch_worker_dashboard_data(user.uid)
			setDashData(data)
		} catch (err) {
			setError(err.message || 'Failed to load dashboard.')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadDashboard()
	}, [loadDashboard])

	if (loading) return <LoadingScreen />
	if (error) return <ErrorScreen message={error} onRetry={loadDashboard} />
	if (!dashData) return null

	const { worker, requests, stats } = dashData
	const currentUser = getAuth().currentUser

	const filteredRequests =
		activeFilter === 'All'
			? requests
			: requests.filter((r) => r.status === activeFilter)

	const countByStatus = (status) =>
		requests.filter((r) => r.status === status).length

	const awaitingAction = stats.pending + stats.acknowledged
	const resolvedPct =
		stats.total > 0
			? `${Math.round((stats.resolved / stats.total) * 100)}% of assigned`
			: '—'

	return (
		<div className="wd-page">
			{/* ── Header — US-003 ──────────────────────────────────────────── */}
			<header className="wd-header">
				<div className="wd-header-left">
					<span className="wd-app-name">WardWatch</span>
					<span className="wd-header-divider" />
					<span className="wd-header-role">Worker portal</span>
				</div>
				<div className="wd-worker-chip">
					<div className="wd-avatar">
						{(worker?.name ?? currentUser?.displayName ?? 'W')
							.charAt(0)
							.toUpperCase()}
					</div>
					<div>
						<div className="wd-worker-name">
							{worker?.name ??
								currentUser?.displayName ??
								'Municipal Worker'}
						</div>
						<div className="wd-worker-email">
							{worker?.email ?? currentUser?.email}
						</div>
					</div>
				</div>
			</header>

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
							sub={resolvedPct}
							valueModifier="success"
						/>
						<StatCard
							label="Avg. resolution time"
							value={
								<>
									{stats.avg_resolution_days}
									<span className="wd-stat-unit"> d</span>
								</>
							}
							sub="Across resolved requests"
						/>
						<StatCard
							label="Awaiting action"
							value={awaitingAction}
							sub="Pending + acknowledged"
							valueModifier={
								awaitingAction > 0 ? 'warning' : null
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
									onClick={() => setActiveFilter(s)}
									className={`wd-filter-btn${activeFilter === s ? ' wd-filter-btn--active' : ''}`}
								>
									{s}
									{s !== 'All' && (
										<span className="wd-filter-count">
											{countByStatus(s)}
										</span>
									)}
								</button>
							))}
						</div>
					</div>

					<div className="wd-queue-card">
						{filteredRequests.length === 0 ? (
							<EmptyQueue filter={activeFilter} />
						) : (
							filteredRequests.map((req) => (
								<RequestRow key={req.id} req={req} />
							))
						)}
					</div>
				</section>
			</main>
		</div>
	)
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StatCard({ label, value, sub, valueModifier }) {
	const cls = [
		'wd-stat-value',
		valueModifier && `wd-stat-value--${valueModifier}`,
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
	// Safely convert the Firestore Timestamp object into a readable date string
	const displayDate = req.updatedAt?.toMillis
		? new Date(req.updatedAt.toMillis()).toISOString().split('T')[0]
		: req.updatedAt

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
			{/* Render the formatted string instead of the raw object */}
			<span className="wd-req-meta">
				{req.ward} · {displayDate}
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
