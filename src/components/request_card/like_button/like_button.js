import React, { useState, useEffect } from 'react'
import { auth } from '../../../firebase_config.js'
import {
	hasUserLiked,
	addLike,
	removeLike,
} from '../../../backend/like_service.js'
import './like_button.css'
import MessageDisplay, {
	useMessages,
} from '../../message_modal/message_modal.js'

const LikeButton = ({
	requestId,
	initialLikeCount,
	onLikeChange = () => {},
}) => {
	const [likes, setLikes] = useState(initialLikeCount)
	const [userLiked, setUserLiked] = useState(false)
	const [loading, setLoading] = useState(false)
	const currentUser = auth.currentUser
	const { messages, addMessage, removeMessage, clearMessages } = useMessages()

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
		}
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
			// ← Refresh the dashboard so priority badges update immediately
			onLikeChange()
		} catch (error) {
			console.error('Error updating like:', error)
			addMessage({
				text: 'Something went wrong. Please try again.',
				type: 'error',
			})
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
