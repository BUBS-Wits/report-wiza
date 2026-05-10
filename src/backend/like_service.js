// src/backend/like_service.js
import { db } from '../firebase_config.js'
import {
	doc,
	getDoc,
	setDoc,
	updateDoc,
	increment,
	deleteDoc,
} from 'firebase/firestore'

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
}

export const removeLike = async (requestId, userId) => {
	const likeRef = doc(db, 'service_requests', requestId, 'likes', userId)
	const requestRef = doc(db, 'service_requests', requestId)
	await deleteDoc(likeRef)
	await updateDoc(requestRef, { like_count: increment(-1) })
}
