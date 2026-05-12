import React, { useState, useEffect, useRef } from 'react'
import { auth } from '../../firebase_config.js'
import {
	subscribe_to_admin_threads,
	subscribe_to_thread_messages,
	admin_toggle_thread_messaging,
	invalidate_request_cache,
} from '../../backend/admin_messaging_service.js'
import './admin_review_messages.css'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function format_thread_time(date) {
	if (!date) return ''
	const now = new Date()
	const diff_ms = now - date
	const diff_mins = Math.floor(diff_ms / 60000)
	if (diff_mins < 1) return 'Just now'
	if (diff_mins < 60) return `${diff_mins}m ago`
	const diff_hours = Math.floor(diff_mins / 60)
	if (diff_hours < 24) return `${diff_hours}h ago`
	const diff_days = Math.floor(diff_hours / 24)
	if (diff_days === 1) return 'Yesterday'
	return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function format_message_time(date) {
	if (!date) return ''
	return date.toLocaleTimeString('en-ZA', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

function format_date_label(date) {
	if (!date) return ''
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const diff = Math.round((today - d) / 86400000)
	if (diff === 0) return 'Today'
	if (diff === 1) return 'Yesterday'
	return date.toLocaleDateString('en-ZA', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	})
}

function same_day(a, b) {
	if (!a || !b) return false
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}

const STATUS_LABELS = {
	open: 'Open',
	acknowledged: 'Assigned',
	in_progress: 'In Progress',
	resolved: 'Resolved',
	closed: 'Closed',
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function CategoryPill({ category }) {
	return (
		<span className={`amr_cat_pill amr_cat_${category}`}>
			{category.replace('_', ' ')}
		</span>
	)
}

function StatusChip({ status }) {
	return (
		<span className={`amr_status_chip amr_status_${status}`}>
			{STATUS_LABELS[status] || status}
		</span>
	)
}

function ThreadItem({ thread, is_active, on_select }) {
	const is_mine_last = thread.last_message?.sender_uid === thread.worker.uid
	const preview_prefix = is_mine_last
		? `${thread.worker.name.split(' ')[0]}: `
		: `${thread.resident.name.split(' ')[0]}: `
	const is_locked = thread.messaging_enabled === false

	return (
		<button
			className={`amr_thread_item ${is_active ? 'amr_thread_item_active' : ''}`}
			onClick={() => on_select(thread)}
		>
			<div className="amr_thread_avatars">
				<div className="amr_avatar amr_avatar_worker">
					{thread.worker.name[0]}
				</div>
				<div className="amr_avatar amr_avatar_resident">
					{thread.resident.name[0]}
				</div>
			</div>

			<div className="amr_thread_body">
				<div className="amr_thread_top_row">
					<span className="amr_thread_names">
						{thread.worker.name.split(' ')[0]} &amp;{' '}
						{thread.resident.name.split(' ')[0]}
					</span>
					<div className="amr_thread_top_right">
						{is_locked && (
							<span
								className="amr_thread_locked_icon"
								title="Chat locked"
							>
								🔒
							</span>
						)}
						<span className="amr_thread_time">
							{format_thread_time(thread.last_message?.sent_at)}
						</span>
					</div>
				</div>

				<div className="amr_thread_meta_row">
					<CategoryPill category={thread.category} />
					<span className="amr_thread_req_id">
						{thread.request_id}
					</span>
				</div>

				<div className="amr_thread_preview_row">
					<p className="amr_thread_preview">
						<span className="amr_preview_prefix">
							{preview_prefix}
						</span>
						{thread.last_message?.text}
					</p>
					{thread.unread_count > 0 && (
						<span className="amr_unread_badge">
							{thread.unread_count}
						</span>
					)}
				</div>
			</div>
		</button>
	)
}

function EmptyState() {
	return (
		<div className="amr_empty_state">
			<div className="amr_empty_icon" aria-hidden="true">
				💬
			</div>
			<p className="amr_empty_title">Select a conversation</p>
			<p className="amr_empty_sub">
				Choose a thread from the list to review the messages between a
				worker and resident.
			</p>
		</div>
	)
}

function MessageViewer({ thread, messages, on_toggle_chat, is_locking }) {
	const bottom_ref = useRef(null)
	const is_locked = thread.messaging_enabled === false

	useEffect(() => {
		bottom_ref.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	return (
		<div className="amr_viewer">
			{/* Viewer header */}
			<div className="amr_viewer_header">
				<div className="amr_viewer_header_left">
					<div className="amr_viewer_avatars">
						<div className="amr_avatar amr_avatar_worker">
							{thread.worker.name[0]}
						</div>
						<div className="amr_avatar amr_avatar_resident">
							{thread.resident.name[0]}
						</div>
					</div>
					<div className="amr_viewer_header_info">
						<span className="amr_viewer_names">
							{thread.worker.name}
							<span className="amr_viewer_sep">↔</span>
							{thread.resident.name}
						</span>
						<div className="amr_viewer_sub">
							<CategoryPill category={thread.category} />
							<StatusChip status={thread.status} />
							<span className="amr_viewer_req_id">
								{thread.request_id}
							</span>
						</div>
					</div>
				</div>

				<div className="amr_viewer_header_right">
					<div className="amr_viewer_stat">
						<span className="amr_viewer_stat_val">
							{messages.length}
						</span>
						<span className="amr_viewer_stat_label">Messages</span>
					</div>

					{/* ── Lock / Unlock chat action ── */}
					<button
						className={`amr_toggle_chat_btn ${is_locked ? 'amr_toggle_chat_btn_unlock' : 'amr_toggle_chat_btn_lock'}`}
						onClick={() =>
							on_toggle_chat(thread.id, thread.messaging_enabled)
						}
						disabled={is_locking}
						aria-label={is_locked ? 'Unlock chat' : 'Lock chat'}
					>
						{is_locking ? (
							<span className="amr_btn_spinner">…</span>
						) : is_locked ? (
							<>🔓 Unlock Chat</>
						) : (
							<>🔒 Lock Chat</>
						)}
					</button>
				</div>
			</div>

			{/* Locked banner — shown when messaging_enabled is false */}
			{is_locked && (
				<div className="amr_locked_banner">
					<span className="amr_locked_banner_icon">🔒</span>
					<span>
						Messaging is currently <strong>disabled</strong> for
						this thread. The worker and resident cannot send new
						messages.
					</span>
				</div>
			)}

			{/* Participant legend */}
			<div className="amr_participant_legend">
				<div className="amr_legend_item">
					<div className="amr_legend_swatch amr_swatch_worker" />
					<span>{thread.worker.name}</span>
					<span className="amr_legend_role">Worker</span>
				</div>
				<div className="amr_legend_divider" />
				<div className="amr_legend_item">
					<div className="amr_legend_swatch amr_swatch_resident" />
					<span>{thread.resident.name}</span>
					<span className="amr_legend_role">Resident</span>
				</div>
			</div>

			{/* Messages */}
			<div
				className="amr_messages_body"
				role="log"
				aria-label="Conversation"
			>
				{messages.map((msg, idx) => {
					const is_worker = msg.sender_uid === thread.worker.uid
					const sender_name = is_worker
						? thread.worker.name
						: thread.resident.name
					const prev = messages[idx - 1]
					const show_date =
						!prev || !same_day(prev.sent_at, msg.sent_at)
					const is_grouped =
						prev &&
						prev.sender_uid === msg.sender_uid &&
						!show_date &&
						Math.abs(msg.sent_at - prev.sent_at) / 60000 < 2

					return (
						<React.Fragment key={msg.id}>
							{show_date && (
								<div className="amr_date_divider">
									<span>
										{format_date_label(msg.sent_at)}
									</span>
								</div>
							)}
							<div
								className={[
									'amr_msg_row',
									is_worker
										? 'amr_msg_row_worker'
										: 'amr_msg_row_resident',
									is_grouped ? 'amr_msg_grouped' : '',
								].join(' ')}
							>
								{!is_grouped && (
									<div
										className={`amr_msg_avatar ${is_worker ? 'amr_avatar_worker' : 'amr_avatar_resident'}`}
									>
										{sender_name[0]}
									</div>
								)}
								{is_grouped && (
									<div className="amr_msg_avatar_spacer" />
								)}

								<div className="amr_msg_content">
									{!is_grouped && (
										<div className="amr_msg_sender_row">
											<span className="amr_msg_sender">
												{sender_name}
											</span>
											<span
												className={`amr_msg_role_tag ${is_worker ? 'amr_role_worker' : 'amr_role_resident'}`}
											>
												{is_worker
													? 'Worker'
													: 'Resident'}
											</span>
										</div>
									)}
									<div
										className={`amr_bubble ${is_worker ? 'amr_bubble_worker' : 'amr_bubble_resident'}`}
									>
										<p className="amr_bubble_text">
											{msg.text}
										</p>
									</div>
									<div className="amr_msg_footer">
										<span className="amr_msg_time">
											{format_message_time(msg.sent_at)}
										</span>
										{is_worker && (
											<span
												className={`amr_read_status ${msg.read ? 'amr_read_status_read' : ''}`}
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

			{/* Footer notice */}
			<div
				className={`amr_viewer_footer ${is_locked ? 'amr_viewer_footer_locked' : ''}`}
			>
				<span className="amr_footer_icon" aria-hidden="true">
					{is_locked ? '🔒' : '👁️'}
				</span>
				{is_locked
					? 'Chat locked — new messages are blocked for this thread'
					: 'Admin view — messages cannot be sent from this panel'}
			</div>
		</div>
	)
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function AdminMessagingReview() {
	const [threads, set_threads] = useState([])
	const [selected_thread, set_selected_thread] = useState(null)
	const [messages, set_messages] = useState([])
	const [search, set_search] = useState('')
	const [filter_status, set_filter_status] = useState('all')
	const [filter_category, set_filter_category] = useState('all')
	const [locking_id, set_locking_id] = useState(null)
	const [action_msg, set_action_msg] = useState(null)

	// ── Subscribe to thread list ──────────────────────────────────────
	useEffect(() => {
		const unsub = subscribe_to_admin_threads(
			(updated_threads) => set_threads(updated_threads),
			(err) => show_action_msg(err.message, true)
		)
		return () => unsub()
	}, [])

	// ── Subscribe to messages for the selected thread ─────────────────
	useEffect(() => {
		if (!selected_thread) {
			set_messages([])
			return
		}

		const unsub = subscribe_to_thread_messages(
			selected_thread.id,
			(updated_messages) => set_messages(updated_messages),
			(err) => show_action_msg(err.message, true)
		)
		return () => unsub()
	}, [selected_thread?.id])

	// ── Keep selected_thread in sync when the thread list updates ─────
	useEffect(() => {
		if (!selected_thread) return
		const fresh = threads.find((t) => t.id === selected_thread.id)
		if (fresh) set_selected_thread(fresh)
	}, [threads])

	const filtered_threads = threads.filter((t) => {
		const search_lower = search.toLowerCase()
		const matches_search =
			!search ||
			t.worker.name.toLowerCase().includes(search_lower) ||
			t.resident.name.toLowerCase().includes(search_lower) ||
			t.request_id.toLowerCase().includes(search_lower)
		const matches_status =
			filter_status === 'all' || t.status === filter_status
		const matches_category =
			filter_category === 'all' || t.category === filter_category
		return matches_search && matches_status && matches_category
	})

	const total_unread = threads.reduce((sum, t) => sum + t.unread_count, 0)

	// ── Lock / Unlock chat ────────────────────────────────────────────
	const handle_toggle_chat = async (thread_id, current_messaging_enabled) => {
		set_locking_id(thread_id)
		try {
			const admin_uid = auth.currentUser?.uid
			const is_currently_enabled = current_messaging_enabled !== false
			const new_status = !is_currently_enabled

			await admin_toggle_thread_messaging(
				thread_id,
				new_status,
				admin_uid,
				new_status ? null : 'Locked by admin via messaging review'
			)

			invalidate_request_cache(thread_id)

			show_action_msg(
				`Chat ${new_status ? 'unlocked' : 'locked'} successfully.`
			)
		} catch (err) {
			show_action_msg(err.message, true)
		} finally {
			set_locking_id(null)
		}
	}

	const show_action_msg = (text, is_error = false) => {
		set_action_msg({ text, is_error })
		setTimeout(() => set_action_msg(null), 3000)
	}

	return (
		<div className="amr_page">
			{/* Toast notification */}
			{action_msg && (
				<div
					className={`amr_toast ${action_msg.is_error ? 'amr_toast_error' : 'amr_toast_success'}`}
					role="status"
					aria-live="polite"
				>
					{action_msg.text}
				</div>
			)}

			{/* Page header */}
			<div className="amr_header">
				<div className="amr_header_inner">
					<div className="amr_breadcrumb">
						<span>Admin</span>
						<span className="amr_breadcrumb_sep">›</span>
						<span className="amr_breadcrumb_current">
							Messaging Review
						</span>
					</div>
					<div className="amr_header_row">
						<div>
							<h1 className="amr_title">Messaging Review</h1>
							<p className="amr_subtitle">
								Monitor all conversations between workers and
								residents
								{total_unread > 0 && (
									<span className="amr_subtitle_unread">
										{' '}
										· {total_unread} unread
									</span>
								)}
							</p>
						</div>
						<div className="amr_header_stats">
							<div className="amr_header_stat">
								<span className="amr_header_stat_val">
									{threads.length}
								</span>
								<span className="amr_header_stat_label">
									Threads
								</span>
							</div>
							<div className="amr_header_stat">
								<span className="amr_header_stat_val">
									{threads.reduce(
										(s, t) => s + t.message_count,
										0
									)}
								</span>
								<span className="amr_header_stat_label">
									Messages
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Body */}
			<div className="amr_body">
				{/* Left panel */}
				<div className="amr_panel_left">
					{/* Search & filters */}
					<div className="amr_filters">
						<div className="amr_search_wrap">
							<svg
								className="amr_search_icon"
								viewBox="0 0 20 20"
								fill="none"
								aria-hidden="true"
							>
								<circle
									cx="9"
									cy="9"
									r="6"
									stroke="currentColor"
									strokeWidth="1.8"
								/>
								<path
									d="M15 15l-3.5-3.5"
									stroke="currentColor"
									strokeWidth="1.8"
									strokeLinecap="round"
								/>
							</svg>
							<input
								className="amr_search_input"
								type="text"
								placeholder="Search by name or ID…"
								value={search}
								onChange={(e) => set_search(e.target.value)}
							/>
						</div>
						<div className="amr_filter_row">
							<select
								className="amr_filter_select"
								value={filter_status}
								onChange={(e) =>
									set_filter_status(e.target.value)
								}
								aria-label="Filter by status"
							>
								<option value="all">All statuses</option>
								<option value="open">Open</option>
								<option value="acknowledged">Assigned</option>
								<option value="in_progress">In Progress</option>
								<option value="resolved">Resolved</option>
								<option value="closed">Closed</option>
							</select>
							<select
								className="amr_filter_select"
								value={filter_category}
								onChange={(e) =>
									set_filter_category(e.target.value)
								}
								aria-label="Filter by category"
							>
								<option value="all">All categories</option>
								<option value="water">Water</option>
								<option value="sewage">Sewage</option>
								<option value="electricity">Electricity</option>
								<option value="road">Road</option>
							</select>
						</div>
					</div>

					{/* Thread count */}
					<div className="amr_thread_count">
						{filtered_threads.length} conversation
						{filtered_threads.length !== 1 ? 's' : ''}
					</div>

					{/* Thread list */}
					<div className="amr_thread_list">
						{filtered_threads.length === 0 ? (
							<div className="amr_no_results">
								No conversations match your filters.
							</div>
						) : (
							filtered_threads.map((thread) => (
								<ThreadItem
									key={thread.id}
									thread={thread}
									is_active={
										selected_thread?.id === thread.id
									}
									on_select={set_selected_thread}
								/>
							))
						)}
					</div>
				</div>

				{/* Right panel */}
				<div className="amr_panel_right">
					{selected_thread ? (
						<MessageViewer
							thread={selected_thread}
							messages={messages}
							on_toggle_chat={handle_toggle_chat}
							is_locking={locking_id === selected_thread.id}
						/>
					) : (
						<EmptyState />
					)}
				</div>
			</div>
		</div>
	)
}