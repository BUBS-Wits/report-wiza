import React, { useState, useEffect } from 'react'
import { subscribe_to_worker_conversations } from '../../backend/worker_conversations_service.js'
import MessageThread from '../../components/message_thread/message_thread.js'
import './worker_messages.css'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Format a Firestore Timestamp into a short label for the conversation list.
 */
function format_conv_time(ts) {
    if (!ts) {
        return ''
    }
    const date = ts.toDate ? ts.toDate() : new Date(ts)
    const now = new Date()
    const is_today =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()

    if (is_today) {
        return date.toLocaleTimeString('en-ZA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        })
    }
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function ConversationItem({ conv, req, is_selected, worker_uid, on_click }) {
    const { last_message, unread_count } = conv
    const category = req?.category ?? 'Request'
    const ward = req?.ward ?? ''
    const status = req?.status ?? 'Pending' // Provide a default status
    const time_label = format_conv_time(last_message?.sent_at)
    const is_mine = last_message?.sender_uid === worker_uid
    const preview = last_message?.text ?? ''
    const initials = category.slice(0, 2).toUpperCase()

    return (
        <button
            className={`wm-conv-item${is_selected ? ' wm-conv-item--active' : ''}${unread_count > 0 ? ' wm-conv-item--unread' : ''}`}
            role="option"
            aria-selected={is_selected}
            onClick={on_click}
        >
            <div
                className={`wm-conv-avatar wm-conv-avatar--${status.toLowerCase()}`}
                aria-hidden="true"
            >
                {initials}
            </div>

            <div className="wm-conv-content">
                <div className="wm-conv-top-row">
                    <span className="wm-conv-name">{category}</span>
                    <span className="wm-conv-time">{time_label}</span>
                </div>
                <div className="wm-conv-bottom-row">
                    <span className="wm-conv-preview">
                        {is_mine && (
                            <span className="wm-conv-preview-you">You: </span>
                        )}
                        {preview || <em>No messages yet</em>}
                    </span>
                    {unread_count > 0 && (
                        <span className="wm-unread-badge">
                            {unread_count}
                        </span>
                    )}
                </div>
                {ward && <span className="wm-conv-ward">{ward}</span>}
            </div>
        </button>
    )
}

function EmptyThreadState({ has_conversations }) {
    return (
        <div className="wm-empty-thread">
            <div className="wm-empty-thread-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                    <rect
                        x="8"
                        y="12"
                        width="48"
                        height="36"
                        rx="6"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    />
                    <path
                        d="M20 32h24M20 24h16"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M24 48l-8 8v-8"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <p className="wm-empty-thread-title">
                {has_conversations
                    ? 'Select a conversation'
                    : 'No messages yet'}
            </p>
            <p className="wm-empty-thread-sub">
                {has_conversations
                    ? 'Click a conversation on the left to open the thread.'
                    : 'Messages will appear here once a conversation starts.'}
            </p>
        </div>
    )
}


/* ── Main component ─────────────────────────────────────────────────── */

export default function WorkerMessages({ worker, requests = [] }) {
    const [requests_map, set_requests_map] = useState({}) 
    const [conversations, set_conversations] = useState([])
    const [selected_id, set_selected_id] = useState(null)
    const [search, set_search] = useState('')
    const [conv_loading, set_conv_loading] = useState(true)

    /* ── Build lookup map from passed requests ────────────────────────── */
    useEffect(() => {
        const map = {}
        requests.forEach((r) => {
            map[r.id] = r
        })
        set_requests_map(map)
    }, [requests])

    /* ── Conversations subscription ───────────────────────────────────── */
    useEffect(() => {
        if (!worker?.uid) {
            set_conv_loading(false) // Stop loading if no worker
            return
        }
        set_conv_loading(true)

        const unsub = subscribe_to_worker_conversations(
            worker.uid,
            (convs) => {
                set_conversations(convs)
                set_conv_loading(false)
            },
            (err) => {
                console.error(err)
                set_conv_loading(false)
            }
        )
        return unsub
    }, [worker?.uid])

    /* ── Derived values ───────────────────────────────────────────────── */

    const filtered = conversations.filter((c) => {
        if (!search.trim()) {
            return true
        }
        const req = requests_map[c.request_id]
        const term = search.toLowerCase()
        const cat = req?.category?.toLowerCase() ?? ''
        const id = c.request_id.toLowerCase()
        const preview = c.last_message?.text?.toLowerCase() ?? ''
        return cat.includes(term) || id.includes(term) || preview.includes(term)
    })

    const selected_conv =
        conversations.find((c) => c.request_id === selected_id) ?? null
    const selected_req = selected_id ? requests_map[selected_id] : null
    const total_unread = conversations.reduce((n, c) => n + c.unread_count, 0)

    /* ── Render ───────────────────────────────────────────────────────── */

    return (
        <div 
            className={`wm-layout ${selected_id ? 'wm-layout--thread-open' : ''}`} 
            style={{ height: '100%' }}
        >
            {/* ── LEFT: conversation list ──────────────────────────── */}
            <aside className="wm-sidebar">
                <div className="wm-sidebar-header">
                    <div className="wm-sidebar-title-row">
                        <h1 className="wm-sidebar-title">Messages</h1>
                        {total_unread > 0 && (
                            <span className="wm-total-unread">
                                {total_unread}
                            </span>
                        )}
                    </div>
                    <div className="wm-search-wrap">
                        <svg
                            className="wm-search-icon"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                        >
                            <circle
                                cx="6.5"
                                cy="6.5"
                                r="4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            />
                            <path
                                d="M10.5 10.5L14 14"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                        <input
                            className="wm-search"
                            type="search"
                            placeholder="Search by request or message…"
                            value={search}
                            onChange={(e) => set_search(e.target.value)}
                            aria-label="Search conversations"
                        />
                    </div>
                </div>

                <div
                    className="wm-conv-list"
                    role="listbox"
                    aria-label="Conversations"
                >
                    {conv_loading && (
                        <div className="wm-conv-loading">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="wm-skeleton-item">
                                    <div className="wm-skeleton-avatar" />
                                    <div className="wm-skeleton-lines">
                                        <div className="wm-skeleton-line wm-skeleton-line--title" />
                                        <div className="wm-skeleton-line wm-skeleton-line--sub" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!conv_loading && filtered.length === 0 && (
                        <div className="wm-conv-empty">
                            {search
                                ? `No conversations matching "${search}"`
                                : 'No conversations yet.'}
                        </div>
                    )}

                    {!conv_loading &&
                        filtered.map((conv) => {
                            const req = requests_map[conv.request_id]
                            return (
                                <ConversationItem
                                    key={conv.request_id}
                                    conv={conv}
                                    req={req}
                                    is_selected={
                                        conv.request_id === selected_id
                                    }
                                    worker_uid={worker?.uid}
                                    on_click={() =>
                                        set_selected_id(conv.request_id)
                                    }
                                />
                            )
                        })}
                </div>
            </aside>

            {/* ── RIGHT: thread view ───────────────────────────────── */}
            <main className="wm-thread-area">
                {selected_conv && worker ? (
                    <>
                        <div className="wm-thread-topbar">
                            <button
                                className="wm-back-btn"
                                onClick={() => set_selected_id(null)}
                                aria-label="Back to conversations"
                            >
                                <svg
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    aria-hidden="true"
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
                            <div className="wm-thread-topbar-avatar">
                                {(
                                    selected_conv.other_uid?.[0] ?? '?'
                                ).toUpperCase()}
                            </div>
                            <div className="wm-thread-topbar-info">
                                <span className="wm-thread-topbar-name">
                                    {selected_req?.resident_name ??
                                        'Resident'}
                                </span>
                                <span className="wm-thread-topbar-meta">
                                    {selected_req
                                        ? `${selected_req.category} · ${selected_req.ward}`
                                        : selected_conv.request_id}
                                </span>
                            </div>
                            <span
                                className={`wm-thread-status-badge wm-thread-status-badge--${(selected_req?.status ?? 'pending').toLowerCase()}`}
                            >
                                {selected_req?.status ?? 'Pending'}
                            </span>
                        </div>

                        <div className="wm-thread-body">
                            <MessageThread
                                request_id={selected_conv.request_id}
                                current_uid={worker.uid}
                                current_name={worker.name}
                                current_role="worker"
                                other_uid={selected_conv.other_uid}
                                other_name={
                                    selected_req?.resident_name ??
                                    'Resident'
                                }
                            />
                        </div>
                    </>
                ) : (
                    <EmptyThreadState
                        has_conversations={conversations.length > 0}
                    />
                )}
            </main>
        </div>
    )
}