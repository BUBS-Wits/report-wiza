import {
	doc,
	updateDoc,
	collection,
	query,
	where,
	getDocs,
	addDoc,
	orderBy,
	serverTimestamp,
	Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase_config.js'

// ── US027 — Set request priority ──────────────────────────────────────────

export const set_request_priority = async (request_id, priority) => {
	try {
		await updateDoc(doc(db, 'service_requests', request_id), {
			priority,
			updated_at: serverTimestamp(),
		})
		return { success: true }
	} catch (error) {
		console.error('Error setting priority:', error)
		throw new Error('Could not update priority. Try again.')
	}
}

// ── US028 — Close request with mandatory comment ──────────────────────────

export const close_request = async (request_id, admin_uid, comment) => {
	if (!comment || comment.trim() === '') {
		throw new Error('A comment is required to close a request.')
	}
	try {
		await updateDoc(doc(db, 'service_requests', request_id), {
			status: 'closed',
			closed_by: admin_uid,
			closed_at: serverTimestamp(),
			updated_at: serverTimestamp(),
		})
		await addDoc(collection(db, 'service_requests', request_id, 'comments'), {
			text: comment.trim(),
			author_uid: admin_uid,
			type: 'close_reason',
			created_at: serverTimestamp(),
		})
		return { success: true }
	} catch (error) {
		console.error('Error closing request:', error)
		throw new Error('Could not close request. Try again.')
	}
}

// ── US029 — Manage categories ─────────────────────────────────────────────

export const fetch_categories = async () => {
	try {
		const snapshot = await getDocs(collection(db, 'categories'))
		return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
	} catch (error) {
		console.error('Error fetching categories:', error)
		throw new Error('Could not load categories. Try again.')
	}
}

export const add_category = async (name) => {
	try {
		const ref = await addDoc(collection(db, 'categories'), {
			name: name.trim(),
			active: true,
			created_at: serverTimestamp(),
		})
		return { success: true, id: ref.id }
	} catch (error) {
		console.error('Error adding category:', error)
		throw new Error('Could not add category. Try again.')
	}
}

export const remove_category = async (category_id) => {
	try {
		await updateDoc(doc(db, 'categories', category_id), {
			active: false,
		})
		return { success: true }
	} catch (error) {
		console.error('Error removing category:', error)
		throw new Error('Could not remove category. Try again.')
	}
}

// ── US030 — Assign stale requests ─────────────────────────────────────────

const STALE_DAYS = 3

export const fetch_stale_requests = async () => {
	try {
		const cutoff = Timestamp.fromMillis(
			Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000
		)
		const q = query(
			collection(db, 'service_requests'),
			where('status', '==', 'pending'),
			where('created_at', '<=', cutoff)
		)
		const snapshot = await getDocs(q)
		return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
	} catch (error) {
		console.error('Error fetching stale requests:', error)
		throw new Error('Could not load stale requests. Try again.')
	}
}

export const assign_stale_request = async (request_id, worker_uid) => {
	try {
		await updateDoc(doc(db, 'service_requests', request_id), {
			worker_uid,
			status: 'acknowledged',
			assigned_at: serverTimestamp(),
			updated_at: serverTimestamp(),
		})
		return { success: true }
	} catch (error) {
		console.error('Error assigning request:', error)
		throw new Error('Could not assign request. Try again.')
	}
}

// ── US039 — Block/unblock resident ────────────────────────────────────────

export const block_resident = async (resident_uid, is_blocked) => {
	try {
		await updateDoc(doc(db, 'users', resident_uid), {
			is_blocked,
		})
		return { success: true }
	} catch (error) {
		console.error('Error updating resident block status:', error)
		throw new Error('Could not update resident status. Try again.')
	}
}

export const fetch_residents = async () => {
	try {
		const q = query(collection(db, 'users'), where('role', '==', 'resident'))
		const snapshot = await getDocs(q)
		return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
	} catch (error) {
		console.error('Error fetching residents:', error)
		throw new Error('Could not load residents. Try again.')
	}
}

// ── US046 — Worker performance report ────────────────────────────────────

export const fetch_worker_performance = async () => {
	try {
		const workers_snap = await getDocs(
			query(collection(db, 'users'), where('role', '==', 'worker'))
		)
		const requests_snap = await getDocs(
			collection(db, 'service_requests')
		)

		const all_requests = requests_snap.docs.map((d) => ({
			id: d.id,
			...d.data(),
		}))

		return workers_snap.docs.map((w) => {
			const worker_requests = all_requests.filter(
				(r) => r.worker_uid === w.id
			)
			const resolved = worker_requests.filter((r) => r.status === 'resolved')

			const avg_days =
				resolved.length > 0
					? parseFloat(
						(
							resolved.reduce((sum, r) => {
								const created = r.created_at?.toMillis?.() ?? 0
								const updated = r.updated_at?.toMillis?.() ?? 0
								return sum + Math.max(0, updated - created)
							}, 0) /
							resolved.length /
							(1000 * 60 * 60 * 24)
						).toFixed(1)
					)
					: null

			return {
				uid: w.id,
				name: w.data().display_name ?? 'Unknown',
				total: worker_requests.length,
				resolved: resolved.length,
				pending: worker_requests.filter((r) => r.status === 'pending').length,
				avg_days,
			}
		})
	} catch (error) {
		console.error('Error fetching worker performance:', error)
		throw new Error('Could not load worker performance. Try again.')
	}
}