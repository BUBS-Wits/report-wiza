import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminMessagingReview from '../components/admin_review_messages/admin_review_messages.js'

// 👇 FIX: Added subscribe_to_thread_messages to the import!
import {
	subscribe_to_admin_threads,
	subscribe_to_thread_messages,
} from '../backend/admin_messaging_service.js'

// Mock Firebase config
jest.mock('../firebase_config.js', () => ({
	auth: { currentUser: { uid: 'admin_123' } },
}))

// Mock Backend Service
jest.mock('../backend/admin_messaging_service.js', () => ({
	subscribe_to_admin_threads: jest.fn(),
	subscribe_to_thread_messages: jest.fn(),
	admin_toggle_thread_messaging: jest.fn(),
	invalidate_request_cache: jest.fn(),
}))

// Mock Subcomponents
jest.mock('../components/thread_item/thread_item.js', () => {
	return function MockThreadItem(props) {
		return (
			<div
				data-testid={`thread-item-${props.thread.id}`}
				onClick={() => props.on_select(props.thread)}
			>
				{props.thread.worker.name}
			</div>
		)
	}
})

jest.mock('../components/message_viewer/message_viewer.js', () => {
	return function MockMessageViewer() {
		return <div data-testid="message-viewer" />
	}
})

const mock_threads = [
	{
		id: 'req_1',
		request_id: 'REQ-01',
		status: 'open',
		category: 'water',
		worker: { name: 'Alice Worker' },
		resident: { name: 'Bob Resident' },
		unread_count: 0,
		message_count: 5,
	},
	{
		id: 'req_2',
		request_id: 'REQ-02',
		status: 'resolved',
		category: 'potholes',
		worker: { name: 'Charlie Worker' },
		resident: { name: 'Dave Resident' },
		unread_count: 1,
		message_count: 3,
	},
]

describe('AdminMessagingReview Main Page', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		subscribe_to_admin_threads.mockImplementation((onUpdate) => {
			onUpdate(mock_threads)
			return jest.fn()
		})
		subscribe_to_thread_messages.mockImplementation(() => jest.fn())
	})

	test('renders page and displays thread list', async () => {
		render(<AdminMessagingReview />)

		await waitFor(() => {
			expect(screen.getByTestId('thread-item-req_1')).toBeInTheDocument()
			expect(screen.getByTestId('thread-item-req_2')).toBeInTheDocument()
		})

		expect(screen.getByText('Select a conversation')).toBeInTheDocument()
	})

	test('filters threads based on category dropdown', async () => {
		render(<AdminMessagingReview />)

		const category_select = screen.getByLabelText('Filter by category')
		fireEvent.change(category_select, { target: { value: 'water' } })

		await waitFor(() => {
			expect(screen.getByTestId('thread-item-req_1')).toBeInTheDocument()
			expect(
				screen.queryByTestId('thread-item-req_2')
			).not.toBeInTheDocument()
		})
	})

	test('opens MessageViewer when a thread is selected', async () => {
		render(<AdminMessagingReview />)

		const thread_btn = await screen.findByTestId('thread-item-req_1')
		fireEvent.click(thread_btn)

		expect(screen.getByTestId('message-viewer')).toBeInTheDocument()
		expect(
			screen.queryByText('Select a conversation')
		).not.toBeInTheDocument()
	})
})
