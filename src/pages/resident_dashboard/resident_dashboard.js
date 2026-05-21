import React, { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../../firebase_config.js'
import {
	fetch_resident_profile,
	subscribe_to_resident_requests,
	subscribe_to_resident_unread_count,
} from '../../backend/resident_dashboard_service.js'
import { subscribe_to_request_lock } from '../../backend/admin_messaging_service.js'   // ← add
import { STATUS, STATUS_DISPLAY } from '../../constants.js'
import MessageThread from '../../components/message_thread/message_thread.js'
import './resident_dashboard.css'
import LikeButton from '../../components/request_card/like_button/like_button.js'
import FeedbackForm from '../../components/feedback_form/feedback_form.js'
import NotificationBell from '../../components/notification_bell/notification_bell.js'
import MessageDisplay from '../../components/message_modal/message_modal.js'
import { useMessages } from '../../components/message_modal/message_modal.js'

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
	const navigate = useNavigate()
	const { messages, addMessage, removeMessage, clearMessages } = useMessages()
	const [resident, set_resident] = useState(null)
	const [requests, set_requests] = useState([])
	const [selected_id, set_selected_id] = useState(null)
	const [unread_total, set_unread_total] = useState(0)
	const [loading, set_loading] = useState(true)
	const [error, set_error] = useState(null)
	const [logging_out, set_logging_out] = useState(false)

	const load = useCallback(async (uid) => {
		set_loading(true)
		set_error(null)
		try {
			const [profile, reqs] = await Promise.all([
				fetch_resident_profile(uid),
				subscribe_to_resident_requests(uid, set_requests),
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

useEffect(() => {
        let unsubscribe_requests = null;

        const unsub_auth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                set_error('You are not logged in.');
                set_loading(false);
                if (unsubscribe_requests) unsubscribe_requests();
                return;
            }

            set_loading(true);
            set_error(null);

            try {
                // 1. Fetch the static profile data once
                const profile = await fetch_resident_profile(user.uid);
                set_resident(profile);

                // 2. Start the live listener for requests
                unsubscribe_requests = subscribe_to_resident_requests(user.uid, (live_reqs) => {
                    set_requests(live_reqs);
                    
                    // Auto-select the first request if nothing is selected yet
                    set_selected_id((prev_selected) => {
                        if (!prev_selected && live_reqs.length > 0) {
                            return live_reqs[0].id;
                        }
                        return prev_selected;
                    });

                    set_loading(false); // Stop loading once the first live snapshot arrives
                });

            } catch (err) {
                console.error(err);
                set_error(err.message || 'Failed to load your dashboard.');
                set_loading(false);
            }
        });

        // 3. Cleanup function when component unmounts
        return () => {
            unsub_auth(); // Stop listening to Auth
            if (unsubscribe_requests) unsubscribe_requests(); // Stop listening to Firestore
        };
    }, []); // Empty dependency array so this setup only runs once on mount


    // Keep your unread messages useEffect just below it:
    useEffect(() => {
        if (!resident) return;
        return subscribe_to_resident_unread_count(
            resident.uid,
            set_unread_total
        );
    }, [resident]);

	useEffect(() => {
		if (!resident) {
			return
		}
		return subscribe_to_resident_unread_count(
			resident.uid,
			set_unread_total
		)
	}, [resident])

	const handle_logout = async () => {
		set_logging_out(true)
		await signOut(auth)
		navigate('/')
	}

	// NEW: Cancel an unassigned request
	const cancelRequest = async (requestId) => {
		try {
			const user = auth.currentUser
			if (!user) {
				return
			}
			const token = await user.getIdToken()

			const res = await fetch('/api/cancel-request', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ requestId }),
			})

			if (!res.ok) {
				const errData = await res.json()
				alert(errData.error || 'Failed to cancel request')
				return
			}

			// If the deleted request was selected, select another one
			if (selected_id === requestId) {
				set_requests((prev) => {
					const remaining = prev.filter((r) => r.id !== requestId)
					set_selected_id(
						remaining.length > 0 ? remaining[0].id : null
					)
					return remaining
				})
			}

			alert('Request cancelled successfully.')
		} catch (err) {
			console.error('Cancel error:', err)
			alert('An error occurred while cancelling the request.')
		}
	}

	const selected_req = requests.find((r) => r.id === selected_id) ?? null

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
			<ErrorScreen
				message={error}
				onRetry={() => navigate('/login')}
				onGoHome={() => navigate('/')}
			/>
		)
	}

	return (
		<div className="rd-page">
			<header className="rd-topbar">
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
						<span>My Requests</span>
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
						<span>Submit Request</span>
					</Link>

					<Link
						to="/dashboard"
						className={`rd-nav-link${location.pathname === '/dashboard' ? ' rd-nav-link--active' : ''}`}
					>
						<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<circle
								cx="8"
								cy="8"
								r="5.5"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<path
								d="M8 5v3.5l2 2"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						<span>Public Dashboard</span>
					</Link>
				</nav>

				<div className="rd-topbar-right">
					{resident && (
						<NotificationBell
							userUid={resident.uid}
							role="resident"
						/>
					)}

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
						{logging_out ? 'Logging out…' : <span>Logout</span>}
					</button>
				</div>
			</header>

			<div
				className={`rd-layout ${selected_id ? 'rd-layout--detail-open' : ''}`}
			>
				<aside className="rd-sidebar">
					<div className="rd-sidebar-heading">
						<h2 className="rd-sidebar-title">My Requests</h2>
						<span className="rd-req-count">{requests.length}</span>
					</div>

					{requests.length === 0 ? (
						<div className="rd-no-requests">
							<p>
								You have not submitted any service requests yet.
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

				<main className="rd-main">
					{selected_req ? (
						<RequestDetail
							req={selected_req}
							resident={resident}
							on_back={() => set_selected_id(null)}
							on_cancel={cancelRequest} // NEW prop
						/>
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

/* ── RequestCard (unchanged) ─────────────────────────────────────────────── */

function RequestCard({ req, is_selected, on_click, index }) {
	const meta = STATUS_META[req.status] ?? { label: req.status, cls: '' }

	const bar_colors = {
		pending: '#c05a3a',
		acknowledged: '#1b5e98',
		resolved: '#1e6b3a',
		closed: '#5e574f',
	}
	const bar_widths = {
		pending: '25%',
		acknowledged: '55%',
		resolved: '100%',
		closed: '100%',
	}
	const bar_color = bar_colors[req.status] ?? 'var(--rd-accent-muted)'
	const bar_width = bar_widths[req.status] ?? '30%'

	return (
		<button
			className={`rd-req-card${is_selected ? ' rd-req-card--selected' : ''}`}
			onClick={on_click}
			aria-pressed={is_selected}
			style={{ animationDelay: `${index * 55}ms` }}
		>
			<div
				className="rd-card-bar"
				style={{ '--bar-color': bar_color, '--bar-w': bar_width }}
			/>
			<div className="rd-card-inner">
				<div className="rd-req-card-top">
					<span className="rd-req-category">{req.category}</span>
					<span className={`rd-status-pill ${meta.cls}`}>
						{meta.label}
					</span>
				</div>
				<p className="rd-req-desc">{req.description}</p>
				<div className="rd-req-card-bottom">
					<span className="rd-ward-chip">{req.sa_ward}</span>
					<span className="rd-req-date">
						{format_date(req.created_at)}
					</span>
				</div>
			</div>
		</button>
	)
}

/* ── RequestDetail (updated with cancel button) ──────────────────────────── */

const PRIORITY_META = {
	Low: { label: 'Low', cls: 'rd-priority--low' },
	Medium: { label: 'Medium', cls: 'rd-priority--medium' },
	High: { label: 'High', cls: 'rd-priority--high' },
	Critical: { label: 'Critical', cls: 'rd-priority--critical' },
}

function RequestDetail({ req, resident, on_back, on_cancel }) {
    const meta = STATUS_META[req.status] ?? { label: req.status, cls: '' }
    const has_worker = !!req.worker_uid
    const priority_meta = PRIORITY_META[req.priority] ?? null
    const [close_reason, set_close_reason] = useState(null)
    const [close_reason_loading, set_close_reason_loading] = useState(false)
    const [feedback_form, set_feedback_form] = useState(false)
    const { addMessage } = useMessages()
    const [messaging_enabled, set_messaging_enabled] = useState(
        req.messaging_enabled !== false   // initialise from request data so there's no flicker
    )
    const [lock_reason, set_lock_reason] = useState(null)

	const canCancel =
		!has_worker &&
		req.status !== STATUS.RESOLVED &&
		req.status !== STATUS.CLOSED

	const parseWktPoint = (locationStr) => {
		if (!locationStr) {
			return null
		}
		const match = locationStr.match(
			/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i
		)
		if (match) {
			const lon = parseFloat(match[1])
			const lat = parseFloat(match[2])
			if (!isNaN(lat) && !isNaN(lon)) {
				return { lat, lon }
			}
		}
		return null
	}

	const feedback_toggle = () => set_feedback_form(!feedback_form)

	const get_signed_url_expiry = (signed_url) => {
		const url = new URL(signed_url)
		const amz_date = url.searchParams.get('X-Amz-Date')
		const amz_expires = url.searchParams.get('X-Amz-Expires')
		const [date_part, time_part] = amz_date.split('T')
		const iso_date = `${date_part.slice(0, 4)}-${date_part.slice(4, 6)}-${date_part.slice(6, 8)}T${time_part.slice(0, 2)}:${time_part.slice(2, 4)}:${time_part.slice(4, 6)}Z`
		const issued_at = new Date(iso_date)
		return new Date(issued_at.getTime() + parseInt(amz_expires) * 1000)
	}

	const is_expired = (expires_at) => {
		return expires_at.getTime() - Date.now() < 5 * 60 * 1000
	}

	const get_signed_url = async (id, image, expires) => {
		if (expires !== null && !is_expired(expires)) {
			return image
		}
		const ret = await fetch(`/api/get-signed-url?request_uid=${id}`)
		if (!ret.ok) {
			return image
		}
		const data = await ret.json()
		req.image = data.data
		return req.image
	}

	const submit_review = async ({ rating, comment }) => {
		const headers = { 'Content-Type': 'application/json' }
		if (auth.currentUser) {
			const token = await auth.currentUser.getIdToken()
			headers['Authorization'] = `Bearer ${token}`
		}
		return fetch('/api/submit-review', {
			method: 'POST',
			headers,
			body: JSON.stringify({ request_uid: req.id, rating, comment }),
		})
			.then(async (res) => {
				if (!res.ok) {
					const error_text = await res.text()
					try {
						addMessage({
							text: 'View console for details',
							type: 'error',
						})
						console.error(
							'Server Error (JSON):',
							JSON.parse(error_text)
						)
					} catch {
						addMessage({
							text: 'View console for details',
							type: 'error',
						})
						console.error('Server Error (HTML/Text):', error_text)
					}
					return
				}
				addMessage({
					text: 'Successfully submitted review',
					type: 'success',
				})
				window.location.reload()
			})
			.catch((err) => {
				addMessage({
					text: 'Error submitting review.',
					type: 'error',
				})
				console.error(err)
			})
	}

	let lat = null,
		lng = null
	if (req.location) {
		const coords = parseWktPoint(req.location)
		if (coords) {
			lat = coords.lat
			lng = coords.lon
		}
	}

	if (req.image) {
		get_signed_url(
			req.id,
			req.image,
			req.image_expires_at ? new Date(req.image_expires_at) : null
		).then((image) => {
			req.image = image
			req.image_expires_at = get_signed_url_expiry(image)
		})
	}

	    useEffect(() => {
        if (!req.id) return
        const unsub = subscribe_to_request_lock(
            req.id,
            ({ messaging_enabled, messaging_lock_reason }) => {
                set_messaging_enabled(messaging_enabled)
                set_lock_reason(messaging_lock_reason)
            },
            (err) => console.error('[resident lock listener]', err)
        )
        return unsub
    }, [req.id])

	useEffect(() => {
		if (req.status !== 'closed') {
			set_close_reason(null)
			return
		}
		set_close_reason_loading(true)
		import('firebase/firestore').then(
			({ getDocs, collection, query, where }) => {
				import('../../firebase_config.js').then(({ db }) => {
					getDocs(
						query(
							collection(
								db,
								'service_requests',
								req.id,
								'comments'
							),
							where('type', '==', 'close_reason')
						)
					)
						.then((snap) => {
							if (!snap.empty) {
								set_close_reason(snap.docs[0].data().text)
							}
						})
						.catch(() => set_close_reason(null))
						.finally(() => set_close_reason_loading(false))
				})
			}
		)
	}, [req.id, req.status])

	const handleCancel = () => {
		if (
			window.confirm(
				'Are you sure you want to cancel this request? This action cannot be undone.'
			)
		) {
			on_cancel(req.id)
		}
	}

	return (
		<div className="rd-detail">
			<div className="rd-detail-header">
				<div className="rd-detail-header-left">
					<button
						className="rd-back-btn"
						onClick={on_back}
						aria-label="Back to requests"
					>
						<svg
							viewBox="0 0 16 16"
							fill="none"
							style={{ width: '18px', height: '18px' }}
						>
							<path
								d="M10 3L5 8l5 5"
								stroke="currentColor"
								strokeWidth="1.75"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
					<div className="rd-detail-title-group">
						<h2 className="rd-detail-title">{req.category}</h2>
						<span className="rd-detail-id">{req.id}</span>
					</div>
				</div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '12px',
					}}
				>
					<span
						className={`rd-status-pill rd-status-pill--lg ${meta.cls}`}
					>
						{meta.label}
					</span>
					<LikeButton
						requestId={req.id}
						initialLikeCount={req.like_count || 0}
					/>
					{(req.status === STATUS.CLOSED ||
						req.status === STATUS.RESOLVED) && (
						<button
							className="wd-home-btn"
							onClick={feedback_toggle}
						>
							Review
						</button>
					)}
				</div>
			</div>

			{!feedback_form && (
				<dl className="rd-detail-meta">
					<div className="rd-detail-meta-item">
						<dt>Ward</dt>
						<dd>{req.sa_ward || '—'}</dd>
					</div>
					<div className="rd-detail-meta-item">
						<dt>Priority</dt>
						<dd>
							{priority_meta ? (
								<span
									className={`rd-priority-pill ${priority_meta.cls}`}
								>
									{priority_meta.label}
								</span>
							) : (
								<span className="rd-priority-none">
									Not set
								</span>
							)}
						</dd>
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
					<div className="rd-detail-meta-item">
						<dt>Location</dt>
						<dd>
							{lat && lng ? (
								<a
									href={`https://www.google.com/maps?q=${lat},${lng}`}
									target="_blank"
									rel="noopener noreferrer"
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										gap: '4px',
									}}
								>
									📍 {lat.toFixed(6)}, {lng.toFixed(6)}
								</a>
							) : (
								'—'
							)}
						</dd>
					</div>

					<div className="rd-detail-meta-item rd-detail-meta-item--full">
						<dt>Description</dt>
						<dd>{req.description}</dd>
					</div>

					{req.image && (
						<div className="rd-detail-meta-item rd-detail-meta-item--full">
							<dt>Photo</dt>
							<dd>
								<img
									src={req.image}
									alt="Request"
									style={{
										maxWidth: '100%',
										maxHeight: '200px',
										borderRadius: '8px',
									}}
								/>
							</dd>
						</div>
					)}

					{req.status === 'closed' && (
						<div className="rd-detail-meta-item rd-detail-meta-item--full">
							<dt>Close reason</dt>
							<dd className="rd-close-reason">
								{close_reason_loading
									? 'Loading…'
									: (close_reason ?? '—')}
							</dd>
						</div>
					)}

					{req.rating &&
						typeof req.rating === 'number' &&
						req.comment && (
							<div className="rd-detail-meta-item rd-detail-meta-item--full">
								<dt>Review</dt>
								<StarRating rating={req.rating} />
								<dd
									className="rd-review-comment"
									style={{ marginTop: '12px' }}
								>
									{req.comment}
								</dd>
							</div>
						)}
				</dl>
			)}

			{feedback_form && (
				<FeedbackForm
					onCancel={feedback_toggle}
					onSubmit={submit_review}
				/>
			)}

			{/* Cancel button for unassigned requests */}
			{canCancel && (
				<div className="rd-cancel-section">
					<button className="rd-cancel-btn" onClick={handleCancel}>
						Cancel Request
					</button>
				</div>
			)}

			<div className="rd-section-divider">
				<span>Messages</span>
			</div>
			<div className="rd-thread-wrap">
				{has_worker ? (
					<MessageThread
						request_uid={req.id}
						current_uid={resident.uid}
						current_name={resident.name}
						current_role="resident"
						other_uid={req.worker_uid}
						other_name={req.worker_name ?? 'Worker'}
						messaging_enabled={messaging_enabled} 
						lock_reason={lock_reason}
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

function StarRating({ rating, max = 5 }) {
	return (
		<div className="rd-stars-readonly">
			{[...Array(max)].map((_, i) => (
				<span
					key={i}
					className={`rd-star-readonly ${i < rating ? 'rd-star-readonly--active' : ''}`}
				>
					★
				</span>
			))}
			<span className="rd-star-label">
				{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
			</span>
		</div>
	)
}

function ErrorScreen({ message, onRetry, onGoHome }) {
	return (
		<div className="wd-centered-screen">
			<div className="wd-error-text">{message}</div>
			<div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
				<button className="wd-retry-btn" onClick={onRetry}>
					Try again
				</button>
				<button className="wd-home-btn" onClick={onGoHome}>
					Go back Home
				</button>
			</div>
		</div>
	)
}
