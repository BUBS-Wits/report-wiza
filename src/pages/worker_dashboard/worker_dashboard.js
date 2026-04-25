import React, { useState, useEffect, useCallback } from 'react'
import Worker_nav_bar from '../../components/worker_nav_bar/worker_nav_bar.js'
import './worker_dashboard.css'
import { getAuth } from 'firebase/auth'

const STATUSES = ['All', 'Pending', 'Acknowledged', 'Resolved', 'Closed']

const STATUS_BADGE_CLASS = {
	Pending: 'wd-badge--pending',
	Acknowledged: 'wd-badge--acknowledged',
	Resolved: 'wd-badge--resolved',
	Closed: 'wd-badge--closed',
}

/* ── Mock data ───────────────────────────────────────────────────────────── */

const MOCK_DATA = {
	worker: {
		name: 'Thabo Nkosi',
		email: 'thabo.nkosi@joburg.gov.za',
		role: 'Field Worker',
	},
	stats: {
		total: 34,
		resolved: 21,
		avg_resolution_days: 3.2,
		pending: 6,
		acknowledged: 4,
	},
	requests: [
		{
			id: 'REQ-0091',
			category: 'Water & Sanitation',
			description: 'Burst pipe flooding pavement on Main Rd near Pick n Pay',
			status: 'Pending',
			ward: 'Ward 12',
			updatedAt: '2025-04-22',
		},
		{
			id: 'REQ-0088',
			category: 'Electricity',
			description: 'Street light out for 3 weeks — Linden Ave, corner 4th St',
			status: 'Acknowledged',
			ward: 'Ward 12',
			updatedAt: '2025-04-21',
		},
		{
			id: 'REQ-0085',
			category: 'Roads & Stormwater',
			description: 'Large pothole causing vehicle damage on Ontdekkers Rd',
			status: 'Acknowledged',
			ward: 'Ward 15',
			updatedAt: '2025-04-20',
		},
		{
			id: 'REQ-0079',
			category: 'Waste Management',
			description: 'Illegal dumping site at end of Brickfield Rd — growing weekly',
			status: 'Pending',
			ward: 'Ward 12',
			updatedAt: '2025-04-19',
		},
		{
			id: 'REQ-0074',
			category: 'Parks & Recreation',
			description: 'Broken swing set in Linden Park is a safety hazard for children',
			status: 'Resolved',
			ward: 'Ward 15',
			updatedAt: '2025-04-17',
		},
		{
			id: 'REQ-0070',
			category: 'Water & Sanitation',
			description: 'Manhole cover missing on 3rd Ave — risk of injury',
			status: 'Resolved',
			ward: 'Ward 12',
			updatedAt: '2025-04-14',
		},
		{
			id: 'REQ-0063',
			category: 'Electricity',
			description: 'Exposed wiring on pole outside school — urgent safety concern',
			status: 'Resolved',
			ward: 'Ward 15',
			updatedAt: '2025-04-10',
		},
		{
			id: 'REQ-0055',
			category: 'Roads & Stormwater',
			description: 'Collapsed stormwater drain causing flooding in heavy rain',
			status: 'Closed',
			ward: 'Ward 12',
			updatedAt: '2025-04-02',
		},
		{
			id: 'REQ-0049',
			category: 'Waste Management',
			description: 'Bin collection skipped for two consecutive weeks — Ward 15',
			status: 'Closed',
			ward: 'Ward 15',
			updatedAt: '2025-03-28',
		},
		{
			id: 'REQ-0041',
			category: 'Electricity',
			description: 'Transformer fault causing intermittent power cuts — block 7',
			status: 'Pending',
			ward: 'Ward 12',
			updatedAt: '2025-03-24',
		},
	],
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
			// ── Swap this block out for the real Firebase call when ready ──
			await new Promise((r) => setTimeout(r, 600)) // simulate network
			setDashData(MOCK_DATA)
			// const auth = getAuth()
			// const user = auth.currentUser
			// if (!user) throw new Error('Not authenticated.')
			// const data = await fetch_worker_dashboard_data(user.uid)
			// setDashData(data)
			// ──────────────────────────────────────────────────────────────
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
			<Worker_nav_bar user={worker} />

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
							valueModifier={awaitingAction > 0 ? 'warning' : null}
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
	const displayDate = req.updatedAt?.toMillis
		? new Date(req.updatedAt.toMillis()).toISOString().split('T')[0]
		: req.updatedAt

	return (
		<div className="wd-req-row">
			<span className="wd-req-id">{req.id}</span>
			<span className="wd-req-cat">{req.category}</span>
			<span className="wd-req-desc">{req.description}</span>
			<span className={`wd-badge ${STATUS_BADGE_CLASS[req.status] ?? ''}`}>
				{req.status}
			</span>
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