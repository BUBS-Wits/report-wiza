import React, { useState, useEffect } from 'react'
import {
    fetch_admin_requests,
    set_request_priority,
    close_request,
    fetch_stale_requests,
    assign_stale_request,
    fetch_workers_for_assign,
} from '../../backend/admin_requests_service.js'
import { auth } from '../../firebase_config.js'
import './admin_requests.css'
import AdminCategories from '../admin_categories/admin_categories.js'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const PRIORITY_CLASS = {
    Low: 'priority_low',
    Medium: 'priority_medium',
    High: 'priority_high',
    Critical: 'priority_critical',
}

function AdminRequests() {
    const [requests, set_requests] = useState([])
    const [stale_requests, set_stale_requests] = useState([])
    const [workers, set_workers] = useState([])
    const [loading, set_loading] = useState(true)
    const [error, set_error] = useState(null)
    const [updating_id, set_updating_id] = useState(null)
    const [close_modal, set_close_modal] = useState(null)
    const [close_comment, set_close_comment] = useState('')
    const [close_error, set_close_error] = useState('')
    const [message, set_message] = useState(null)
    const [active_tab, set_active_tab] = useState('all')

    const load = async () => {
        set_loading(true)
        set_error(null)
        try {
            const [reqs, wrks] = await Promise.all([
                fetch_admin_requests(),
                fetch_workers_for_assign(),
            ])
            set_requests(reqs)
            set_workers(wrks)
        } catch (err) {
            set_error(err.message)
        } finally {
            set_loading(false)
        }

        // Load stale requests separately so index error doesn't break the page
        try {
            const stale = await fetch_stale_requests()
            set_stale_requests(stale)
        } catch (err) {
            console.warn(
                'Stale requests unavailable — index may still be building:',
                err.message
            )
        }
    }

    useEffect(() => {
        load()
    }, [])

    // US027 — set priority
    const handle_priority_change = async (request_id, priority) => {
        set_updating_id(request_id)
        try {
            await set_request_priority(request_id, priority)
            set_requests((prev) =>
                prev.map((r) => (r.id === request_id ? { ...r, priority } : r))
            )
            show_message('Priority updated successfully.')
        } catch (err) {
            show_message(err.message, true)
        } finally {
            set_updating_id(null)
        }
    }

    // US028 — close request
    const handle_close_submit = async () => {
        if (!close_comment.trim()) {
            set_close_error('A comment is required to close a request.')
            return
        }
        try {
            await close_request(
                close_modal,
                auth.currentUser?.uid,
                close_comment
            )
            set_requests((prev) =>
                prev.map((r) =>
                    r.id === close_modal ? { ...r, status: 'closed' } : r
                )
            )
            set_close_modal(null)
            set_close_comment('')
            set_close_error('')
            show_message('Request closed successfully.')
        } catch (err) {
            set_close_error(err.message)
        }
    }

    // US030 — assign stale request
    const handle_assign = async (request_id, worker_uid) => {
        set_updating_id(request_id)
        try {
            await assign_stale_request(request_id, worker_uid)
            set_stale_requests((prev) =>
                prev.filter((r) => r.id !== request_id)
            )
            show_message('Request assigned successfully.')
        } catch (err) {
            show_message(err.message, true)
        } finally {
            set_updating_id(null)
        }
    }

    const show_message = (text, is_error = false) => {
        set_message({ text, is_error })
        setTimeout(() => set_message(null), 3000)
    }

    if (loading) {
        return <div className="ar_loading">Loading requests...</div>
    }

    if (error) {
        return <div className="ar_error">{error}</div>
    }

    return (
        <div className="ar_container">
            {message && (
                <div
                    className={`ar_message ${message.is_error ? 'ar_message_error' : 'ar_message_success'}`}
                >
                    {message.text}
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="ar_tabs">
                <button
                    className={`ar_tab ${active_tab === 'all' ? 'ar_tab_active' : ''}`}
                    onClick={() => set_active_tab('all')}
                >
                    All requests
                    <span className="ar_tab_count">{requests.length}</span>
                </button>
                <button
                    className={`ar_tab ${active_tab === 'stale' ? 'ar_tab_active' : ''}`}
                    onClick={() => set_active_tab('stale')}
                >
                    Stale requests
                    <span className="ar_tab_count">
                        {stale_requests.length}
                    </span>
                </button>
                <button
                    className={`ar_tab ${active_tab === 'categories' ? 'ar_tab_active' : ''}`}
                    onClick={() => set_active_tab('categories')}
                >
                    Categories
                </button>
            </div>

            {/* ── All requests table — US027 + US028 ── */}
            {active_tab === 'all' && (
                <div className="ar_card">
                    <div className="ar_table_header">
                        <span>ID</span>
                        <span>Category</span>
                        <span>Description</span>
                        <span>Status</span>
                        <span>Priority</span>
                        <span>Actions</span>
                    </div>
                    {requests.length === 0 ? (
                        <div className="ar_empty">No requests found.</div>
                    ) : (
                        requests.map((req) => (
                            <div className="ar_row" key={req.id}>
                                <span className="ar_id">
                                    {req.id.slice(0, 8)}
                                </span>
                                <span className="ar_cat">{req.category}</span>
                                <span className="ar_desc">
                                    {req.description}
                                </span>
                                <span
                                    className={`ar_status ar_status_${req.status}`}
                                >
                                    {req.status}
                                </span>

                                {/* US027 — Priority dropdown */}
                                <select
                                    className={`ar_priority_select ${PRIORITY_CLASS[req.priority] ?? ''}`}
                                    value={req.priority ?? 'Medium'}
                                    onChange={(e) =>
                                        handle_priority_change(
                                            req.id,
                                            e.target.value
                                        )
                                    }
                                    disabled={
                                        updating_id === req.id ||
                                        req.status === 'closed'
                                    }
                                >
                                    {PRIORITIES.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>

                                {/* US028 — Close button */}
                                {req.status !== 'closed' &&
                                    req.status !== 'resolved' && (
                                        <button
                                            className="ar_close_btn"
                                            onClick={() =>
                                                set_close_modal(req.id)
                                            }
                                            disabled={updating_id === req.id}
                                        >
                                            Close
                                        </button>
                                    )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── Stale requests — US030 ── */}
            {active_tab === 'stale' && (
                <div className="ar_card">
                    <p className="ar_stale_note">
                        These requests have had no status update for 3 or more
                        days.
                    </p>
                    {/* ADDED: Specific class for the 5-column grid layout */}
                    <div className="ar_table_header ar_table_header_stale">
                        <span>ID</span>
                        <span>Category</span>
                        <span>Description</span>
                        <span>Created</span>
                        <span>Assign to worker</span>
                    </div>
                    {stale_requests.length === 0 ? (
                        <div className="ar_empty">No stale requests.</div>
                    ) : (
                        stale_requests.map((req) => (
                            // ADDED: Specific class for the 5-column grid layout
                            <div className="ar_row ar_row_stale" key={req.id}>
                                <span className="ar_id">
                                    {req.id.slice(0, 8)}
                                </span>
                                <span className="ar_cat">{req.category}</span>
                                <span className="ar_desc">
                                    {req.description}
                                </span>
                                <span className="ar_date">
                                    {req.created_at?.toDate
                                        ? req.created_at
                                                .toDate()
                                                .toLocaleDateString()
                                        : '—'}
                                </span>
                                <select
                                    className="ar_assign_select"
                                    defaultValue=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handle_assign(
                                                req.id,
                                                e.target.value
                                            )
                                        }
                                    }}
                                    disabled={updating_id === req.id}
                                >
                                    <option value="" disabled>
                                        Select worker
                                    </option>
                                    {workers.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.display_name ?? w.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))
                    )}
                </div>
            )}
            {active_tab === 'categories' && <AdminCategories />}
            {/* ── Close modal — US028 ── */}
            {close_modal && (
                <div className="ar_modal_overlay">
                    <div className="ar_modal">
                        <h2 className="ar_modal_title">Close request</h2>
                        <p className="ar_modal_sub">
                            Please provide a reason for closing this request.
                            This is mandatory for accountability.
                        </p>
                        <textarea
                            className="ar_modal_textarea"
                            placeholder="Enter reason for closing..."
                            value={close_comment}
                            onChange={(e) => {
                                set_close_comment(e.target.value)
                                set_close_error('')
                            }}
                            rows={4}
                        />
                        {close_error && (
                            <p className="ar_modal_error">{close_error}</p>
                        )}
                        <div className="ar_modal_actions">
                            <button
                                className="ar_modal_cancel"
                                onClick={() => {
                                    set_close_modal(null)
                                    set_close_comment('')
                                    set_close_error('')
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="ar_modal_confirm"
                                onClick={handle_close_submit}
                            >
                                Confirm close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminRequests