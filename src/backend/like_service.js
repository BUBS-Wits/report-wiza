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
// Priority thresholds (absolute like counts)
// ─────────────────────────────────────────────────────────────
const PRIORITY_THRESHOLDS = {
	CRITICAL: 20,
	HIGH: 10,
	MEDIUM: 5,
}

async function getTotalResidentCount() {
	const q = query(collection(db, 'users'), where('role', '==', 'resident'))
	const snapshot = await getCountFromServer(q)
	return snapshot.data().count
}

export function computePriority(likeCount, totalResidents) {
	if (totalResidents <= 0) return 'Low' // guard against empty DB
	if (likeCount < 1) return 'Low'

	if (likeCount >= PRIORITY_THRESHOLDS.CRITICAL) return 'Critical'
	if (likeCount >= PRIORITY_THRESHOLDS.HIGH) return 'High'
	if (likeCount >= PRIORITY_THRESHOLDS.MEDIUM) return 'Medium'
	return 'Low'
}

async function updatePriority(requestRef, totalResidents) {
	const snap = await getDoc(requestRef)
	const likeCount = snap.data().like_count || 0
	const newPriority = computePriority(likeCount, totalResidents)
	const currentPriority = snap.data().priority
	if (newPriority !== currentPriority) {
		await updateDoc(requestRef, { priority: newPriority })
	}
}

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
