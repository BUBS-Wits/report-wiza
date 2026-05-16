// src/components/admin_messaging_review/MessageViewer.js
import React, { useEffect, useRef } from 'react'
import { CategoryPill, StatusChip } from '../shared_ui/shared_ui.js'
import {
	format_message_time,
	format_date_label,
	same_day,
} from '../../utils/amr_untils.js'
import './message_viewer.css'

export default function MessageViewer({
	thread,
	messages,
	on_toggle_chat,
	is_locking,
}) {
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
