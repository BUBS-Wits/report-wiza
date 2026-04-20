import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LikeButton from '../components/request_card/like_button/like_button'
import { auth } from '../firebase_config'
import { hasUserLiked, addLike, removeLike } from '../backend/like_service'

jest.mock('../firebase_config', () => ({
	auth: { currentUser: null },
}))
jest.mock('../backend/like_service')

describe('LikeButton', () => {
	const defaultProps = {
		requestId: 'req123',
		initialLikeCount: 5,
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('displays disabled button when user is not logged in', () => {
		auth.currentUser = null
		render(<LikeButton {...defaultProps} />)
		const button = screen.getByRole('button', { name: /🤍 5/i })
		expect(button).toBeDisabled()
		expect(button).toHaveAttribute('title', 'Login to like requests')
	})

	it('displays enabled button and initial like count when user is logged in', async () => {
		auth.currentUser = { uid: 'user456' }
		hasUserLiked.mockResolvedValue(false)
		render(<LikeButton {...defaultProps} />)
		expect(
			await screen.findByRole('button', { name: /🤍 5/i })
		).toBeEnabled()
	})

	it('shows liked state (❤️) if user already liked', async () => {
		auth.currentUser = { uid: 'user456' }
		hasUserLiked.mockResolvedValue(true)
		render(<LikeButton {...defaultProps} />)
		expect(
			await screen.findByRole('button', { name: /❤️ 5/i })
		).toBeInTheDocument()
	})

	it('calls addLike and increments count when clicking unliked button', async () => {
		auth.currentUser = { uid: 'user456' }
		hasUserLiked.mockResolvedValue(false)
		addLike.mockResolvedValue()

		render(<LikeButton {...defaultProps} />)
		const button = await screen.findByRole('button', { name: /🤍 5/i })
		fireEvent.click(button)

		await waitFor(() => {
			expect(addLike).toHaveBeenCalledWith('req123', 'user456')
			expect(
				screen.getByRole('button', { name: /❤️ 6/i })
			).toBeInTheDocument()
		})
	})

	it('calls removeLike and decrements count when clicking liked button', async () => {
		auth.currentUser = { uid: 'user456' }
		hasUserLiked.mockResolvedValue(true)
		removeLike.mockResolvedValue()

		render(<LikeButton {...defaultProps} />)
		const button = await screen.findByRole('button', { name: /❤️ 5/i })
		fireEvent.click(button)

		await waitFor(() => {
			expect(removeLike).toHaveBeenCalledWith('req123', 'user456')
			expect(
				screen.getByRole('button', { name: /🤍 4/i })
			).toBeInTheDocument()
		})
	})

	it('disables button while loading', async () => {
		auth.currentUser = { uid: 'user456' }
		hasUserLiked.mockResolvedValue(false)
		addLike.mockImplementation(() => new Promise(() => {})) // never resolves
		render(<LikeButton {...defaultProps} />)
		const button = await screen.findByRole('button')
		fireEvent.click(button)
		expect(button).toBeDisabled()
	})
})
