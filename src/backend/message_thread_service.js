import {
	collection,
	addDoc,
	query,
	where,
	orderBy,
	onSnapshot,
	writeBatch,
	doc,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'

// ─────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────

/**
 * Subscribe to the realtime message thread for a given request.
 * Calls `on_messages` with the current list every time a message
 * is added or updated.
 *
 * @param {string}   request_uid  - The service request ID (= thread ID)
 * @param {function} on_messages  - Callback: (messages[]) => void
 * @param {function} on_error     - Callback: (Error) => void
 * @returns {function}            - Unsubscribe function — call on unmount
 */
export function subscribe_to_thread(request_uid, on_messages, on_error) {
	const q = query(
		collection(db, 'messages'),
		where('request_uid', '==', request_uid),
		orderBy('sent_at', 'asc')
	)

	const unsub = onSnapshot(
		q,
		(snap) => {
			const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
			on_messages(messages)
		},
		(err) => {
			console.error('[message_service] subscribe_to_thread error:', err)
			if (on_error) {
				on_error(err)
			}
		}
	)

	return unsub
}

/**
 * Send a new message on a request thread.
 *
 * @param {object} params
 * @param {string} params.request_uid
 * @param {string} params.sender_uid
 * @param {string} params.receiver_uid
 * @param {string} params.text
 * @returns {Promise<string>} - The new message document ID
 */
export async function send_message({
	request_uid,
	sender_uid,
	receiver_uid,
	text,
}) {
	const trimmed = text.trim()
	if (!trimmed) {
		throw new Error('Message text cannot be empty.')
	}

	const ref = await addDoc(collection(db, 'messages'), {
		request_uid,
		sender_uid,
		receiver_uid,
		text: trimmed,
		// Rule: All dates/times are stored as UTC strings
		sent_at: new Date().toUTCString(),
		read: false,
	})

	return ref.id
}

/**
 * Mark all unread messages addressed to `current_uid` as read.
 * Uses a batched write for efficiency.
 *
 * @param {Array}  messages     - Current message list from the thread
 * @param {string} current_uid  - UID of the user opening the thread
 */
export async function mark_messages_read(messages, current_uid) {
	const unread = messages.filter(
		(m) => m.receiver_uid === current_uid && m.read === false
	)
	if (!unread.length) {
		return
	}

	const batch = writeBatch(db)
	unread.forEach((m) => {
		batch.update(doc(db, 'messages', m.id), { read: true })
	})

	await batch.commit()
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export async function notify_new_message({
	receiver_uid,
	receiver_role,
	sender_name,
	text,
	request_uid,
}) {
	// FIX: Guarantee sender_name is never undefined
	const safe_sender_name = sender_name || 'Someone'

	const body = text.length > 80 ? text.slice(0, 80) + '…' : text

	await addDoc(collection(db, 'notifications'), {
		user_uid: receiver_uid,
		role: receiver_role,
		type: 'new_message',
		title: `New message from ${safe_sender_name}`,
		body,
		read: false,
		created_at: new Date().toUTCString(),
		request_uid,
		// FIX: Use the safe name variable here
		metadata: { sender_name: safe_sender_name },
	})
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Format a Firestore Timestamp (or JS Date) into a human-readable time.
 * Returns 'HH:MM' for today's messages, 'Mon DD HH:MM' for older ones.
 *
 * @param {import('firebase/firestore').Timestamp|Date|string|null} timestamp
 * @returns {string}
 */
export function format_message_time(timestamp) {
	if (!timestamp) {
		return ''
	}

	// Safely handles UTC Strings from the DB or fallback Firestore Timestamps
	const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
	const now = new Date()
	const is_today =
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear()

	const hhmm = date.toLocaleTimeString('en-ZA', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

	if (is_today) {
		return hhmm
	}

	const day_month = date.toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'short',
	})

	return `${day_month} ${hhmm}`
}
