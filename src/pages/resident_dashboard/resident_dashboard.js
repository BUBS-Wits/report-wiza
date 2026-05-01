import React, { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { Link, useLocation } from 'react-router-dom'
import { auth } from '../../firebase_config.js'
import {
	fetch_resident_profile,
	fetch_resident_requests,
	subscribe_to_resident_unread_count,
} from '../../backend/resident_dashboard_service.js'
import { STATUS, STATUS_DISPLAY } from '../../constants.js'
import MessageThread from '../../components/message_thread/message_thread.js'
import './resident_dashboard.css'

/* ── Status config ───────────────────────────────────────────────────────── */

const STATUS_META = {
	[STATUS.SUBMITTED]: {
		label: STATUS_DISPLAY[STATUS.SUBMITTED],
		cls: 'rd-status--pending',
	},
	[STATUS.ASSIGNED]: {
		label: STATUS_DISPLAY[STATUS.ASSIGNED],
		cls: 'rd-status--acknowledged',
	},
	[STATUS.IN_PROGRESS]: {
		label: STATUS_DISPLAY[STATUS.IN_PROGRESS],
		cls: 'rd-status--acknowledged',
	},
	[STATUS.RESOLVED]: {
		label: STATUS_DISPLAY[STATUS.RESOLVED],
		cls: 'rd-status--resolved',
	},
	[STATUS.CLOSED]: {
		label: STATUS_DISPLAY[STATUS.CLOSED],
		cls: 'rd-status--closed',
	},
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function format_date(ts) {
	if (!ts) {
		return '—'
	}
	const d = ts.toDate ? ts.toDate() : new Date(ts)
	return d.toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

function get_initials(name = '') {
	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0].toUpperCase())
		.join('')
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function ResidentDashboard() {
	const location = useLocation()

	const [resident, set_resident] = useState(null)
	const [requests, set_requests] = useState([])
	const [selected_id, set_selected_id] = useState(null)
	const [unread_total, set_unread_total] = useState(0)
	const [loading, set_loading] = useState(true)
	const [error, set_error] = useState(null)
	const [logging_out, set_logging_out] = useState(false)

	/* ── Load ─────────────────────────────────────────────────────────── */

	const load = useCallback(async (uid) => {
		set_loading(true)
		set_error(null)
		try {
			const [profile, reqs] = await Promise.all([
				fetch_resident_profile(uid),
				fetch_resident_requests(uid),
			])
			set_resident(profile)
			set_requests(reqs)
			if (reqs.length > 0) {
				set_selected_id(reqs[0].id)
			}
		} catch (err) {
			set_error(err.message || 'Failed to load your dashboard.')
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
			load(user.uid)
		})
		return unsub
	}, [load])

	/* ── Unread count ─────────────────────────────────────────────────── */

	useEffect(() => {
		if (!resident) {
			return
		}
		return subscribe_to_resident_unread_count(
			resident.uid,
			set_unread_total
		)
	}, [resident])

	/* ── Logout ───────────────────────────────────────────────────────── */

	const handle_logout = async () => {
		set_logging_out(true)
		await signOut(auth)
	}

	/* ── Derived ──────────────────────────────────────────────────────── */

	const selected_req = requests.find((r) => r.id === selected_id) ?? null

	/* ── Guards ───────────────────────────────────────────────────────── */

	if (loading) {
		return (
			<div className="rd-fullscreen">
				<div className="rd-spinner" />
				<p className="rd-loading-text">Loading your dashboard…</p>
			</div>
		)
	}

	if (error) {
		return (
			<div className="rd-fullscreen">
				<p className="rd-error-text">{error}</p>
			</div>
		)
	}

	/* ── Render ───────────────────────────────────────────────────────── */

	return (
		<div className="rd-page">
			{/* ── Top bar ──────────────────────────────────────────────── */}
			<header className="rd-topbar">
				{/* Brand */}
				<div className="rd-topbar-brand">
					<span className="rd-brand-mark" aria-hidden="true">
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
						>
							<path
								d="M2 4h12M2 8h8M2 12h10"
								stroke="#fff"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</span>
					<span className="rd-brand-name">Report-wiza</span>
				</div>

				{/* Nav links */}
				<nav className="rd-topbar-nav" aria-label="Resident navigation">
					<Link
						to="/resident-dashboard"
						className={`rd-nav-link${location.pathname === '/resident-dashboard' ? ' rd-nav-link--active' : ''}`}
					>
						<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<rect
								x="1"
								y="1"
								width="6"
								height="6"
								rx="1"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<rect
								x="9"
								y="1"
								width="6"
								height="6"
								rx="1"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<rect
								x="1"
								y="9"
								width="6"
								height="6"
								rx="1"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<rect
								x="9"
								y="9"
								width="6"
								height="6"
								rx="1"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
						</svg>
						My Requests
						{unread_total > 0 && (
							<span
								className="rd-nav-badge"
								aria-label={`${unread_total} unread`}
							>
								{unread_total}
							</span>
						)}
					</Link>

					<Link
						to="/request"
						className={`rd-nav-link rd-nav-link--submit${location.pathname === '/request' ? ' rd-nav-link--active' : ''}`}
					>
						<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<circle
								cx="8"
								cy="8"
								r="6"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<path
								d="M8 5v6M5 8h6"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
						Submit Request
					</Link>
				</nav>

				{/* Right cluster */}
				<div className="rd-topbar-right">
					<div className="rd-user-chip">
						<span className="rd-avatar">
							{get_initials(resident?.name ?? '')}
						</span>
						<span className="rd-user-name">
							{resident?.name ?? 'Resident'}
						</span>
					</div>

					<button
						className="rd-logout-btn"
						onClick={handle_logout}
						disabled={logging_out}
						aria-label="Log out"
					>
						<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path
								d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
							/>
							<path
								d="M11 11l3-3-3-3M14 8H6"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						{logging_out ? 'Logging out…' : 'Logout'}
					</button>
				</div>
			</header>

			{/* ── Main layout ──────────────────────────────────────────── */}
			<div className="rd-layout">
				{/* ── LEFT: request list ───────────────────────────────── */}
				<aside className="rd-sidebar">
					<div className="rd-sidebar-heading">
						<h2 className="rd-sidebar-title">My Requests</h2>
						<span className="rd-req-count">{requests.length}</span>
					</div>

					{requests.length === 0 ? (
						<div className="rd-no-requests">
							<p>
								You haven&apos;t submitted any service requests
								yet.
							</p>
							<Link to="/request" className="rd-no-requests-cta">
								Submit your first request →
							</Link>
						</div>
					) : (
						<div className="rd-req-list">
							{requests.map((req, i) => (
								<RequestCard
									key={req.id}
									req={req}
									is_selected={req.id === selected_id}
									on_click={() => set_selected_id(req.id)}
									index={i}
								/>
							))}
						</div>
					)}
				</aside>

				{/* ── RIGHT: detail + messaging ────────────────────────── */}
				<main className="rd-main">
					{selected_req ? (
						<RequestDetail req={selected_req} resident={resident} />
					) : (
						<div className="rd-main-empty">
							<p>
								Select a request to view details and messages.
							</p>
						</div>
					)}
				</main>
			</div>
		</div>
	)
}

/* ── RequestCard ─────────────────────────────────────────────────────────── */

function RequestCard({ req, is_selected, on_click, index }) {
	const meta = STATUS_META[req.status] ?? { label: req.status, cls: '' }

	return (
		<button
			className={`rd-req-card${is_selected ? ' rd-req-card--selected' : ''}`}
			onClick={on_click}
			aria-pressed={is_selected}
			style={{ animationDelay: `${index * 55}ms` }}
		>
			<div className="rd-req-card-top">
				<span className="rd-req-category">{req.category}</span>
				<span className={`rd-status-pill ${meta.cls}`}>
					{meta.label}
				</span>
			</div>
			<p className="rd-req-desc">{req.description}</p>
			<div className="rd-req-card-bottom">
				<span className="rd-req-ward">{req.sa_ward}</span>
				<span className="rd-req-date">
					{format_date(req.created_at)}
				</span>
			</div>
		</button>
	)
}

/* ── RequestDetail ───────────────────────────────────────────────────────── */

function RequestDetail({ req, resident }) {
	const meta = STATUS_META[req.status] ?? { label: req.status, cls: '' }
	const has_worker = !!req.assigned_worker_uid

	return (
		<div className="rd-detail">
			<div className="rd-detail-header">
				<div className="rd-detail-header-left">
					<h2 className="rd-detail-title">{req.category}</h2>
					<span className="rd-detail-id">{req.id}</span>
				</div>
				<span
					className={`rd-status-pill rd-status-pill--lg ${meta.cls}`}
				>
					{meta.label}
				</span>
			</div>

			<dl className="rd-detail-meta">
				<div className="rd-detail-meta-item">
					<dt>Ward</dt>
					<dd>{req.sa_ward || '—'}</dd>
				</div>
				<div className="rd-detail-meta-item">
					<dt>Submitted</dt>
					<dd>{format_date(req.created_at)}</dd>
				</div>
				<div className="rd-detail-meta-item">
					<dt>Last updated</dt>
					<dd>{format_date(req.updated_at)}</dd>
				</div>
				<div className="rd-detail-meta-item">
					<dt>Assigned worker</dt>
					<dd>
						{req.worker_name ?? (
							<span className="rd-unassigned">
								Not yet assigned
							</span>
						)}
					</dd>
				</div>
				<div className="rd-detail-meta-item rd-detail-meta-item--full">
					<dt>Description</dt>
					<dd>{req.description}</dd>
				</div>
			</dl>

			<div className="rd-section-divider">
				<span>Messages</span>
			</div>

			<div className="rd-thread-wrap">
				{has_worker ? (
					<MessageThread
						request_id={req.id}
						current_uid={resident.uid}
						current_name={resident.name}
						current_role="resident"
						other_uid={req.assigned_worker_uid}
						other_name={req.worker_name ?? 'Worker'}
					/>
				) : (
					<div className="rd-no-worker">
						<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<path
								d="M12 8v4M12 16h.01"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
						<p>
							Messaging will be available once a worker is
							assigned to this request.
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
