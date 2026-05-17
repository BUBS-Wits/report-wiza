import { db } from '../firebase_config.js'
import {
	collection,
	query,
	where,
	getDocs,
	getDoc,
	doc,
	updateDoc,
	writeBatch,
	serverTimestamp,
} from 'firebase/firestore'

/* ── Notification Helper ─────────────────────────────────────────────────── */

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
			return
		}

		const request_data = reqSnap.data()
		const resident_uid = request_data.user_uid
		const worker_uid = request_data.assigned_worker_uid // Uses your exact schema field
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

		await batch.commit()
	} catch (error) {
		console.error('Failed to send notifications:', error)
	}
}

/* ── Main Worker Service ─────────────────────────────────────────────────── */

export const fetch_unclaimed_requests = async (ward) => {
	try {
		const q = query(
			collection(db, 'service_requests'),
			where('sa_ward', '==', ward)
		)
		const snapshot = await getDocs(q)
		return (
			snapshot.docs
				.map((doc) => ({ id: doc.id, ...doc.data() }))
				.filter((r) => !r.assigned_worker_uid)
				// Ensure fallback uses correct term 'open', not 'submitted'
				.map((r) => ({ ...r, status: r.status || 'open' }))
		)
	} catch (error) {
		console.error('Error fetching unclaimed requests:', error)
		throw new Error('Could not load unclaimed requests. Try again later.')
	}
}

export const claim_request = async (request_id, worker_uid) => {
	try {
		const request_ref = doc(db, 'service_requests', request_id)
		await updateDoc(request_ref, {
			assigned_worker_uid: worker_uid,
			status: 'acknowledged', // Corrected from 'assigned'
			updated_at: new Date().toUTCString(),
		})

		// Trigger notification!
		// We pass 'acknowledged' as the status, and the worker_uid so the worker doesn't get spammed.
		notify_status_change(request_id, 'acknowledged', worker_uid)

		return { success: true }
	} catch (error) {
		console.error('Error claiming request:', error)
		throw new Error('Could not claim request. Try again.')
	}
}

export const update_request_status = async (
	request_id,
	new_status,
	modifier_uid = null
) => {
	try {
		const request_ref = doc(db, 'service_requests', request_id)
		await updateDoc(request_ref, {
			status: new_status,
			updated_at: new Date().toUTCString(),
		})

		// Notify interested parties about the status update
		notify_status_change(request_id, new_status, modifier_uid)

		return { success: true }
	} catch (error) {
		console.error('Error updating request status:', error)
		throw new Error('Could not update status. Try again.')
	}
}

// Add to bottom of src/backend/worker_firebase.js if needed by legacy tests
export const get_claimed_requests = async (worker_uid) => {
	try {
		const q = query(
			collection(db, 'service_requests'),
			where('assigned_worker_uid', '==', worker_uid)
		)
		const snapshot = await getDocs(q)
		return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
	} catch (error) {
		console.error('Error fetching claimed requests:', error)
		throw new Error('Could not load your requests. Try again later.')
	}
}
