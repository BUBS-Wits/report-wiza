// src/backend/like_service.js
import { db } from '../firebase_config.js'
import {
	doc,
	getDoc,
	setDoc,
	updateDoc,
	increment,
	deleteDoc,
	collection,
	query,
	where,
	getCountFromServer,
} from 'firebase/firestore'

// ─────────────────────────────────────────────────────────────
// Helper: get total number of registered residents
// ─────────────────────────────────────────────────────────────
async function getTotalResidentCount() {
	const q = query(collection(db, 'users'), where('role', '==', 'resident'))
	const snapshot = await getCountFromServer(q)
	return snapshot.data().count
}

// ─────────────────────────────────────────────────────────────
// Compute priority based on like count and total residents
// Returns 'Low' for 0 likes or very low percentage
// ─────────────────────────────────────────────────────────────
export function computePriority(likeCount, totalResidents) {
	if (totalResidents <= 0) {
		return 'Low'
	} // avoid division by zero
	const percentage = (likeCount / totalResidents) * 100

	if (percentage >= 20) {
		return 'Critical'
	}
	if (percentage >= 10) {
		return 'High'
	}
	if (percentage >= 5) {
		return 'Medium'
	}
	if (percentage >= 1) {
		return 'Low'
	} // optional – could default to 'Low'
	return 'Low'
}
// ─────────────────────────────────────────────────────────────
// Update priority of a request based on its current like_count
// ─────────────────────────────────────────────────────────────
async function updatePriority(requestRef, totalResidents) {
	const snap = await getDoc(requestRef)
	const likeCount = snap.data().like_count || 0
	const newPriority = computePriority(likeCount, totalResidents)
	const currentPriority = snap.data().priority
	if (newPriority !== currentPriority) {
		await updateDoc(requestRef, { priority: newPriority })
	}
}

// ─────────────────────────────────────────────────────────────
// Exported functions
// ─────────────────────────────────────────────────────────────
export const hasUserLiked = async (requestId, userId) => {
	const likeRef = doc(db, 'service_requests', requestId, 'likes', userId)
	const likeSnap = await getDoc(likeRef)
	return likeSnap.exists()
}

export const addLike = async (requestId, userId) => {
	const likeRef = doc(db, 'service_requests', requestId, 'likes', userId)
	const requestRef = doc(db, 'service_requests', requestId)
	await setDoc(likeRef, { likedAt: new Date() })
	await updateDoc(requestRef, { like_count: increment(1) })

	const totalResidents = await getTotalResidentCount()
	await updatePriority(requestRef, totalResidents)
}

export const removeLike = async (requestId, userId) => {
	const likeRef = doc(db, 'service_requests', requestId, 'likes', userId)
	const requestRef = doc(db, 'service_requests', requestId)
	await deleteDoc(likeRef)
	await updateDoc(requestRef, { like_count: increment(-1) })

	const totalResidents = await getTotalResidentCount()
	await updatePriority(requestRef, totalResidents)
}
