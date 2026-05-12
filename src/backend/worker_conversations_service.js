import {
	collection,
	query,
	where,
	onSnapshot,
	orderBy,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'

/**
 * Normalise a stored date value (UTC string or Firestore Timestamp) → JS Date.
 */
function to_date(value) {
	if (!value) return null
	if (typeof value.toDate === 'function') return value.toDate()
	const d = new Date(value)
	return isNaN(d.getTime()) ? null : d
}

/**
 * Subscribe to all conversations involving the given worker UID.
 *
 * Because Firestore doesn't support OR across different fields in one query,
 * we run two parallel snapshots (sent + received) and merge them client-side.
 *
 * Each conversation in the result list contains:
 *   request_uid   {string}
 *   other_uid     {string}   — resident's Firebase UID
 *   last_message  {object}   — { text, sent_at: Date, sender_uid }
 *   unread_count  {number}   — messages sent TO the worker that are unread
 *   all_messages  {array}    — full message list for this thread (sorted asc)
 *
 * @param {string}   worker_uid
 * @param {function} on_update  — called with conversation[] on every change
 * @param {function} on_error   — called with Error on failure
 * @returns {function}          — unsubscribe (call on unmount)
 */
export function subscribe_to_worker_conversations(
	worker_uid,
	on_update,
	on_error
) {
	// Snapshot A: messages the worker SENT
	const q_sent = query(
		collection(db, 'messages'),
		where('sender_uid', '==', worker_uid),
		orderBy('sent_at', 'asc')
	)

	// Snapshot B: messages the worker RECEIVED
	const q_received = query(
		collection(db, 'messages'),
		where('receiver_uid', '==', worker_uid),
		orderBy('sent_at', 'asc')
	)

	let sent_msgs = []
	let received_msgs = []

	const merge_and_emit = () => {
		// Combine and deduplicate by message id
		const all_by_id = new Map()
		;[...sent_msgs, ...received_msgs].forEach((m) => all_by_id.set(m.id, m))

		// Group by request_uid — messages are stored with this field name
		// (NOT request_id, which is the display ID on the service_request doc)
		const threads = new Map()
		for (const msg of all_by_id.values()) {
			const key = msg.request_uid
			if (!key) continue // skip malformed messages
			if (!threads.has(key)) threads.set(key, [])
			threads.get(key).push(msg)
		}

		// Build conversation summaries
		const conversations = []
		for (const [request_uid, msgs] of threads.entries()) {
			// Sort messages ascending. Dates are stored as UTC strings so we
			// normalise to JS Date first — toMillis() only works on Timestamps.
			const sorted = [...msgs].sort((a, b) => {
				const ta = to_date(a.sent_at)?.getTime() ?? 0
				const tb = to_date(b.sent_at)?.getTime() ?? 0
				return ta - tb
			})

			const last = sorted[sorted.length - 1]

			// Derive the resident's uid: the uid that isn't the worker
			const other_uid =
				last.sender_uid === worker_uid
					? last.receiver_uid
					: last.sender_uid

			const unread_count = sorted.filter(
				(m) => m.receiver_uid === worker_uid && !m.read
			).length

			conversations.push({
				request_uid,
				other_uid,
				last_message: {
					...last,
					sent_at: to_date(last.sent_at),
				},
				unread_count,
				all_messages: sorted.map((m) => ({
					...m,
					sent_at: to_date(m.sent_at),
				})),
			})
		}

		// Sort conversations: most recently active first
		conversations.sort((a, b) => {
			const ta = a.last_message?.sent_at?.getTime() ?? 0
			const tb = b.last_message?.sent_at?.getTime() ?? 0
			return tb - ta
		})

		on_update(conversations)
	}

	const unsub_sent = onSnapshot(
		q_sent,
		(snap) => {
			sent_msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
			merge_and_emit()
		},
		(err) => {
			console.error('[conversations_service] sent query error:', err)
			if (on_error) on_error(err)
		}
	)

	const unsub_received = onSnapshot(
		q_received,
		(snap) => {
			received_msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
			merge_and_emit()
		},
		(err) => {
			console.error('[conversations_service] received query error:', err)
			if (on_error) on_error(err)
		}
	)

	// Return a single unsubscribe that tears down both listeners
	return () => {
		unsub_sent()
		unsub_received()
	}
}
