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

const toStr = (id) => String(id)

export const hasUserLiked = async (requestId, userId) => {
	const likeRef = doc(
		db,
		'requests',
		toStr(requestId),
		'likes',
		toStr(userId)
	)
	const likeSnap = await getDoc(likeRef)
	return likeSnap.exists()
}

export const addLike = async (requestId, userId) => {
	const likeRef = doc(
		db,
		'requests',
		toStr(requestId),
		'likes',
		toStr(userId)
	)
	const requestRef = doc(db, 'requests', toStr(requestId))
	await setDoc(likeRef, { likedAt: new Date() })
	await updateDoc(requestRef, { like_count: increment(1) })
}

export const removeLike = async (requestId, userId) => {
	const likeRef = doc(
		db,
		'requests',
		toStr(requestId),
		'likes',
		toStr(userId)
	)
	const requestRef = doc(db, 'requests', toStr(requestId))
	await deleteDoc(likeRef)
	await updateDoc(requestRef, { like_count: increment(-1) })
}
