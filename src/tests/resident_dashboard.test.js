import React from 'react'
import {
    render,
    screen,
    waitFor,
    fireEvent,
    act,
} from '@testing-library/react'
import '@testing-library/jest-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
    fetch_resident_profile,
    subscribe_to_resident_requests,
    subscribe_to_resident_unread_count,
} from '../backend/resident_dashboard_service.js'
import { subscribe_to_request_lock } from '../backend/admin_messaging_service.js'

// ---------------------------------------------------------------------------
// Global Mocks
// ---------------------------------------------------------------------------
window.confirm = jest.fn(() => true)
window.alert = jest.fn()
global.fetch = jest.fn()

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------

jest.mock('react-router-dom', () => ({
    Link: ({ children, to, className }) => (
        <a href={to} className={className}>
            {children}
        </a>
    ),
    useLocation: jest.fn(() => ({ pathname: '/resident-dashboard' })),
    useNavigate: jest.fn(),
}))

jest.mock('firebase/auth', () => ({
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn(() => Promise.resolve()),
}))

jest.mock('../firebase_config.js', () => ({
    auth: {
        currentUser: {
            uid: 'user-1',
            getIdToken: jest.fn(() => Promise.resolve('mock-token')),
        },
    },
    db: {},
}))

jest.mock('firebase/firestore', () => ({
    getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
}))

jest.mock('../backend/resident_dashboard_service.js', () => ({
    fetch_resident_profile: jest.fn(),
    subscribe_to_resident_requests: jest.fn(),
    subscribe_to_resident_unread_count: jest.fn(() => jest.fn()),
}))

jest.mock('../backend/admin_messaging_service.js', () => ({
    subscribe_to_request_lock: jest.fn(() => jest.fn()),
}))

jest.mock('../constants.js', () => ({
    STATUS: {
        SUBMITTED: 'submitted',
        ASSIGNED: 'assigned',
        IN_PROGRESS: 'in_progress',
        RESOLVED: 'resolved',
        CLOSED: 'closed',
    },
    STATUS_DISPLAY: {
        submitted: 'Submitted',
        assigned: 'Assigned',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        closed: 'Closed',
    },
}))

// 1. Define the mock functions outside the mock block so they can be asserted on if needed
const mockAddMessage = jest.fn()
const mockRemoveMessage = jest.fn()
const mockClearMessages = jest.fn()

// 2. Define the exact object the hook should return
const mockMessagesState = {
    messages: [],
    addMessage: mockAddMessage,
    removeMessage: mockRemoveMessage,
    clearMessages: mockClearMessages,
}

// 3. Mock the module returning the static object
jest.mock('../components/message_modal/message_modal.js', () => {
    return {
        __esModule: true,
        default: function MockMessageDisplay() {
            return <div data-testid="mock-message-display" />
        },
        useMessages: () => mockMessagesState,
    }
})

jest.mock('../components/request_card/like_button/like_button.js', () => {
    return function MockLikeButton() {
        return <div data-testid="mock-like-button" />
    }
})

jest.mock('../components/feedback_form/feedback_form.js', () => {
    return function MockFeedbackForm({ onCancel, onSubmit }) {
        return (
            <div data-testid="mock-feedback-form">
                <button
                    data-testid="cancel-feedback-btn"
                    onClick={onCancel}
                >
                    Cancel Feedback
                </button>
                <button
                    data-testid="submit-feedback-btn"
                    onClick={() =>
                        onSubmit({ rating: 4, comment: 'Great service' })
                    }
                >
                    Submit Feedback
                </button>
            </div>
        )
    }
})
jest.mock('../components/message_thread/message_thread.js', () => {
    return function MockMessageThread({ requestId }) {
        return (
            <div
                data-testid="mock-message-thread"
                data-request-id={requestId}
            />
        )
    }
})
jest.mock('../components/notification_bell/notification_bell.js', () => {
    return function MockNotificationBell({ userUid, role }) {
        return (
            <div
                data-testid="mock-notification-bell"
                data-uid={userUid}
                data-role={role}
            />
        )
    }
})

jest.mock('../pages/resident_dashboard/resident_dashboard.css', () => ({}))

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = { uid: 'user-1' }

const MOCK_PROFILE = {
    uid: 'user-1',
    name: 'Thabo Nkosi',
}

const make_request = (overrides = {}) => ({
    id: 'req-1',
    category: 'Water',
    description: 'Burst pipe on main road',
    status: 'submitted',
    sa_ward: 'Ward 5',
    created_at: null,
    updated_at: null,
    worker_uid: null,
    worker_name: null,
    like_count: 0,
    messaging_enabled: true,
    ...overrides,
})

// ---------------------------------------------------------------------------
// Shared setup helpers
// ---------------------------------------------------------------------------

/**
 * Simulate a successful auth + data load.
 * Returns the captured request-listener callback so tests can push live updates.
 */
const simulate_successful_load = async (requests = [make_request()]) => {
    let captured_req_callback = null

    fetch_resident_profile.mockResolvedValue(MOCK_PROFILE)
    subscribe_to_resident_requests.mockImplementation((uid, cb) => {
        captured_req_callback = cb
        // fire immediately so the component exits its loading state
        act(() => cb(requests))
        return jest.fn()
    })

    // Trigger the auth observer with a logged-in user
    act(() => {
        const [[, auth_cb]] = onAuthStateChanged.mock.calls
        auth_cb(MOCK_USER)
    })

    // Wait for the dashboard content to appear (FIXED: Using getAllByText since it appears in nav AND sidebar)
	await waitFor(() =>
        expect(screen.getAllByText('My Requests')[0]).toBeInTheDocument()
    )

    return { push_requests: (reqs) => act(() => captured_req_callback(reqs)) }
}

// ---------------------------------------------------------------------------
// Import the component under test AFTER all mocks are declared
// ---------------------------------------------------------------------------
import ResidentDashboard from '../pages/resident_dashboard/resident_dashboard.js'

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('ResidentDashboard', () => {
    const mock_navigate = jest.fn()
    beforeEach(() => {
        jest.clearAllMocks()
		window.confirm.mockReturnValue(true)  
        mockAddMessage.mockClear()
        mockRemoveMessage.mockClear()
        mockClearMessages.mockClear()
        
        useNavigate.mockReturnValue(mock_navigate)
        // Add this line to ensure location is never undefined:
        useLocation.mockReturnValue({ pathname: '/resident-dashboard' })
        
        onAuthStateChanged.mockImplementation((auth_instance, cb) => {
            onAuthStateChanged._captured_cb = cb
            return jest.fn()
        })
    })

    // -------------------------------------------------------------------------
    // 1. Initial Mount / Loading State
    // -------------------------------------------------------------------------
    describe('Given the ResidentDashboard is mounted', () => {
        describe('When the component is first rendered before auth resolves', () => {
            it('Then it should display the loading spinner', () => {
                render(<ResidentDashboard />)
                expect(
                    screen.getByText('Loading your dashboard…')
                ).toBeInTheDocument()
            })
        })
    })

    // -------------------------------------------------------------------------
    // 2. Auth State — Unauthenticated
    // -------------------------------------------------------------------------
    describe('Given the user is not authenticated', () => {
        describe('When onAuthStateChanged fires with a null user', () => {
            it('Then it should display a "not logged in" error', async () => {
                render(<ResidentDashboard />)

                act(() => {
                    onAuthStateChanged._captured_cb(null)
                })

                await waitFor(() => {
                    expect(
                        screen.getByText('You are not logged in.')
                    ).toBeInTheDocument()
                })
            })

            it('Then it should render a retry button that navigates to /login', async () => {
                render(<ResidentDashboard />)

                act(() => {
                    onAuthStateChanged._captured_cb(null)
                })

                await waitFor(() =>
                    expect(
                        screen.getByText('Try again')
                    ).toBeInTheDocument()
                )

                fireEvent.click(screen.getByText('Try again'))
                expect(mock_navigate).toHaveBeenCalledWith('/login')
            })
        })
    })

    // -------------------------------------------------------------------------
    // 3. Auth State — Profile Fetch Failure
    // -------------------------------------------------------------------------
    describe('Given the user is authenticated but the profile fetch fails', () => {
        describe('When fetch_resident_profile rejects', () => {
            it('Then it should display the error message returned by the service', async () => {
                fetch_resident_profile.mockRejectedValueOnce(
                    new Error('Network error fetching profile')
                )
                subscribe_to_resident_requests.mockReturnValue(jest.fn())

                render(<ResidentDashboard />)

                act(() => {
                    onAuthStateChanged._captured_cb(MOCK_USER)
                })

                await waitFor(() => {
                    expect(
                        screen.getByText('Network error fetching profile')
                    ).toBeInTheDocument()
                })
            })
        })
    })

    // -------------------------------------------------------------------------
    // 4. Successful Load — Resident Profile & Requests
    // -------------------------------------------------------------------------
    describe('Given the ResidentDashboard loads successfully', () => {
        describe('When auth resolves and data arrives from Firestore', () => {
            it('Then it should render the topbar with the resident name', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load()
                expect(screen.getByText('Thabo Nkosi')).toBeInTheDocument()
            })

            it('Then it should display the notification bell', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load()
                expect(
                    screen.getByTestId('mock-notification-bell')
                ).toBeInTheDocument()
            })

            it('Then it should call subscribe_to_resident_requests with the user uid', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load()
                expect(subscribe_to_resident_requests).toHaveBeenCalledWith(
                    'user-1',
                    expect.any(Function)
                )
            })

            it('Then it should render the request count badge in the sidebar heading', async () => {
                const requests = [make_request(), make_request({ id: 'req-2' })]
                render(<ResidentDashboard />)
                await simulate_successful_load(requests)
                // The sidebar heading shows the count
                expect(screen.getByText('2')).toBeInTheDocument()
            })
        })

        describe('When the resident has no requests', () => {
            it('Then it should show the empty-state prompt to submit a request', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load([])
                expect(
                    screen.getByText(
                        'You have not submitted any service requests yet.'
                    )
                ).toBeInTheDocument()
            })
        })
    })

    // -------------------------------------------------------------------------
    // 5. Request Card Rendering
    // -------------------------------------------------------------------------
    describe('Given the dashboard has loaded with requests', () => {
        describe('When requests are displayed in the sidebar', () => {
            it('Then each request card should show its category, ward, and status', async () => {
                const req = make_request({
                    category: 'Electricity',
                    sa_ward: 'Ward 12',
                    status: 'assigned',
                })
                render(<ResidentDashboard />)
                await simulate_successful_load([req])

				expect(screen.getAllByText('Electricity')[0]).toBeInTheDocument()
				expect(screen.getAllByText('Ward 12')[0]).toBeInTheDocument()
				expect(screen.getAllByText('Assigned')[0]).toBeInTheDocument()
            })

            it('Then the first request should be auto-selected on load', async () => {
                const req = make_request({ category: 'Roads', sa_ward: 'Ward 3' })
                render(<ResidentDashboard />)
                await simulate_successful_load([req])

                // The detail panel title confirms the request is selected
                expect(
                    screen.getAllByText('Roads').length
                ).toBeGreaterThanOrEqual(1)
            })
        })

        describe('When the user clicks a different request card', () => {
            it('Then the detail panel should update to show the selected request', async () => {
                const req_a = make_request({ id: 'req-a', category: 'Water' })
                const req_b = make_request({ id: 'req-b', category: 'Sanitation' })
                render(<ResidentDashboard />)
                await simulate_successful_load([req_a, req_b])

                // req_a is auto-selected; click req_b card
                fireEvent.click(
                    screen.getAllByText('Sanitation')[0]
                )

                await waitFor(() => {
                    // Detail panel should now show req_b's category as the heading
                    const headings = screen.getAllByText('Sanitation')
                    expect(headings.length).toBeGreaterThanOrEqual(1)
                })
            })
        })
    })

    // -------------------------------------------------------------------------
    // 6. Live Listener Updates
    // -------------------------------------------------------------------------
    describe('Given the dashboard is live-subscribed to Firestore', () => {
        describe('When the Firestore listener pushes new requests', () => {
            it('Then the sidebar should update the request count reactively', async () => {
                render(<ResidentDashboard />)
                const { push_requests } = await simulate_successful_load([
                    make_request(),
                ])

                // Initially 1 request
                expect(screen.getByText('1')).toBeInTheDocument()

                // Firestore pushes a second request
                push_requests([
                    make_request(),
                    make_request({ id: 'req-2', category: 'Roads' }),
                ])

                await waitFor(() => {
                    expect(screen.getByText('2')).toBeInTheDocument()
                })
            })
        })
    })

    // -------------------------------------------------------------------------
    // 7. Unread Count Badge
    // -------------------------------------------------------------------------
    describe('Given the resident has unread messages', () => {
        describe('When subscribe_to_resident_unread_count pushes a non-zero count', () => {
            it('Then the nav badge should display the unread count', async () => {
                subscribe_to_resident_unread_count.mockImplementation(
                    (uid, cb) => {
                        cb(3)
                        return jest.fn()
                    }
                )

                render(<ResidentDashboard />)
                await simulate_successful_load()

                await waitFor(() => {
                    expect(screen.getByText('3')).toBeInTheDocument()
                })
            })
        })
    })

    // -------------------------------------------------------------------------
    // 8. Cancel Request Logic
    // -------------------------------------------------------------------------
    describe('Given a request that is unassigned and not resolved or closed', () => {
        describe('When the resident clicks Cancel Request and confirms', () => {
            it('Then it should call the cancel API and show a success alert', async () => {
                global.fetch.mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn(() => Promise.resolve({})),
                })

                render(<ResidentDashboard />)
                await simulate_successful_load([
                    make_request({ worker_uid: null, status: 'submitted' }),
                ])

                const cancel_btn = screen.getByText('Cancel Request')
                fireEvent.click(cancel_btn)

                await waitFor(() => {
                    expect(global.fetch).toHaveBeenCalledWith(
                        '/api/cancel-request',
                        expect.objectContaining({ method: 'POST' })
                    )
                })
                expect(window.alert).toHaveBeenCalledWith(
                    'Request cancelled successfully.'
                )
            })

            it('Then it should show a confirmation dialog before proceeding', async () => {
                global.fetch.mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn(() => Promise.resolve({})),
                })

                render(<ResidentDashboard />)
                await simulate_successful_load()

                fireEvent.click(screen.getByText('Cancel Request'))

                expect(window.confirm).toHaveBeenCalledWith(
                    'Are you sure you want to cancel this request? This action cannot be undone.'
                )
            })

            it('Then it should NOT call the API if the user dismisses the dialog', async () => {
                window.confirm.mockReturnValueOnce(false)

                render(<ResidentDashboard />)
                await simulate_successful_load()

                fireEvent.click(screen.getByText('Cancel Request'))

                expect(global.fetch).not.toHaveBeenCalled()
            })
        })

        describe('When the cancel API call fails', () => {
            it('Then it should display the server error message via alert', async () => {
                global.fetch.mockResolvedValueOnce({
                    ok: false,
                    json: jest.fn(() =>
                        Promise.resolve({ error: 'Request already assigned' })
                    ),
                })

                render(<ResidentDashboard />)
                await simulate_successful_load()

                fireEvent.click(screen.getByText('Cancel Request'))

				await waitFor(() => {
    				expect(window.alert).toHaveBeenCalledWith('Request already assigned')
				})
            })
        })
    })

    describe('Given a request that is already assigned to a worker', () => {
        describe('When the detail panel renders', () => {
            it('Then the Cancel Request button should not be visible', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load([
                    make_request({ worker_uid: 'worker-99', status: 'assigned' }),
                ])

                expect(
                    screen.queryByText('Cancel Request')
                ).not.toBeInTheDocument()
            })
        })
    })

    describe('Given a request that is resolved', () => {
        describe('When the detail panel renders', () => {
            it('Then the Cancel Request button should not be visible', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load([
                    make_request({ worker_uid: null, status: 'resolved' }),
                ])

                expect(
                    screen.queryByText('Cancel Request')
                ).not.toBeInTheDocument()
            })

            it('Then a Review button should be visible', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load([
                    make_request({ worker_uid: null, status: 'resolved' }),
                ])

                expect(screen.getByText('Review')).toBeInTheDocument()
            })
        })
    })

    // -------------------------------------------------------------------------
    // 9. Feedback Form Toggle
    // -------------------------------------------------------------------------
    describe('Given a resolved request is selected', () => {
        describe('When the resident clicks Review', () => {
            it('Then the FeedbackForm should be shown', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load([
                    make_request({ status: 'resolved' }),
                ])

                fireEvent.click(screen.getByText('Review'))

                await waitFor(() => {
                    expect(
                        screen.getByTestId('mock-feedback-form')
                    ).toBeInTheDocument()
                })
            })

            it('Then clicking Cancel Feedback should hide the form', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load([
                    make_request({ status: 'resolved' }),
                ])

                fireEvent.click(screen.getByText('Review'))
                await screen.findByTestId('mock-feedback-form')

                fireEvent.click(screen.getByTestId('cancel-feedback-btn'))

                await waitFor(() => {
                    expect(
                        screen.queryByTestId('mock-feedback-form')
                    ).not.toBeInTheDocument()
                })
            })
        })
    })

    // -------------------------------------------------------------------------
    // 10. Messaging Panel
    // -------------------------------------------------------------------------
    describe('Given a request with an assigned worker', () => {
        describe('When the detail panel renders', () => {
            it('Then the MessageThread component should be displayed', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load([
                    make_request({
                        worker_uid: 'worker-1',
                        worker_name: 'Sipho Dlamini',
                        status: 'in_progress',
                    }),
                ])

                // Based on previous iterations, it renders the thread wrapper
                expect(
                    screen.getByText('Messages')
                ).toBeInTheDocument()
            })

            it('Then subscribe_to_request_lock should be called with the request id', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load([
                    make_request({ id: 'req-lock-test', worker_uid: 'worker-1' }),
                ])

                await waitFor(() => {
                    expect(subscribe_to_request_lock).toHaveBeenCalledWith(
                        'req-lock-test',
                        expect.any(Function),
                        expect.any(Function)
                    )
                })
            })
        })
    })

    describe('Given a request with no assigned worker', () => {
        describe('When the detail panel renders', () => {
            it('Then a "messaging unavailable" notice should be shown instead of MessageThread', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load([
                    make_request({ worker_uid: null }),
                ])

                expect(
                    screen.getByText(
                        'Messaging will be available once a worker is assigned to this request.'
                    )
                ).toBeInTheDocument()
            })
        })
    })

    // -------------------------------------------------------------------------
    // 11. Logout
    // -------------------------------------------------------------------------
    describe('Given the resident is logged in', () => {
        describe('When the resident clicks the Logout button', () => {
            it('Then it should call signOut and navigate to the home page', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load()

                fireEvent.click(screen.getByLabelText('Log out'))

                await waitFor(() => {
                    expect(signOut).toHaveBeenCalledTimes(1)
                    expect(mock_navigate).toHaveBeenCalledWith('/')
                })
            })

            it('Then the button label should change to "Logging out…" during the operation', async () => {
                // Delay signOut so we can catch the in-progress state
                signOut.mockImplementationOnce(
                    () => new Promise((res) => setTimeout(res, 200))
                )

                render(<ResidentDashboard />)
                await simulate_successful_load()

                fireEvent.click(screen.getByLabelText('Log out'))

                expect(screen.getByText('Logging out…')).toBeInTheDocument()
            })
        })
    })

    // -------------------------------------------------------------------------
    // 12. Navigation Links
    // -------------------------------------------------------------------------
    describe('Given the resident is on the dashboard page', () => {
        describe('When the top navigation is rendered', () => {
            it('Then "My Requests", "Submit Request", and "Public Dashboard" links should be present', async () => {
                render(<ResidentDashboard />)
                await simulate_successful_load()

                expect(
                    screen.getByText('Submit Request')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Public Dashboard')
                ).toBeInTheDocument()
            })
        })
    })

    // -------------------------------------------------------------------------
    // 13. Cleanup on Unmount
    // -------------------------------------------------------------------------
    describe('Given the component is mounted with active subscriptions', () => {
        describe('When the component unmounts', () => {
            it('Then all Firestore and Auth listeners should be unsubscribed', async () => {
                const mock_unsub_auth = jest.fn()
                const mock_unsub_requests = jest.fn()

                // FIXED: Using mockImplementationOnce preserves the _captured_cb logic
                onAuthStateChanged.mockImplementationOnce((auth_instance, cb) => {
                    onAuthStateChanged._captured_cb = cb
                    return mock_unsub_auth
                })
                
                subscribe_to_resident_requests.mockImplementationOnce(
                    (uid, cb) => {
                        act(() => cb([make_request()]))
                        return mock_unsub_requests
                    }
                )
                fetch_resident_profile.mockResolvedValue(MOCK_PROFILE)

                const { unmount } = render(<ResidentDashboard />)

                act(() => {
                    onAuthStateChanged._captured_cb(MOCK_USER)
                })

                // FIXED: Using getAllByText[0]
                await waitFor(() =>
                    expect(
                        screen.getAllByText('My Requests')[0]
                    ).toBeInTheDocument()
                )

                unmount()

                expect(mock_unsub_auth).toHaveBeenCalledTimes(1)
                expect(mock_unsub_requests).toHaveBeenCalledTimes(1)
            })
        })
    })
})