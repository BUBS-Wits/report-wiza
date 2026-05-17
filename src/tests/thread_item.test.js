import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ThreadItem from '../components/thread_item/thread_item.js'

// Mock dependencies
jest.mock('../components/shared_ui/shared_ui.js', () => ({
	CategoryPill: ({ category }) => (
		<span data-testid="cat-pill">{category}</span>
	),
}))
jest.mock('../utils/amr_untils.js', () => ({
	format_thread_time: () => '10m ago',
}))

const mock_thread = {
	id: 'req_123',
	request_id: 'REQ-001',
	category: 'Water',
	messaging_enabled: true,
	unread_count: 2,
	worker: { uid: 'w1', name: 'John Worker' },
	resident: { uid: 'r1', name: 'Jane Resident' },
	last_message: { text: 'I am on my way!', sender_uid: 'w1' },
}

describe('ThreadItem Component', () => {
	test('renders thread details correctly', () => {
		const mock_select = jest.fn()
		render(
			<ThreadItem
				thread={mock_thread}
				is_active={false}
				on_select={mock_select}
			/>
		)

		expect(screen.getByText(/John & Jane/i)).toBeInTheDocument()
		expect(screen.getByText('REQ-001')).toBeInTheDocument()
		expect(screen.getByText('10m ago')).toBeInTheDocument()
		expect(screen.getByText('I am on my way!')).toBeInTheDocument()
		expect(screen.getByText('2')).toBeInTheDocument() // Unread badge
	})

	test('calls on_select when clicked', () => {
		const mock_select = jest.fn()
		render(
			<ThreadItem
				thread={mock_thread}
				is_active={false}
				on_select={mock_select}
			/>
		)

		fireEvent.click(screen.getByRole('button'))
		expect(mock_select).toHaveBeenCalledWith(mock_thread)
	})

	test('shows locked icon when messaging is disabled', () => {
		const locked_thread = { ...mock_thread, messaging_enabled: false }
		render(
			<ThreadItem
				thread={locked_thread}
				is_active={false}
				on_select={jest.fn()}
			/>
		)

		expect(screen.getByTitle('Chat locked')).toBeInTheDocument()
	})
})
