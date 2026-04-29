/* global jest */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import MessageThread from '../components/message_thread/message_thread.js'
import {
	subscribe_to_thread,
	send_message,
	mark_messages_read,
	notify_new_message,
	format_message_time,
} from '../backend/message_thread_service.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../components/message_thread/message_thread.css', () => ({}))

jest.mock('../backend/message_thread_service.js', () => ({
	subscribe_to_thread: jest.fn(),
	send_message: jest.fn(),
	mark_messages_read: jest.fn(),
	notify_new_message: jest.fn(),
	format_message_time: jest.fn((ts) => '10:00 AM'),
}))

// Mock scrollIntoView since JSDOM doesn't support it natively
window.HTMLElement.prototype.scrollIntoView = jest.fn()

/* ─────────────────────────────────────────────────────────────────────────────
   Shared Fixtures
───────────────────────────────────────────────────────────────────────────── */

const defaultProps = {
	request_id: 'req_123',
	current_uid: 'user_1',
	current_name: 'John Doe',
	current_role: 'resident',
	other_uid: 'worker_1',
	other_name: 'Jane Plumber',
}

const mockMessages = [
	{
		id: 'msg_1',
		sender_uid: 'worker_1',
		text: 'On my way!',
		created_at: new Date(),
	},
	{
		id: 'msg_2',
		sender_uid: 'user_1',
		text: 'Thanks!',
		created_at: new Date(),
	},
]

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('MessageThread Component', () => {
	let mockUnsubscribe

	beforeEach(() => {
		jest.clearAllMocks()
		mockUnsubscribe = jest.fn()

		// Setup default listener behavior
		subscribe_to_thread.mockImplementation((req_id, callback) => {
			callback(mockMessages)
			return mockUnsubscribe
		})

		send_message.mockResolvedValue()
		mark_messages_read.mockResolvedValue()
		notify_new_message.mockResolvedValue()
	})

	test('renders loading state initially, then messages', async () => {
		render(<MessageThread {...defaultProps} />)

		// Assert messages eventually load
		await waitFor(() => {
			expect(screen.getByText('On my way!')).toBeInTheDocument()
			expect(screen.getByText('Thanks!')).toBeInTheDocument()
		})
	})

	test('marks messages as read upon loading', async () => {
		render(<MessageThread {...defaultProps} />)

		await waitFor(() => {
			expect(mark_messages_read).toHaveBeenCalledWith(
				expect.any(Array),
				'user_1'
			)
		})
	})

	test('allows sending a new message', async () => {
		render(<MessageThread {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByRole('textbox')).toBeInTheDocument()
		})

		const input = screen.getByRole('textbox')
		const sendBtn = screen.getByRole('button', { name: /Send message/i })

		fireEvent.change(input, { target: { value: 'Is it fixed?' } })
		fireEvent.click(sendBtn)

		await waitFor(() => {
			expect(send_message).toHaveBeenCalledWith(
				expect.objectContaining({
					request_id: 'req_123',
					sender_uid: 'user_1',
					text: 'Is it fixed?',
				})
			)

			// FIX: Match the object payload your component actually sends
			expect(notify_new_message).toHaveBeenCalledWith(
				expect.objectContaining({
					request_id: 'req_123',
					sender_name: 'John Doe',
					receiver_uid: 'worker_1',
					receiver_role: 'worker', // The component derives the receiver role correctly
					text: 'Is it fixed?',
				})
			)
		})

		// Input should clear after sending
		expect(input).toHaveValue('')
	})

	test('disables send button when input is empty', async () => {
		render(<MessageThread {...defaultProps} />)

		await waitFor(() => {
			expect(
				screen.getByRole('button', { name: /Send message/i })
			).toBeDisabled()
		})
	})

	test('unsubscribes from listener on unmount', async () => {
		const { unmount } = render(<MessageThread {...defaultProps} />)

		await waitFor(() => {
			expect(subscribe_to_thread).toHaveBeenCalled()
		})

		unmount()
		expect(mockUnsubscribe).toHaveBeenCalled()
	})
})
