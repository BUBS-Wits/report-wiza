import React, { useState, useEffect } from 'react'
import { auth } from '../../../firebase_config.js'
import {
	hasUserLiked,
	addLike,
	removeLike,
} from '../../../backend/like_service.js'
import './like_button.css'

const LikeButton = ({ requestId, initialLikeCount }) => {
	const safeRequestId = String(requestId)

	console.log('LikeButton rendering with requestId:', safeRequestId) //to see issue with UI GLITCH

	const [likes, setLikes] = useState(initialLikeCount)
	const [userLiked, setUserLiked] = useState(false)
	const [loading, setLoading] = useState(false)
	const [currentUser, setCurrentUser] = useState(null)

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((user) =>
			setCurrentUser(user)
		)
		return () => unsubscribe()
	}, [])

	useEffect(() => {
		if (currentUser && safeRequestId) {
			const check = async () => {
				try {
					const liked = await hasUserLiked(
						safeRequestId,
						currentUser.uid
					)
					setUserLiked(liked)
				} catch (err) {
					console.error(err)
				}
			}
			check()
		}
	}, [currentUser, safeRequestId])

	const handleLike = async () => {
		if (!currentUser) {
			return
		}
		if (loading) {
			return
		}
		setLoading(true)
		try {
			const safeUid = String(currentUser.uid)
			if (userLiked) {
				await removeLike(safeRequestId, safeUid)
				setLikes((prev) => prev - 1)
				setUserLiked(false)
			} else {
				await addLike(safeRequestId, safeUid)
				setLikes((prev) => prev + 1)
				setUserLiked(true)
			}
		} catch (error) {
			console.error('Error updating like:', error)
			alert('Something went wrong. Please try again.')
		}
		setLoading(false)
	}

	if (!currentUser) {
		return (
			<button
				className="like_button like_button_disabled"
				disabled
				title="Login to like requests"
			>
				🤍 {likes}
			</button>
		)
	}

	return (
		<button className="like_button" onClick={handleLike} disabled={loading}>
			{userLiked ? '❤️' : '🤍'} {likes}
		</button>
	)
}

export default LikeButton
