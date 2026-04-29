import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    writeBatch,
    doc,
    serverTimestamp,
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
 * @param {string}   request_id   - The service request ID (= thread ID)
 * @param {function} on_messages  - Callback: (messages[]) => void
 * @param {function} on_error     - Callback: (Error) => void
 * @returns {function}            - Unsubscribe function — call on unmount
 */
export function subscribe_to_thread(request_id, on_messages, on_error) {
    const q = query(
        collection(db, 'messages'),
        where('request_id', '==', request_id),
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
 * @param {string} params.request_id
 * @param {string} params.sender_uid
 * @param {string} params.receiver_uid
 * @param {string} params.text
 * @returns {Promise<string>} - The new message document ID
 */
export async function send_message({
    request_id,
    sender_uid,
    receiver_uid,
    text,
}) {
    const trimmed = text.trim()
    if (!trimmed) {
        throw new Error('Message text cannot be empty.')
    }

    const ref = await addDoc(collection(db, 'messages'), {
        request_id,
        sender_uid,
        receiver_uid,
        text: trimmed,
        sent_at: serverTimestamp(),
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

/**
 * Write a `new_message` notification for the receiver.
 * Should be called immediately after a message is successfully sent.
 *
 * @param {object} params
 * @param {string} params.receiver_uid    - Who receives the notification
 * @param {string} params.receiver_role   - 'resident' | 'worker'
 * @param {string} params.sender_name     - Display name of the sender
 * @param {string} params.text            - Message body (will be truncated)
 * @param {string} params.request_id      - Links notification back to the request
 */
export async function notify_new_message({
    receiver_uid,
    receiver_role,
    sender_name,
    text,
    request_id,
}) {
    const body = text.length > 80 ? text.slice(0, 80) + '…' : text

    await addDoc(collection(db, 'notifications'), {
        user_uid: receiver_uid,
        role: receiver_role,
        type: 'new_message',
        title: `New message from ${sender_name}`,
        body,
        read: false,
        created_at: serverTimestamp(),
        request_uid: request_id,
        metadata: { sender_name },
    })
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Format a Firestore Timestamp (or JS Date) into a human-readable time.
 * Returns 'HH:MM' for today's messages, 'Mon DD HH:MM' for older ones.
 *
 * @param {import('firebase/firestore').Timestamp|Date|null} timestamp
 * @returns {string}
 */
export function format_message_time(timestamp) {
    if (!timestamp) {
        return ''
    }

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

    // FIX: 'day' is now strictly set to 'numeric'
    const day_month = date.toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'short',
    })

    return `${day_month} ${hhmm}`
}