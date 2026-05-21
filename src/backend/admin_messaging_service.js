import {
    collection,
    query,
    orderBy,
    where,
    onSnapshot,
    doc,
    getDoc,
    updateDoc,
    or,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'

const request_cache = new Map()
const user_cache = new Map()

async function fetch_request(id) {
    if (request_cache.has(id)) return request_cache.get(id)
    const snap = await getDoc(doc(db, 'service_requests', id))
    const data = snap.exists() ? { id: snap.id, ...snap.data() } : null
    request_cache.set(id, data)
    return data
}

async function fetch_user(uid) {
    if (!uid) return null
    if (user_cache.has(uid)) return user_cache.get(uid)
    const snap = await getDoc(doc(db, 'users', uid))
    const data = snap.exists() ? { uid: snap.id, ...snap.data() } : null
    user_cache.set(uid, data)
    return data
}

function to_date(sent_at) {
    if (!sent_at) return null
    if (typeof sent_at.toDate === 'function') return sent_at.toDate()
    const d = new Date(sent_at)
    return isNaN(d.getTime()) ? null : d
}

// ── NEW ──────────────────────────────────────────────────────────────────────
// subscribe_to_request_lock
// ─────────────────────────────────────────────────────────────────────────────
// Real-time listener on a single service_request doc. Use this in every chat
// UI (admin, worker, resident) to reactively disable the input the moment
// messaging_enabled flips, without a page reload.
//
// Calls on_update with:
// {
//   messaging_enabled    {boolean}
//   messaging_lock_reason {string|null}
//   messaging_locked_by  {string|null}  — uid of the admin who locked it
// }
//
// Also keeps request_cache in sync so subscribe_to_admin_threads doesn't
// serve a stale messaging_enabled after a toggle.
//
// @param {string}   request_uid
// @param {function} on_update
// @param {function} on_error
// @returns {function} unsubscribe
// ─────────────────────────────────────────────────────────────────────────────
export function subscribe_to_request_lock(request_uid, on_update, on_error) {
    const ref = doc(db, 'service_requests', request_uid)

    const unsub = onSnapshot(
        ref,
        (snap) => {
            if (!snap.exists()) return

            const data = snap.data()

            // Keep cache fresh so thread list picks up the new value too
            request_cache.set(request_uid, { id: snap.id, ...data })

            on_update({
                messaging_enabled: data.messaging_enabled !== false,
                messaging_lock_reason: data.messaging_lock_reason ?? null,
                messaging_locked_by: data.messaging_locked_by ?? null,
            })
        },
        (err) => {
            console.error('[admin_messaging_service] lock snapshot error:', err)
            if (on_error) on_error(err)
        }
    )

    return unsub
}
// ─────────────────────────────────────────────────────────────────────────────

export function subscribe_to_admin_threads(on_update, on_error) {
    const q = query(collection(db, 'messages'), orderBy('sent_at', 'asc'))

    const unsub = onSnapshot(
        q,
        async (snap) => {
            try {
                const all_messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

                const threads_map = new Map()
                for (const msg of all_messages) {
                    const rid = msg.request_uid || msg.request_id
                    if (!rid) continue
                    if (!threads_map.has(rid)) threads_map.set(rid, [])
                    threads_map.get(rid).push(msg)
                }

                const all_uids = new Set()
                const thread_entries = []

                for (const [rid, msgs] of threads_map.entries()) {
                    const sorted = [...msgs].sort(
                        (a, b) =>
                            (to_date(a.sent_at)?.getTime() ?? 0) -
                            (to_date(b.sent_at)?.getTime() ?? 0)
                    )
                    const last = sorted[sorted.length - 1]
                    sorted.forEach((m) => {
                        if (m.sender_uid) all_uids.add(m.sender_uid)
                        if (m.receiver_uid) all_uids.add(m.receiver_uid)
                    })
                    thread_entries.push({ rid, sorted, last })
                }

                // ── FIX: bust each request's cache entry before re-fetching ──
                // A messages snapshot won't re-fire when messaging_enabled changes
                // on service_requests, so without this the thread list would show
                // a stale lock state until the next message is sent.
                // subscribe_to_request_lock already updates the cache on its own
                // snapshot, but we defensively clear here too so any entry that
                // wasn't covered by an active lock subscription gets a fresh read.
                thread_entries.forEach(({ rid }) => {
                    // Only bust if the cache entry was NOT just updated by
                    // subscribe_to_request_lock (i.e. it predates the toggle).
                    // We identify staleness by the absence of messaging_updated_at
                    // matching what Firestore just wrote — simplest heuristic:
                    // always bust and let fetch_request re-populate.
                    request_cache.delete(rid)
                })

                await Promise.all([
                    ...thread_entries.map(({ rid }) => fetch_request(rid)),
                    ...[...all_uids].map((uid) => fetch_user(uid)),
                ])

                const threads = []

                for (const { rid, sorted, last } of thread_entries) {
                    const request = request_cache.get(rid)
                    if (!request) continue

                    const resident_uid = request.user_uid ?? null

                    let worker_uid = null
                    for (const m of sorted) {
                        if (m.sender_uid && m.sender_uid !== resident_uid) {
                            worker_uid = m.sender_uid
                            break
                        }
                        if (m.receiver_uid && m.receiver_uid !== resident_uid) {
                            worker_uid = m.receiver_uid
                            break
                        }
                    }

                    const worker = user_cache.get(worker_uid) ?? null
                    const resident = user_cache.get(resident_uid) ?? null
                    const unread_count = sorted.filter((m) => !m.read).length

                    threads.push({
                        id: rid,
                        request_uid: rid,
                        request_id: request.id,
                        category: request.category ?? 'unknown',
                        status: request.status ?? 'unknown',
                        messaging_enabled: request.messaging_enabled !== false,
                        worker: {
                            uid: worker_uid ?? '',
                            name: worker?.display_name ?? worker?.email ?? 'Unknown Worker',
                        },
                        resident: {
                            uid: resident_uid ?? '',
                            name: resident?.display_name ?? resident?.email ?? 'Unknown Resident',
                        },
                        last_message: {
                            text: last.text ?? '',
                            sent_at: to_date(last.sent_at),
                            sender_uid: last.sender_uid,
                        },
                        unread_count,
                        message_count: sorted.length,
                    })
                }

                threads.sort(
                    (a, b) =>
                        (b.last_message?.sent_at?.getTime() ?? 0) -
                        (a.last_message?.sent_at?.getTime() ?? 0)
                )

                on_update(threads)
            } catch (err) {
                console.error('[admin_messaging_service] enrich error:', err)
                if (on_error) on_error(err)
            }
        },
        (err) => {
            console.error('[admin_messaging_service] snapshot error:', err)
            if (on_error) on_error(err)
        }
    )

    return unsub
}

export function subscribe_to_thread_messages(request_uid, on_update, on_error) {
    const q = query(
        collection(db, 'messages'),
        or(
            where('request_uid', '==', request_uid),
            where('request_id', '==', request_uid)
        ),
        orderBy('sent_at', 'asc')
    )

    const unsub = onSnapshot(
        q,
        (snap) => {
            const messages = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                sent_at: to_date(d.data().sent_at),
            }))
            on_update(messages)
        },
        (err) => {
            console.error('[admin_messaging_service] messages snapshot error:', err)
            if (on_error) on_error(err)
        }
    )

    return unsub
}

export async function admin_toggle_thread_messaging(
    thread_id,
    new_status,
    admin_uid,
    reason = null
) {
    const ref = doc(db, 'service_requests', thread_id)

    await updateDoc(ref, {
        messaging_enabled: new_status,
        messaging_locked_by: new_status ? null : admin_uid,
        messaging_lock_reason: reason,
        messaging_updated_at: new Date().toISOString(),
    })

    invalidate_request_cache(thread_id)
}

export function invalidate_request_cache(request_uid) {
    request_cache.delete(request_uid)
}