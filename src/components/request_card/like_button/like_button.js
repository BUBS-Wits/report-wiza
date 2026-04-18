import React, { useState, useEffect } from 'react'
import { auth } from '../../../firebase_config.js'
import {
	hasUserLiked,
	addLike,
	removeLike,
} from '../../../backend/like_service.js'
import './like_button.css'

const LikeButton = ({ requestId, initialLikeCount }) => {
	const [likes, setLikes] = useState(initialLikeCount)
	const [userLiked, setUserLiked] = useState(false)
	const [loading, setLoading] = useState(false)
	const currentUser = auth.currentUser

	useEffect(() => {
		if (currentUser && requestId) {
			const checkLike = async () => {
				const liked = await hasUserLiked(requestId, currentUser.uid)
				setUserLiked(liked)
			}
			checkLike()
		}
	}, [currentUser, requestId])

	const handleLike = async () => {
		if (!currentUser) {
			return
		} // safety, button is disabled for non-logged-in
		if (loading) {
			return
		}
		setLoading(true)
		try {
			if (userLiked) {
				await removeLike(requestId, currentUser.uid)
				setLikes((prev) => prev - 1)
				setUserLiked(false)
			} else {
				await addLike(requestId, currentUser.uid)
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
