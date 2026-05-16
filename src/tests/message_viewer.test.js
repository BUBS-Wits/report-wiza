import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import MessageViewer from '../components/message_viewer/message_viewer.js'

// Mock dependencies
jest.mock('../components/shared_ui/shared_ui.js', () => ({
	CategoryPill: () => <span data-testid="cat-pill" />,
	StatusChip: () => <span data-testid="status-chip" />,
}))
jest.mock('../utils/amr_untils.js', () => ({
	format_message_time: () => '12:00 PM',
	format_date_label: () => 'Today',
	same_day: () => true,
}))

const mock_thread = {
	id: 'req_123',
	request_id: 'REQ-001',
	messaging_enabled: true,
	worker: { uid: 'w1', name: 'John Worker' },
	resident: { uid: 'r1', name: 'Jane Resident' },
}

const mock_messages = [
	{ id: 'm1', text: 'Hello', sender_uid: 'r1', sent_at: new Date() },
	{ id: 'm2', text: 'Hi there', sender_uid: 'w1', sent_at: new Date() },
]

describe('MessageViewer Component', () => {
	window.HTMLElement.prototype.scrollIntoView = jest.fn()

	test('renders messages and participants', () => {
		render(
			<MessageViewer
				thread={mock_thread}
				messages={mock_messages}
				on_toggle_chat={jest.fn()}
			/>
		)

		// 👇 FIX: Use getAllByText because the name is printed twice in the UI!
		expect(screen.getAllByText('John Worker').length).toBeGreaterThan(0)
		expect(screen.getAllByText('Jane Resident').length).toBeGreaterThan(0)
		expect(screen.getByText('Hello')).toBeInTheDocument()
		expect(screen.getByText('Hi there')).toBeInTheDocument()
	})

	test('calls on_toggle_chat when Lock button is clicked', () => {
		const toggle_spy = jest.fn()
		render(
			<MessageViewer
				thread={mock_thread}
				messages={mock_messages}
				on_toggle_chat={toggle_spy}
			/>
		)

		const lock_btn = screen.getByRole('button', { name: 'Lock chat' })
		fireEvent.click(lock_btn)

		expect(toggle_spy).toHaveBeenCalledWith('req_123', true)
	})

	test('displays locked banner when thread is disabled', () => {
		const locked_thread = { ...mock_thread, messaging_enabled: false }
		render(
			<MessageViewer
				thread={locked_thread}
				messages={[]}
				on_toggle_chat={jest.fn()}
			/>
		)

		expect(screen.getByText(/Messaging is currently/i)).toBeInTheDocument()
		expect(screen.getByText(/disabled/i)).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'Unlock chat' })
		).toBeInTheDocument()
	})
})
