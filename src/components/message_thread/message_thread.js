import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
	subscribe_to_thread,
	send_message,
	mark_messages_read,
	notify_new_message,
	format_message_time,
} from '../../backend/message_thread_service.js'
import './message_thread.css'

/**
 * MessageThread
 * Shared conversation component embedded in both the worker and resident
 * request-detail pages. Renders realtime messages and a send input.
 *
 * Props:
 * request_uid   {string}  — The service request ID (= thread ID)
 * current_uid   {string}  — Firebase Auth UID of the logged-in user
 * current_name  {string}  — Display name of the logged-in user
 * current_role  {string}  — 'resident' | 'worker'
 * other_uid     {string}  — UID of the other party
 * other_name    {string}  — Display name of the other party
 */
export default function MessageThread({
	request_uid,
	current_uid,
	current_name,
	current_role,
	other_uid,
	other_name,
}) {
	const [messages, set_messages] = useState([])
	const [input, set_input] = useState('')
	const [sending, set_sending] = useState(false)
	const [error, set_error] = useState(null)
	const [loading, set_loading] = useState(true)

	const bottom_ref = useRef(null)
	const textarea_ref = useRef(null)

	// ── Realtime subscription ──────────────────────────────────────────────
	useEffect(() => {
		if (!request_uid) {
			return
		}
		set_loading(true)

		const unsub = subscribe_to_thread(
			request_uid,
			(msgs) => {
				set_messages(msgs)
				set_loading(false)
				mark_messages_read(msgs, current_uid).catch(console.error)
			},
			(err) => {
				set_error('Could not load messages. Please refresh.')
				set_loading(false)
				console.error(err)
			}
		)

		return unsub
	}, [request_uid, current_uid])

	// ── Auto-scroll on new messages ────────────────────────────────────────
	useEffect(() => {
		bottom_ref.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	// ── Send ───────────────────────────────────────────────────────────────
	const handle_send = useCallback(async () => {
		const text = input.trim()
		if (!text || sending) {
			return
		}

		set_input('')
		set_sending(true)
		set_error(null)

		try {
			await send_message({
				request_uid,
				sender_uid: current_uid,
				receiver_uid: other_uid,
				text,
			})

			const receiver_role =
				current_role === 'worker' ? 'resident' : 'worker'
			await notify_new_message({
				receiver_uid: other_uid,
				receiver_role,
				sender_name: current_name,
				text,
				request_uid,
			})
		} catch (err) {
			console.error('[MessageThread] send failed:', err)
			set_input(text) // restore on failure
			set_error('Message failed to send. Please try again.')
		} finally {
			set_sending(false)
			textarea_ref.current?.focus()
		}
	}, [
		input,
		sending,
		request_uid,
		current_uid,
		other_uid,
		current_name,
		current_role,
	])

	// ── Keyboard handler ───────────────────────────────────────────────────
	const handle_keydown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handle_send()
		}
	}

	// ── Auto-resize textarea ───────────────────────────────────────────────
	const handle_input_change = (e) => {
		set_input(e.target.value)
		const el = e.target
		el.style.height = 'auto'
		el.style.height = Math.min(el.scrollHeight, 140) + 'px'
	}

	// ── Render ─────────────────────────────────────────────────────────────
	return (
		<section className="mt_root" aria-label="Message thread">
			{/* Header */}
			<header className="mt_header">
				<div className="mt_header_avatar" aria-hidden="true">
					{other_name ? other_name[0].toUpperCase() : '?'}
				</div>
				<div className="mt_header_info">
					<span className="mt_header_name">
						{other_name || 'Unknown'}
					</span>
					<span className="mt_header_role">
						{current_role === 'worker'
							? 'Resident'
							: 'Assigned Worker'}
					</span>
				</div>
				<div className="mt_header_badge" aria-hidden="true">
					<span className="mt_badge_dot" />
					Live
				</div>
			</header>

			{/* Message list */}
			<div
				className="mt_body"
				role="log"
				aria-live="polite"
				aria-label="Messages"
			>
				{loading && (
					<div className="mt_state_wrap">
						<div
							className="mt_spinner"
							aria-label="Loading messages"
						/>
						<p className="mt_state_text">Loading messages…</p>
					</div>
				)}

				{!loading && messages.length === 0 && (
					<div className="mt_state_wrap">
						<div className="mt_empty_icon" aria-hidden="true">
							✉
						</div>
						<p className="mt_state_text">No messages yet.</p>
						<p className="mt_state_sub">
							Send the first message below.
						</p>
					</div>
				)}

				{!loading &&
					messages.map((msg, idx) => {
						const is_mine = msg.sender_uid === current_uid
						const prev = messages[idx - 1]
						const show_date =
							!prev || !same_day(prev.sent_at, msg.sent_at)
						const is_grouped =
							prev &&
							prev.sender_uid === msg.sender_uid &&
							!show_date &&
							time_gap_minutes(prev.sent_at, msg.sent_at) < 2

						return (
							<React.Fragment key={msg.id}>
								{show_date && (
									<div
										className="mt_date_divider"
										aria-label={`Messages from ${format_date_label(msg.sent_at)}`}
									>
										<span>
											{format_date_label(msg.sent_at)}
										</span>
									</div>
								)}
								<div
									className={[
										'mt_bubble_wrap',
										is_mine
											? 'mt_bubble_wrap_mine'
											: 'mt_bubble_wrap_theirs',
										is_grouped
											? 'mt_bubble_wrap_grouped'
											: '',
									].join(' ')}
								>
									<div
										className={[
											'mt_bubble',
											is_mine
												? 'mt_bubble_mine'
												: 'mt_bubble_theirs',
										].join(' ')}
									>
										<p className="mt_bubble_text">
											{msg.text}
										</p>
										<div className="mt_bubble_meta">
											<span className="mt_bubble_time">
												{format_message_time(
													msg.sent_at
												)}
											</span>
											{is_mine && (
												<span
													className={`mt_read_tick ${msg.read ? 'mt_read_tick_read' : ''}`}
													aria-label={
														msg.read
															? 'Read'
															: 'Sent'
													}
												>
													{msg.read ? '✓✓' : '✓'}
												</span>
											)}
										</div>
									</div>
								</div>
							</React.Fragment>
						)
					})}

				<div ref={bottom_ref} />
			</div>

			{/* Error banner */}
			{error && (
				<div className="mt_error" role="alert">
					<span>{error}</span>
					<button
						className="mt_error_dismiss"
						onClick={() => set_error(null)}
						aria-label="Dismiss error"
					>
						✕
					</button>
				</div>
			)}

			{/* Compose bar */}
			<div className="mt_compose">
				<textarea
					ref={textarea_ref}
					className="mt_input"
					value={input}
					onChange={handle_input_change}
					onKeyDown={handle_keydown}
					placeholder="Type a message…"
					rows={1}
					disabled={sending}
					aria-label="Message input"
					maxLength={2000}
				/>
				<button
					className={`mt_send_btn ${sending ? 'mt_send_btn_loading' : ''}`}
					onClick={handle_send}
					disabled={!input.trim() || sending}
					aria-label="Send message"
				>
					{sending ? (
						<span className="mt_send_spinner" aria-hidden="true" />
					) : (
						<svg
							viewBox="0 0 24 24"
							fill="none"
							className="mt_send_icon"
							aria-hidden="true"
						>
							<path
								d="M22 2L11 13"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path
								d="M22 2L15 22L11 13L2 9L22 2Z"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					)}
				</button>
			</div>
		</section>
	)
}

// ─────────────────────────────────────────────
// Local helpers (UI-only, not exported)
// ─────────────────────────────────────────────

function to_date(ts) {
	if (!ts) {
		return null
	}
	return ts.toDate ? ts.toDate() : new Date(ts)
}

function same_day(ts_a, ts_b) {
	const a = to_date(ts_a)
	const b = to_date(ts_b)
	if (!a || !b) {
		return false
	}
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}

function time_gap_minutes(ts_a, ts_b) {
	const a = to_date(ts_a)
	const b = to_date(ts_b)
	if (!a || !b) {
		return Infinity
	}
	return Math.abs(b - a) / 60000
}

function format_date_label(ts) {
	const date = to_date(ts)
	if (!date) {
		return ''
	}

	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const diff = Math.round((today - d) / 86400000)

	if (diff === 0) {
		return 'Today'
	}
	if (diff === 1) {
		return 'Yesterday'
	}

	return date.toLocaleDateString('en-ZA', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
	})
}
