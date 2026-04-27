import {
	collection,
	query,
	where,
	getDocs,
	onSnapshot,
	orderBy,
	doc,
	getDoc,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'

/**
 * Fetch all service requests submitted by the resident.
 * Returns them sorted by created_at descending (newest first).
 *
 * Each request object returned includes:
 *   id                   {string}
 *   category             {string}
 *   description          {string}
 *   status               {string}
 *   ward                 {string}
 *   created_at           {Timestamp}
 *   updated_at           {Timestamp}
 *   assigned_worker_uid  {string|null}
 *   worker_name          {string|null}  — resolved from users collection
 *
 * @param {string} resident_uid
 * @returns {Promise<Array>}
 */
export async function fetch_resident_requests(resident_uid) {
	const q = query(
		collection(db, 'service_requests'),
		where('user_uid', '==', resident_uid),
		orderBy('created_at', 'desc')
	)

	const snap = await getDocs(q)
	const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

	// Resolve worker names for assigned requests
	const worker_uid_set = new Set(
		requests.map((r) => r.assigned_worker_uid).filter(Boolean)
	)

	const worker_names = {}
	await Promise.all(
		[...worker_uid_set].map(async (uid) => {
			try {
				const user_doc = await getDoc(doc(db, 'users', uid))
				if (user_doc.exists()) {
					worker_names[uid] = user_doc.data().name ?? 'Worker'
				}
			} catch {
				worker_names[uid] = 'Worker'
			}
		})
	)

	return requests.map((r) => ({
		...r,
		worker_name: r.assigned_worker_uid
			? (worker_names[r.assigned_worker_uid] ?? 'Worker')
			: null,
	}))
}

/**
 * Fetch the resident's profile from the users collection.
 *
 * @param {string} resident_uid
 * @returns {Promise<{ uid: string, name: string, email: string }>}
 */
export async function fetch_resident_profile(resident_uid) {
	const snap = await getDoc(doc(db, 'users', resident_uid))
	if (!snap.exists()) throw new Error('Resident profile not found.')
	return { uid: resident_uid, ...snap.data() }
}

/**
 * Subscribe to the total unread message count for the resident across ALL
 * their request threads. Calls `on_count` with the number whenever it changes.
 *
 * @param {string}   resident_uid
 * @param {function} on_count   — (count: number) => void
 * @returns {function}          — unsubscribe
 */
export function subscribe_to_resident_unread_count(resident_uid, on_count) {
	const q = query(
		collection(db, 'messages'),
		where('receiver_uid', '==', resident_uid),
		where('read', '==', false)
	)

	return onSnapshot(
		q,
		(snap) => on_count(snap.size),
		(err) =>
			console.error(
				'[resident_dashboard_service] unread count error:',
				err
			)
	)
}
