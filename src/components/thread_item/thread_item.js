// src/components/admin_messaging_review/ThreadItem.js
import React from 'react'
import { CategoryPill } from '../shared_ui/shared_ui.js'
import { format_thread_time } from '../../utils/amr_untils.js'
import './thread_item.css'

export default function ThreadItem({ thread, is_active, on_select }) {
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
