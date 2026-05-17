import React, { useState, useEffect, useCallback } from 'react'
import './feedback_form.css'

export default function FeedbackForm({ onSubmit, onCancel }) {
	const [rating, setRating] = useState(0)
	const [hovered, setHovered] = useState(0)
	const [comment, setComment] = useState('')

	const handleSubmit = () => {
		if (!rating) {
			return
		}
		onSubmit?.({ rating, comment })
	}

	return (
		<div className="rd-feedback-form">
			<h3 className="rd-feedback-title">Leave a Review</h3>

			<div className="rd-feedback-stars">
				{[1, 2, 3, 4, 5].map((star) => (
					<button
						key={star}
						className={`rd-star ${star <= (hovered || rating) ? 'rd-star--active' : ''}`}
						onClick={() => setRating(star)}
						onMouseEnter={() => setHovered(star)}
						onMouseLeave={() => setHovered(0)}
						aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
					>
						★
					</button>
				))}
				{rating > 0 && (
					<span className="rd-star-label">
						{
							[
								'',
								'Poor',
								'Fair',
								'Good',
								'Very Good',
								'Excellent',
							][rating]
						}
					</span>
				)}
			</div>

			<textarea
				className="rd-feedback-textarea"
				placeholder="Share your experience with how this request was handled..."
				value={comment}
				onChange={(e) => setComment(e.target.value)}
				rows={4}
			/>

			<div className="rd-feedback-actions">
				<button
					className="rd-feedback-btn rd-feedback-btn--cancel"
					onClick={onCancel}
				>
					Cancel
				</button>
				<button
					className={`rd-feedback-btn rd-feedback-btn--submit ${!rating ? 'rd-feedback-btn--disabled' : ''}`}
					onClick={handleSubmit}
					disabled={!rating}
				>
					Submit Review
				</button>
			</div>
		</div>
	)
}
