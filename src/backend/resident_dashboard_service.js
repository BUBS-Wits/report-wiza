//src/backend/resident_dashboard_service.js
import {
	doc,
	getDoc,
	updateDoc,
	collection,
	query,
	where,
	getDocs,
	orderBy,
	onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'

/**
 * Fetch all service requests submitted by the resident.
 * Returns them sorted by created_at descending (newest first).
 *
 * Each request object returned includes:
 * id                   {string}
 * category             {string}
 * description          {string}
 * status               {string}
 * sa_ward              {number}
 * sa_m_name            {string}
 * sa_province          {string}
 * image                {string}
 * location             {string}
 * created_at           {string}
 * updated_at           {string}
 * worker_uid           {string|null}  — resolved from assignments collection
 * worker_name          {string|null}  — resolved from users collection
 *
/**
 * LIVE LISTENER: Subscribe to all service requests submitted by the resident.
 * Fires the callback whenever a request is created, updated, or changes status.
 *
 * @param {string} resident_uid
 * @param {function} on_update - Callback function that receives the array of live requests
 * @returns {function} - Unsubscribe function to clean up the listener
 */
export function subscribe_to_resident_requests(resident_uid, on_update) {
	const q = query(
		collection(db, 'service_requests'),
		where('user_uid', '==', resident_uid),
		orderBy('created_at', 'desc')
	)

	// onSnapshot fires immediately on load, and then again on any changes
	const unsubscribe = onSnapshot(
		q,
		async (snap) => {
			const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

			if (requests.length === 0) {
				on_update([])
				return
			}

			// 1. Look up the `assignments` collection to find if these requests have a worker assigned
			const assignments_map = {} // maps request.id -> worker_uid
			const worker_uid_set = new Set()

			await Promise.all(
				requests.map(async (req) => {
					const assignment_q = query(
						collection(db, 'assignments'),
						where('request_uid', '==', req.id)
					)
					const assignment_snap = await getDocs(assignment_q)

					if (!assignment_snap.empty) {
						const worker_uid =
							assignment_snap.docs[0].data().worker_uid
						assignments_map[req.id] = worker_uid
						if (worker_uid) {
							worker_uid_set.add(worker_uid)
						}
					}
				})
			)

			// 2. Resolve the worker names from the `users` collection
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

			// 3. Stitch everything together
			const live_data = requests.map((r) => {
				const worker_uid = assignments_map[r.id] || null
				return {
					...r,
					worker_uid: worker_uid,
					worker_name: worker_uid
						? (worker_names[worker_uid] ?? 'Worker')
						: null,
				}
			})

			// 4. Push the fully stitched live data to the React component
			on_update(live_data)
		},
		(error) => {
			console.error(
				'[resident_dashboard_service] requests listener error:',
				error
			)
			on_update([]) // Fail gracefully by returning empty or handling error
		}
	)

	return unsubscribe
}

/**
 * Fetch the resident's profile from the users collection.
 *
 * @param {string} resident_uid
 * @returns {Promise<{ uid: string, name: string, email: string, role: string }>}
 */
export async function fetch_resident_profile(resident_uid) {
	const snap = await getDoc(doc(db, 'users', resident_uid))
	if (!snap.exists()) {
		throw new Error('Resident profile not found.')
	}
	return { uid: resident_uid, ...snap.data() }
}

/**
 * Subscribe to the total unread message count for the resident across ALL
 * their request threads. Calls `on_count` with the number whenever it changes.
 *
 * @param {string}   resident_uid
 * @param {function} on_count   — (count: number) => void
 * @returns {function}          — unsubscribe callback
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

export const cancel_request = async (requestId, userId) => {
	const requestRef = doc(db, 'service_requests', requestId)
	const requestSnap = await getDoc(requestRef)
	if (!requestSnap.exists()) {
		throw new Error('Request not found.')
	}
	const data = requestSnap.data()
	if (data.user_uid !== userId) {
		throw new Error('Unauthorized.')
	}
	if (data.worker_uid) {
		throw new Error('Cannot cancel an assigned request.')
	}
	const cancellableStatuses = ['SUBMITTED', 'PENDING'] // adjust as needed
	if (!cancellableStatuses.includes(data.status)) {
		throw new Error('Request cannot be cancelled at this stage.')
	}
	await updateDoc(requestRef, {
		status: 'CANCELLED',
		updated_at: new Date().toUTCString(),
	})
	return true
}
