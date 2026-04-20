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

// Check if the current user has already liked a specific request
export const hasUserLiked = async (requestId, userId) => {
	const likeRef = doc(db, 'requests', requestId, 'likes', userId)
	const likeSnap = await getDoc(likeRef)
	return likeSnap.exists()
}

// Add a like for the current user
export const addLike = async (requestId, userId) => {
	const likeRef = doc(db, 'requests', requestId, 'likes', userId)
	const requestRef = doc(db, 'requests', requestId)
	await setDoc(likeRef, { likedAt: new Date() })
	await updateDoc(requestRef, {
		like_count: increment(1),
	})
}

// Remove a like (unlike)
export const removeLike = async (requestId, userId) => {
	const likeRef = doc(db, 'requests', requestId, 'likes', userId)
	const requestRef = doc(db, 'requests', requestId)
	await deleteDoc(likeRef)
	await updateDoc(requestRef, {
		like_count: increment(-1),
	})
}
