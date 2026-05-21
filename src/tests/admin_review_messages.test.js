import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminMessagingReview from '../components/admin_review_messages/admin_review_messages.js'

import {
    subscribe_to_admin_threads,
    subscribe_to_thread_messages,
    subscribe_to_request_lock,          // ← add
} from '../backend/admin_messaging_service.js'

jest.mock('../firebase_config.js', () => ({
    auth: { currentUser: { uid: 'admin_123' } },
}))

jest.mock('../backend/admin_messaging_service.js', () => ({
    subscribe_to_admin_threads:    jest.fn(),
    subscribe_to_thread_messages:  jest.fn(),
    subscribe_to_request_lock:     jest.fn(),   // ← add
    admin_toggle_thread_messaging: jest.fn(),
    invalidate_request_cache:      jest.fn(),
}))

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
        messaging_enabled: true,
        worker:   { name: 'Alice Worker' },
        resident: { name: 'Bob Resident' },
        unread_count: 0,
        message_count: 5,
    },
    {
        id: 'req_2',
        request_id: 'REQ-02',
        status: 'resolved',
        category: 'potholes',
        messaging_enabled: true,
        worker:   { name: 'Charlie Worker' },
        resident: { name: 'Dave Resident' },
        unread_count: 1,
        message_count: 3,
    },
]

describe('AdminMessagingReview Main Page', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        subscribe_to_admin_threads.mockImplementation((on_update) => {
            on_update(mock_threads)
            return jest.fn()
        })

        subscribe_to_thread_messages.mockImplementation(() => jest.fn())

        // Simulate an immediate Firestore doc snapshot with messaging open.
        // Returns a no-op unsubscribe so the useEffect cleanup doesn't throw.
        subscribe_to_request_lock.mockImplementation((request_uid, on_update) => {
            on_update({
                messaging_enabled:     true,
                messaging_lock_reason: null,
                messaging_locked_by:   null,
            })
            return jest.fn()
        })
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
            expect(screen.queryByTestId('thread-item-req_2')).not.toBeInTheDocument()
        })
    })

    test('opens MessageViewer when a thread is selected', async () => {
        render(<AdminMessagingReview />)

        const thread_btn = await screen.findByTestId('thread-item-req_1')
        fireEvent.click(thread_btn)

        expect(screen.getByTestId('message-viewer')).toBeInTheDocument()
        expect(screen.queryByText('Select a conversation')).not.toBeInTheDocument()
    })

    test('subscribes to the lock state of the selected thread', async () => {
        render(<AdminMessagingReview />)

        fireEvent.click(await screen.findByTestId('thread-item-req_1'))

        await waitFor(() => {
            expect(subscribe_to_request_lock).toHaveBeenCalledWith(
                'req_1',
                expect.any(Function),
                expect.any(Function)
            )
        })
    })

    test('unsubscribes from lock listener when thread changes', async () => {
        const unsub_req1 = jest.fn()
        const unsub_req2 = jest.fn()

        subscribe_to_request_lock
            .mockImplementationOnce((id, on_update) => {
                on_update({ messaging_enabled: true, messaging_lock_reason: null, messaging_locked_by: null })
                return unsub_req1
            })
            .mockImplementationOnce((id, on_update) => {
                on_update({ messaging_enabled: true, messaging_lock_reason: null, messaging_locked_by: null })
                return unsub_req2
            })

        render(<AdminMessagingReview />)

        fireEvent.click(await screen.findByTestId('thread-item-req_1'))
        fireEvent.click(await screen.findByTestId('thread-item-req_2'))

        await waitFor(() => {
            // The req_1 lock listener should have been cleaned up when req_2 was selected
            expect(unsub_req1).toHaveBeenCalledTimes(1)
        })
    })
})