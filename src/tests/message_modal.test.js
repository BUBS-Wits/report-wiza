import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// Note the updated import path to match the src/tests/ folder structure
import MessageDisplay, {
	useMessages,
} from '../components/message_modal/message_modal.js'

/* ── Setup ───────────────────────────────────────────────────────────────── */

// Mock requestAnimationFrame for JSDOM environment
beforeAll(() => {
	jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
		cb()
		return 1
	})
	jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
})

afterAll(() => {
	window.requestAnimationFrame.mockRestore()
	window.cancelAnimationFrame.mockRestore()
})

/* ── Test Suite: MessageDisplay Component ────────────────────────────────── */

describe('MessageDisplay Component', () => {
	const mockOnDismiss = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
		jest.useFakeTimers()
	})

	afterEach(() => {
		jest.runOnlyPendingTimers()
		jest.useRealTimers()
	})

	test('returns null when there are no messages', () => {
		const { container } = render(<MessageDisplay messages={[]} />)
		expect(container.firstChild).toBeNull()
	})

	test('renders multiple messages with correct types and icons', () => {
		const messages = [
			{ id: 1, text: 'Info message', type: 'info' },
			{ id: 2, text: 'Success message', type: 'success' },
			{ id: 3, text: 'Custom icon', type: 'warning', icon: '🔥' },
		]

		render(<MessageDisplay messages={messages} onDismiss={mockOnDismiss} />)

		// Check text
		expect(screen.getByText('Info message')).toBeInTheDocument()
		expect(screen.getByText('Success message')).toBeInTheDocument()
		expect(screen.getByText('Custom icon')).toBeInTheDocument()

		// Check classes
		expect(
			screen.getByText('Info message').closest('.md-message')
		).toHaveClass('md-message--info')
		expect(
			screen.getByText('Success message').closest('.md-message')
		).toHaveClass('md-message--success')

		// Check custom icon
		expect(screen.getByText('🔥')).toBeInTheDocument()
	})

	test('calls onDismiss when close button is clicked', () => {
		const messages = [{ id: 'msg-1', text: 'Closable message' }]

		render(<MessageDisplay messages={messages} onDismiss={mockOnDismiss} />)

		const closeBtn = screen.getByRole('button', { name: 'Dismiss message' })
		fireEvent.click(closeBtn)

		// The component waits 350ms for the exit animation before calling onDismiss
		expect(mockOnDismiss).not.toHaveBeenCalled()

		act(() => {
			jest.advanceTimersByTime(350)
		})

		expect(mockOnDismiss).toHaveBeenCalledWith('msg-1')
	})

	test('auto-dismisses after duration', () => {
		const messages = [
			{ id: 'msg-timer', text: 'Timeout msg', duration: 2000 },
		]

		render(<MessageDisplay messages={messages} onDismiss={mockOnDismiss} />)

		// Advance past the auto-dismiss duration (2000ms) + animation (350ms)
		act(() => {
			jest.advanceTimersByTime(2350)
		})

		expect(mockOnDismiss).toHaveBeenCalledWith('msg-timer')
	})

	test('does not auto-dismiss if duration is 0', () => {
		const messages = [{ id: 'msg-perm', text: 'Permanent', duration: 0 }]

		render(<MessageDisplay messages={messages} onDismiss={mockOnDismiss} />)

		// Advance a very long time
		act(() => {
			jest.advanceTimersByTime(10000)
		})

		expect(mockOnDismiss).not.toHaveBeenCalled()
	})
})

/* ── Test Suite: useMessages Hook ────────────────────────────────────────── */

// Create a dummy component to safely test the hook without needing extra libraries
function HookWrapper() {
	const { messages, addMessage, removeMessage, clearMessages } = useMessages()

	return (
		<div>
			<div data-testid="msg-count">{messages.length}</div>
			{messages.map((m) => (
				<div key={m.id} data-testid={`msg-${m.id}`}>
					{m.text}
				</div>
			))}

			<button
				data-testid="btn-add"
				onClick={() =>
					addMessage({ id: 'test-1', text: 'Hook message' })
				}
			>
				Add
			</button>
			<button
				data-testid="btn-add-auto-id"
				onClick={() => addMessage({ text: 'Auto ID message' })}
			>
				Add Auto ID
			</button>
			<button
				data-testid="btn-remove"
				onClick={() => removeMessage('test-1')}
			>
				Remove
			</button>
			<button data-testid="btn-clear" onClick={clearMessages}>
				Clear
			</button>
		</div>
	)
}

describe('useMessages Hook', () => {
	test('initializes with empty messages', () => {
		render(<HookWrapper />)
		expect(screen.getByTestId('msg-count')).toHaveTextContent('0')
	})

	test('addMessage appends a message', () => {
		render(<HookWrapper />)

		fireEvent.click(screen.getByTestId('btn-add'))

		expect(screen.getByTestId('msg-count')).toHaveTextContent('1')
		expect(screen.getByTestId('msg-test-1')).toHaveTextContent(
			'Hook message'
		)
	})

	test('addMessage generates unique IDs if omitted', () => {
		render(<HookWrapper />)

		fireEvent.click(screen.getByTestId('btn-add-auto-id'))
		fireEvent.click(screen.getByTestId('btn-add-auto-id'))

		expect(screen.getByTestId('msg-count')).toHaveTextContent('2')
		// We know it renders successfully without key collisions
		expect(screen.getAllByText('Auto ID message').length).toBe(2)
	})

	test('removeMessage removes specific message by ID', () => {
		render(<HookWrapper />)

		// Add two messages
		fireEvent.click(screen.getByTestId('btn-add')) // ID: test-1
		fireEvent.click(screen.getByTestId('btn-add-auto-id')) // Auto ID

		expect(screen.getByTestId('msg-count')).toHaveTextContent('2')

		// Remove test-1
		fireEvent.click(screen.getByTestId('btn-remove'))

		expect(screen.getByTestId('msg-count')).toHaveTextContent('1')
		expect(screen.queryByTestId('msg-test-1')).not.toBeInTheDocument()
	})

	test('clearMessages empties the array', () => {
		render(<HookWrapper />)

		// Add two messages
		fireEvent.click(screen.getByTestId('btn-add'))
		fireEvent.click(screen.getByTestId('btn-add-auto-id'))

		// Clear all
		fireEvent.click(screen.getByTestId('btn-clear'))

		expect(screen.getByTestId('msg-count')).toHaveTextContent('0')
	})
})
