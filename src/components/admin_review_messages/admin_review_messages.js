// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

// src/components/admin_review_messages/AdminReviewMessages.js
import React, { useState, useEffect } from 'react'
import { auth } from '../../firebase_config.js'
import {
	subscribe_to_admin_threads,
	subscribe_to_thread_messages,
	admin_toggle_thread_messaging,
	invalidate_request_cache,
} from '../../backend/admin_messaging_service.js'

import ThreadItem from '../thread_item/thread_item.js'
import MessageViewer from '../message_viewer/message_viewer.js'
import './admin_review_messages.css'

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
		if (!selected_thread) {
			return
		}
		const fresh = threads.find((t) => t.id === selected_thread.id)
		if (fresh) {
			set_selected_thread(fresh)
		}
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

		// Make sure the category filter handles the uppercase database values!
		const matches_category =
			filter_category === 'all' ||
			(t.category &&
				t.category.toLowerCase() === filter_category.toLowerCase())

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

export function EmptyState() {
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
