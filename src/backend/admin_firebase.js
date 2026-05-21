// src/backend/admin_firebase.js
// src/backend/admin_firebase.js
import { auth, db } from '../firebase_config.js'
import { sendSignInLinkToEmail } from 'firebase/auth'
import {
	doc,
	getDoc,
	setDoc,
	updateDoc,
	collection,
	query,
	where,
	getDocs,
	serverTimestamp,
	onSnapshot
} from 'firebase/firestore'

// Email link settings — tells Firebase where to redirect
// the worker after they click the link
const is_production = window.location.hostname !== 'localhost'

const action_code_settings = {
	url: is_production
		? 'https://report-wiza-heeba2h0cbgacjc6.italynorth-01.azurewebsites.net/worker-verify'
		: 'http://localhost:3000/worker-verify',
	handleCodeInApp: true,
}

// Sends a sign-in email link to the given email address
// and stores them in Firestore as a pending worker
export const register_worker_email = async (email) => {
	try {
		// Check if the email belongs to an existing user in Firestore
		const users_ref = collection(db, 'users')
		const q = query(users_ref, where('email', '==', email))
		const snapshot = await getDocs(q)

		if (snapshot.empty) {
			throw new Error(
				'This email address is not associated with a registered Report-Wiza account.'
			)
		}

		const user_data = snapshot.docs[0].data()

		if (user_data.role === 'worker') {
			throw new Error(
				'This user has already been assigned the worker role and does not require further registration.'
			)
		}

		if (user_data.role === 'admin') {
			throw new Error(
				'This account holds administrator privileges and cannot be assigned the worker role.'
			)
		}

		// All checks passed — send the email link
		await sendSignInLinkToEmail(auth, email, action_code_settings)

		// Store in Firestore as pending
		await setDoc(doc(db, 'pending_workers', email), {
			email: email,
			invited_at: serverTimestamp(),
			status: 'pending',
		})

		// Save email in localStorage for the verify page
		window.localStorage.setItem('worker_email_for_sign_in', email)

		return { success: true }
	} catch (error) {
		console.error('Error registering worker:', error)
		throw error
	}
}

// Updates the user's role to worker in Firestore
// Called after the worker successfully verifies their email link
export const confirm_worker_role = async (uid, email, personal_details) => {
	try {
		await updateDoc(doc(db, 'users', uid), {
			role: 'worker',
			email: email,
			...personal_details, // name, phone etc. filled in on verify page
			verified_at: serverTimestamp(),
		})

		// Remove from pending list
		await updateDoc(doc(db, 'pending_workers', email), {
			status: 'verified',
		})

		return { success: true }
	} catch (error) {
		console.error('Error confirming worker role:', error)
		throw new Error('Could not complete registration. Try again.')
	}
}

// Fetches all users with role 'worker' from Firestore
export const subscribe_to_workers = (on_update, on_error) => {
    const q = query(collection(db, 'users'), where('role', '==', 'worker'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const workers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        on_update(workers)
    }, (error) => {
        console.error('Error fetching workers:', error)
        if (on_error) on_error(new Error('Could not load workers. Try again later.'))
    })

    return unsubscribe;
}

// Revokes worker role by setting their role back to resident
export const revoke_worker_role = async (uid) => {
	try {
		await updateDoc(doc(db, 'users', uid), {
			role: 'resident',
		})
		return { success: true }
	} catch (error) {
		console.error('Error revoking worker role:', error)
		throw new Error('Could not revoke worker role. Try again.')
	}
}

// Fetches all feedback documents from the feedback collection
export const fetch_all_feedback = async () => {
	try {
		const snapshot = await getDocs(collection(db, 'feedback'))
		return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
	} catch (error) {
		console.error('Error fetching feedback:', error)
		throw new Error('Could not load feedback. Try again later.')
	}
}

// Fetches a single request document by its ID
// Used to get assigned_worker_uid and category for each feedback entry
export const fetch_request_by_id = async (request_id) => {
	try {
		const request_ref = doc(db, 'service_requests', request_id)
		const snapshot = await getDoc(request_ref)
		if (!snapshot.exists()) {
			return null
		}
		return { id: snapshot.id, ...snapshot.data() }
	} catch (error) {
		console.warn('Could not fetch request:', request_id, error)
		return null
	}
}
//user story 50
export const fetch_rated_requests = async () => {
	try {
		const snapshot = await getDocs(collection(db, 'service_requests'))
		return snapshot.docs
			.map((d) => ({ id: d.id, ...d.data() }))
			.filter((r) => r.rating !== undefined && r.rating !== null)
	} catch (error) {
		console.error('Error fetching rated requests:', error)
		throw new Error('Could not load satisfaction data. Try again later.')
	}
}

// Fetches all assignments documents
export const fetch_assignments = async () => {
	try {
		const snapshot = await getDocs(collection(db, 'assignments'))
		return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
	} catch (error) {
		console.error('Error fetching assignments:', error)
		throw new Error('Could not load assignments. Try again later.')
	}
}
