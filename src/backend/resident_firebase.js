// src/backend/resident_firebase.js
import { db } from '../firebase_config.js'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'

export const fetchResidentRequests = async (userUid) => {
	try {
		const q = query(
			collection(db, 'service_requests'),
			where('user_uid', '==', userUid),
			orderBy('created_at', 'desc')
		)
		const snapshot = await getDocs(q)
		return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
	} catch (error) {
		console.error('Error fetching resident requests:', error)
		throw new Error('Could not load your requests. Try again later.')
	}
}
