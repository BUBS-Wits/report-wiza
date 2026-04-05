// src/backend/admin_firebase.js
import { auth, db } from '../firebase_config.js'
import { sendSignInLinkToEmail } from 'firebase/auth'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

// Email link settings — tells Firebase where to redirect
// the worker after they click the link
const action_code_settings = {
	url: `${window.location.origin}/worker-verify`,
	handleCodeInApp: true,
}

// Sends a sign-in email link to the given email address
// and stores them in Firestore as a pending worker
export const register_worker_email = async (email) => {
	try {
		// Send the email link via Firebase
		await sendSignInLinkToEmail(auth, email, action_code_settings)

		// Store the email in Firestore as pending so we know
		// to give them the worker role when they verify
		await setDoc(doc(db, 'pending_workers', email), {
			email: email,
			invited_at: serverTimestamp(),
			status: 'pending',
		})

		// Save email in localStorage so we can retrieve it
		// on the verify page after the link is clicked
		window.localStorage.setItem('worker_email_for_sign_in', email)

		return { success: true }
	} catch (error) {
		console.error('Error registering worker:', error)
		throw new Error('Could not send registration email. Try again.')
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