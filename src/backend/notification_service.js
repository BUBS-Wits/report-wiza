import { db } from '../firebase_config.js'
import {
	collection,
	doc,
	getDoc,
	writeBatch,
	serverTimestamp,
} from 'firebase/firestore'

/**
 * Creates notifications for both the resident and the assigned worker
 * when a request's status changes.
 *
 * @param {string} request_id - The ID of the updated service request.
 * @param {string} new_status - The new status string (e.g., 'assigned', 'in_progress').
 * @param {string} modifier_uid - (Optional) The UID of the user who made the change so they don't notify themselves.
 */
export const notify_status_change = async (
	request_id,
	new_status,
	modifier_uid = null
) => {
	try {
		// 1. Fetch the request to get the resident and worker UIDs
		const reqRef = doc(db, 'service_requests', request_id)
		const reqSnap = await getDoc(reqRef)

		if (!reqSnap.exists()) {
			console.warn(
				`Request ${request_id} not found. Skipping notifications.`
			)
			return
		}

		const request_data = reqSnap.data()
		const resident_uid = request_data.user_uid
		const worker_uid = request_data.assigned_worker_uid // Using your schema's exact field
		const category = request_data.category || 'Service'

		const batch = writeBatch(db)

		// 2. Notify the Resident (Skip if they triggered it)
		if (resident_uid && resident_uid !== modifier_uid) {
			const notifRef = doc(collection(db, 'notifications'))
			batch.set(notifRef, {
				user_uid: resident_uid,
				type: 'request_status_update',
				title: 'Request Status Updated',
				body: `Your ${category} request is now ${new_status}.`,
				request_uid: request_id,
				read: false,
				created_at: serverTimestamp(),
			})
		}

		// 3. Notify the Worker (Skip if they triggered it)
		if (worker_uid && worker_uid !== modifier_uid) {
			const notifRefWorker = doc(collection(db, 'notifications'))
			batch.set(notifRefWorker, {
				user_uid: worker_uid,
				type: 'request_status_update',
				title: 'Assigned Request Updated',
				body: `A ${category} request assigned to you is now ${new_status}.`,
				request_uid: request_id,
				read: false,
				created_at: serverTimestamp(),
			})
		}

		// 4. Commit both notifications to the database simultaneously
		await batch.commit()
	} catch (error) {
		console.error('Error creating status notifications:', error)
	}
}
