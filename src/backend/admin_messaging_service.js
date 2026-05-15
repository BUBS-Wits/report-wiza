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

/* ─────────────────────────────────────────────────────────────────────────────
   In-memory caches — avoids redundant Firestore reads within a session.
   These are intentionally module-level so they survive re-renders.
───────────────────────────────────────────────────────────────────────────── */
const request_cache = new Map()
const user_cache = new Map()

async function fetch_request(id) {
	if (request_cache.has(id)) {
		return request_cache.get(id)
	}
	const snap = await getDoc(doc(db, 'service_requests', id))
	const data = snap.exists() ? { id: snap.id, ...snap.data() } : null
	request_cache.set(id, data)
	return data
}

async function fetch_user(uid) {
	if (!uid) {
		return null
	}
	if (user_cache.has(uid)) {
		return user_cache.get(uid)
	}
	const snap = await getDoc(doc(db, 'users', uid))
	const data = snap.exists() ? { uid: snap.id, ...snap.data() } : null
	user_cache.set(uid, data)
	return data
}

/* ─────────────────────────────────────────────────────────────────────────────
   Normalise sent_at → JS Date.
   Messages are stored as UTC strings (e.g. "Mon, 12 May 2025 10:30:00 GMT"),
   but older docs may have Firestore Timestamps — handle both defensively.
───────────────────────────────────────────────────────────────────────────── */
function to_date(sent_at) {
	if (!sent_at) {
		return null
	}
	if (typeof sent_at.toDate === 'function') {
		return sent_at.toDate()
	}
	const d = new Date(sent_at)
	return isNaN(d.getTime()) ? null : d
}

/* ─────────────────────────────────────────────────────────────────────────────
   subscribe_to_admin_threads
   ─────────────────────────────────────────────────────────────────────────────
   Subscribes to ALL messages, groups them by request_uid, then enriches each
   thread with data from service_requests and users.

   Each thread object in the on_update callback has shape:
   {
     id              {string}   — the request_uid (used as React key)
     request_uid     {string}
     request_id      {string}   — display ID from the request doc
     category        {string}
     status          {string}
     messaging_enabled {boolean}
     worker          { uid, name }
     resident        { uid, name }
     last_message    { text, sent_at: Date, sender_uid }
     unread_count    {number}
     message_count   {number}
   }

   @param {function} on_update  — called with thread[] on every change
   @param {function} on_error   — called with Error on failure
   @returns {function}          — unsubscribe (call on unmount)
───────────────────────────────────────────────────────────────────────────── */
export function subscribe_to_admin_threads(on_update, on_error) {
	const q = query(collection(db, 'messages'), orderBy('sent_at', 'asc'))

	const unsub = onSnapshot(
		q,
		async (snap) => {
			try {
				const all_messages = snap.docs.map((d) => ({
					id: d.id,
					...d.data(),
				}))

				// ── Group by request_uid (tolerate both field names) ──────
				const threads_map = new Map()
				for (const msg of all_messages) {
					const rid = msg.request_uid || msg.request_id
					if (!rid) {
						continue
					}
					if (!threads_map.has(rid)) {
						threads_map.set(rid, [])
					}
					threads_map.get(rid).push(msg)
				}

				// ── Collect all UIDs we'll need to look up ────────────────
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
						if (m.sender_uid) {
							all_uids.add(m.sender_uid)
						}
						if (m.receiver_uid) {
							all_uids.add(m.receiver_uid)
						}
					})

					thread_entries.push({ rid, sorted, last })
				}

				// ── Parallel fetch: all service_requests + all users ──────
				await Promise.all([
					...thread_entries.map(({ rid }) => fetch_request(rid)),
					...[...all_uids].map((uid) => fetch_user(uid)),
				])

				// ── Build enriched thread objects ─────────────────────────
				const threads = []

				for (const { rid, sorted, last } of thread_entries) {
					const request = request_cache.get(rid)
					if (!request) {
						continue
					}

					const resident_uid = request.user_uid ?? null

					// FIX: Infer the worker's UID directly from the chat participants!
					// Since WardWatch uses an assignments collection, the worker isn't on the request doc.
					// The worker is simply the participant who is NOT the resident.
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

					// Unread = messages not yet read by their receiver
					const unread_count = sorted.filter((m) => !m.read).length

					threads.push({
						id: rid,
						request_uid: rid,
						request_id: request.id,
						category: request.category ?? 'unknown',
						status: request.status ?? 'unknown',
						// Default true when field is absent (matches service_requests schema)
						messaging_enabled: request.messaging_enabled !== false,
						worker: {
							uid: worker_uid ?? '',
							name:
								worker?.display_name ??
								worker?.email ??
								'Unknown Worker',
						},
						resident: {
							uid: resident_uid ?? '',
							name:
								resident?.display_name ??
								resident?.email ??
								'Unknown Resident',
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

				// Sort: most recently active first
				threads.sort(
					(a, b) =>
						(b.last_message?.sent_at?.getTime() ?? 0) -
						(a.last_message?.sent_at?.getTime() ?? 0)
				)

				on_update(threads)
			} catch (err) {
				console.error('[admin_messaging_service] enrich error:', err)
				if (on_error) {
					on_error(err)
				}
			}
		},
		(err) => {
			console.error('[admin_messaging_service] snapshot error:', err)
			if (on_error) {
				on_error(err)
			}
		}
	)

	return unsub
}

/* ─────────────────────────────────────────────────────────────────────────────
   subscribe_to_thread_messages
   ─────────────────────────────────────────────────────────────────────────────
   Subscribes to all messages belonging to a single thread (request_uid).
   Calls on_update with a date-sorted array of message objects every time
   Firestore emits a change.

   Each message object has shape:
   {
     id          {string}
     text        {string}
     sender_uid  {string}
     receiver_uid {string}
     sent_at     {Date}
     read        {boolean}
     request_uid {string}
   }

   @param {string}   request_uid
   @param {function} on_update   — called with message[] on every change
   @param {function} on_error    — called with Error on failure
   @returns {function}           — unsubscribe (call on unmount / thread change)
───────────────────────────────────────────────────────────────────────────── */
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
			console.error(
				'[admin_messaging_service] messages snapshot error:',
				err
			)
			if (on_error) {
				on_error(err)
			}
		}
	)

	return unsub
}

/* ─────────────────────────────────────────────────────────────────────────────
   admin_toggle_thread_messaging
   ─────────────────────────────────────────────────────────────────────────────
   Enables or disables messaging for a thread by updating the service_request
   doc. Also invalidates the request cache so the next snapshot re-fetches the
   updated messaging_enabled value.

   @param {string}      thread_id   — the request_uid / service_request doc id
   @param {boolean}     new_status  — true = enabled, false = locked
   @param {string}      admin_uid   — uid of the admin performing the action
   @param {string|null} reason      — optional reason stored on the doc
───────────────────────────────────────────────────────────────────────────── */
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

	// Bust the cache so the next thread-list snapshot picks up the new value
	invalidate_request_cache(thread_id)
}

/* ─────────────────────────────────────────────────────────────────────────────
   invalidate_request_cache
   Call this after admin_toggle_thread_messaging so the next snapshot
   re-fetches the updated messaging_enabled value from Firestore.
───────────────────────────────────────────────────────────────────────────── */
export function invalidate_request_cache(request_uid) {
	request_cache.delete(request_uid)
}
