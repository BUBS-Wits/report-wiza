import {
	collection,
	query,
	where,
	or,
	orderBy,
	onSnapshot,
	doc,
	getDoc,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'

// ── Simple cache to avoid re-fetching request docs ───────────────────────────
const request_cache = new Map()

async function fetch_request(rid) {
	if (request_cache.has(rid)) {
		return request_cache.get(rid)
	}
	try {
		const snap = await getDoc(doc(db, 'service_requests', rid))
		const data = snap.exists() ? { id: snap.id, ...snap.data() } : null
		request_cache.set(rid, data)
		return data
	} catch (e) {
		return null
	}
}

// ── Safely parse dates ───────────────────────────────────────────────────────
function to_date(sent_at) {
	if (!sent_at) {
		return new Date(0)
	}
	if (typeof sent_at.toDate === 'function') {
		return sent_at.toDate()
	}
	const d = new Date(sent_at)
	return isNaN(d.getTime()) ? new Date(0) : d
}

/* ─────────────────────────────────────────────────────────────────────────────
   subscribe_to_worker_conversations
   ─────────────────────────────────────────────────────────────────────────────
   Sets up a SINGLE efficient listener for all messages where the worker is 
   EITHER the sender OR the receiver.
───────────────────────────────────────────────────────────────────────────── */
export function subscribe_to_worker_conversations(
	worker_uid,
	on_update,
	on_error
) {
	const q = query(
		collection(db, 'messages'),
		or(
			where('sender_uid', '==', worker_uid),
			where('receiver_uid', '==', worker_uid)
		),
		orderBy('sent_at', 'asc')
	)

	return onSnapshot(
		q,
		async (snap) => {
			try {
				// 1. Deduplicate (just in case) and parse messages
				const message_map = new Map()
				snap.docs.forEach((d) => {
					message_map.set(d.id, { id: d.id, ...d.data() })
				})
				const all_messages = Array.from(message_map.values())

				// 2. Group messages by their associated request_id
				const groups = new Map()
				for (const msg of all_messages) {
					const rid = msg.request_id || msg.request_uid
					if (!rid) {
						continue
					}
					if (!groups.has(rid)) {
						groups.set(rid, [])
					}
					groups.get(rid).push(msg)
				}

				// 3. Fetch request details for all active conversations in parallel
				const rids = Array.from(groups.keys())
				await Promise.all(rids.map((rid) => fetch_request(rid)))

				const conversations = []

				// 4. Build the rich conversation objects
				for (const [rid, msgs] of groups.entries()) {
					const request = request_cache.get(rid)
					if (!request) {
						continue
					} // Skip if parent request doc is missing

					// Identify the other participant (the resident)
					let other_uid = null
					for (const m of msgs) {
						if (m.sender_uid && m.sender_uid !== worker_uid) {
							other_uid = m.sender_uid
							break
						}
						if (m.receiver_uid && m.receiver_uid !== worker_uid) {
							other_uid = m.receiver_uid
							break
						}
					}

					// Sort messages strictly by time
					msgs.sort((a, b) => to_date(a.sent_at) - to_date(b.sent_at))

					const last_message = msgs[msgs.length - 1]

					// Calculate unread count (only messages sent to the worker that are unread)
					const unread_count = msgs.filter(
						(m) => m.receiver_uid === worker_uid && !m.read
					).length

					conversations.push({
						request_id: rid,
						request_details: request,
						other_uid: other_uid || 'unknown',
						unread_count,
						last_message,
						all_messages: msgs,
					})
				}

				// 5. Sort conversations so the one with the newest message is at the top
				conversations.sort(
					(a, b) =>
						to_date(b.last_message.sent_at) -
						to_date(a.last_message.sent_at)
				)

				// Fire the callback to update the React UI
				on_update(conversations)
			} catch (err) {
				console.error('Error processing worker conversations:', err)
				if (on_error) {
					on_error(err)
				}
			}
		},
		(err) => {
			console.error('Snapshot error:', err)
			if (on_error) {
				on_error(err)
			}
		}
	)
}
