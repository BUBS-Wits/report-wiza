import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
	collection,
	query,
	where,
	orderBy,
	limit,
	onSnapshot,
	writeBatch,
	doc,
	updateDoc,
	serverTimestamp,
} from 'firebase/firestore'
import './notification_bell.css'
import { db } from '../../firebase_config.js'
/* ── Notification type config ─────────────────────────────────────────────── */

const TYPE_CONFIG = {
	// ── Resident ──────────────────────────────────────────────────────────
	request_status_update: {
		icon: '↻',
		label: 'Status Update',
		roles: ['resident', 'worker'],
	},
	assignment_confirmed: {
		icon: '✓',
		label: 'Worker Assigned',
		roles: ['resident'],
	},
	new_message: {
		icon: '✉',
		label: 'New Message',
		roles: ['resident', 'worker', 'admin'],
	},

	// ── Worker ────────────────────────────────────────────────────────────
	request_assigned: {
		icon: '📋',
		label: 'New Assignment',
		roles: ['worker'],
	},
	request_unassigned: {
		icon: '✕',
		label: 'Unassigned',
		roles: ['worker', 'admin'],
	},
	request_escalated: {
		icon: '⚠',
		label: 'Escalated',
		roles: ['worker', 'admin'],
	},

	// ── Admin ─────────────────────────────────────────────────────────────
	new_request_submitted: {
		icon: '+',
		label: 'New Request',
		roles: ['admin'],
	},
	sla_warning: {
		icon: '⏱',
		label: 'SLA Warning',
		roles: ['admin'],
	},
	worker_invitation_accepted: {
		icon: '👤',
		label: 'Worker Joined',
		roles: ['admin'],
	},
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function timeAgo(timestamp) {
	if (!timestamp) return ''
	const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
	const diff = Math.floor((Date.now() - date) / 1000)

	if (diff < 60) return 'just now'
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
	if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
	return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function groupByDate(notifications) {
	const groups = {}
	notifications.forEach((n) => {
		const date = n.created_at?.toDate
			? n.created_at.toDate()
			: new Date(n.created_at)
		const today = new Date()
		const yesterday = new Date(today)
		yesterday.setDate(today.getDate() - 1)

		let label
		if (date.toDateString() === today.toDateString()) label = 'Today'
		else if (date.toDateString() === yesterday.toDateString())
			label = 'Yesterday'
		else
			label = date.toLocaleDateString('en-ZA', {
				weekday: 'long',
				day: 'numeric',
				month: 'short',
			})

		if (!groups[label]) groups[label] = []
		groups[label].push(n)
	})
	return groups
}

/* ── Main component ──────────────────────────────────────────────────────── */

/**
 * NotificationBell
 *
 * Props:
 *   userUid  – string   Firebase UID of the current user
 *   role     – string   'resident' | 'worker' | 'admin'
 *   onOpen   – fn?      optional callback when panel opens
 */
export default function NotificationBell({ userUid, role, onOpen }) {
	const [notifications, setNotifications] = useState([])
	const [open, setOpen] = useState(false)
	const [markingAll, setMarkingAll] = useState(false)
	const panelRef = useRef(null)
	const bellRef = useRef(null)

	/* ── Realtime listener ──────────────────────────────────────────────── */

	useEffect(() => {
		if (!userUid) return

		const q = query(
			collection(db, 'notifications'),
			where('user_uid', '==', userUid),
			orderBy('created_at', 'desc'),
			limit(40)
		)

		const unsub = onSnapshot(q, (snap) => {
			setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
		})

		return unsub
	}, [userUid])

	/* ── Click-outside to close ─────────────────────────────────────────── */

	useEffect(() => {
		if (!open) return
		function handleClick(e) {
			if (
				panelRef.current &&
				!panelRef.current.contains(e.target) &&
				bellRef.current &&
				!bellRef.current.contains(e.target)
			) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [open])

	/* ── Actions ────────────────────────────────────────────────────────── */

	const handleBellClick = useCallback(() => {
		setOpen((prev) => {
			if (!prev && onOpen) onOpen()
			return !prev
		})
	}, [onOpen])

	const markOneRead = useCallback(async (notif) => {
		if (notif.read) return
		await updateDoc(doc(db, 'notifications', notif.id), { read: true })
	}, [])

	const markAllRead = useCallback(async () => {
		const unread = notifications.filter((n) => !n.read)
		if (!unread.length) return
		setMarkingAll(true)
		try {
			const batch = writeBatch(db)
			unread.forEach((n) =>
				batch.update(doc(db, 'notifications', n.id), { read: true })
			)
			await batch.commit()
		} finally {
			setMarkingAll(false)
		}
	}, [notifications])

	/* ── Derived ────────────────────────────────────────────────────────── */

	const unreadCount = notifications.filter((n) => !n.read).length
	const groups = groupByDate(notifications)

	/* ── Render ─────────────────────────────────────────────────────────── */

	return (
		<div className="nb-root">
			{/* Bell button */}
			<button
				ref={bellRef}
				className={`nb-bell${open ? ' nb-bell--open' : ''}`}
				onClick={handleBellClick}
				aria-label={`Notifications${unreadCount ? ` — ${unreadCount} unread` : ''}`}
			>
				<BellIcon />
				{unreadCount > 0 && (
					<span className="nb-badge">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</button>

			{/* Panel */}
			{open && (
				<div
					ref={panelRef}
					className="nb-panel"
					role="dialog"
					aria-label="Notifications"
				>
					{/* Header */}
					<div className="nb-panel-header">
						<div className="nb-panel-title">
							Notifications
							{unreadCount > 0 && (
								<span className="nb-panel-unread-count">
									{unreadCount} unread
								</span>
							)}
						</div>
						{unreadCount > 0 && (
							<button
								className="nb-mark-all"
								onClick={markAllRead}
								disabled={markingAll}
							>
								{markingAll ? 'Marking…' : 'Mark all read'}
							</button>
						)}
					</div>

					{/* Body */}
					<div className="nb-panel-body">
						{notifications.length === 0 ? (
							<EmptyState role={role} />
						) : (
							Object.entries(groups).map(([dateLabel, items]) => (
								<div key={dateLabel} className="nb-group">
									<div className="nb-group-label">
										{dateLabel}
									</div>
									{items.map((n) => (
										<NotifItem
											key={n.id}
											notif={n}
											onRead={markOneRead}
										/>
									))}
								</div>
							))
						)}
					</div>

					{/* Footer */}
					{notifications.length > 0 && (
						<div className="nb-panel-footer">
							Showing last {notifications.length} notifications
						</div>
					)}
				</div>
			)}
		</div>
	)
}

/* ── NotifItem ───────────────────────────────────────────────────────────── */

function NotifItem({ notif, onRead }) {
	const cfg = TYPE_CONFIG[notif.type] ?? {
		icon: '●',
		label: notif.type,
	}

	return (
		<div
			className={`nb-item${notif.read ? '' : ' nb-item--unread'}`}
			onClick={() => onRead(notif)}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => e.key === 'Enter' && onRead(notif)}
		>
			{/* Unread dot */}
			{!notif.read && (
				<span className="nb-unread-dot" aria-hidden="true" />
			)}

			{/* Icon */}
			<div className="nb-item-icon" aria-hidden="true">
				{cfg.icon}
			</div>

			{/* Content */}
			<div className="nb-item-content">
				<div className="nb-item-header-row">
					<span className="nb-item-label">{cfg.label}</span>
					<span className="nb-item-time">
						{timeAgo(notif.created_at)}
					</span>
				</div>
				<div className="nb-item-title">{notif.title}</div>
				{notif.body && <div className="nb-item-body">{notif.body}</div>}
				{notif.request_uid && (
					<div className="nb-item-ref">
						REQ · {notif.request_uid.slice(-8).toUpperCase()}
					</div>
				)}
			</div>
		</div>
	)
}

/* ── EmptyState ──────────────────────────────────────────────────────────── */

function EmptyState({ role }) {
	const messages = {
		resident:
			"You're all caught up. We'll notify you when there's an update on your requests.",
		worker: 'No notifications yet. New assignments and updates will appear here.',
		admin: 'Nothing to action right now. Request activity will appear here.',
	}

	return (
		<div className="nb-empty">
			<div className="nb-empty-icon">🔔</div>
			<div className="nb-empty-text">
				{messages[role] ?? 'No notifications yet.'}
			</div>
		</div>
	)
}

/* ── Bell SVG ────────────────────────────────────────────────────────────── */

function BellIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
			<path d="M13.73 21a2 2 0 0 1-3.46 0" />
		</svg>
	)
}
