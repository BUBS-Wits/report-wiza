import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminDashboard from '../pages/admin_dashboard/admin_dashboard.js'

// ---------------------------------------------------------------------------
// Global Mocks
// ---------------------------------------------------------------------------
window.confirm = jest.fn(() => true)

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------
import { subscribe_to_workers, revoke_worker_role } from '../backend/admin_firebase.js'

jest.mock('../backend/admin_firebase.js', () => ({
    subscribe_to_workers: jest.fn(),
    revoke_worker_role: jest.fn(),
}))

jest.mock('../backend/admin_messaging_service.js', () => ({
    subscribe_to_admin_threads: jest.fn(() => jest.fn()),
    subscribe_to_thread_messages: jest.fn(() => jest.fn()),
    admin_toggle_thread_messaging: jest.fn(),
    invalidate_request_cache: jest.fn(),
}))

jest.mock('../pages/admin_dashboard/admin_dashboard.css', () => ({}))

jest.mock('../components/top_bar/top_bar.js', () => {
    return function MockTopBar() { return <div data-testid="mock-top-bar" /> }
})

jest.mock('../components/stat_cards/stat_cards.js', () => {
    return function MockStatCards({ total }) {
        return <div data-testid="mock-stat-cards">Total: {total}</div>
    }
})

jest.mock('../components/register_worker/register_worker.js', () => {
    return function MockRegisterWorker() {
        return <button data-testid="mock-register-btn">Simulate Registration</button>
    }
})

jest.mock('../components/workers_list/workers_list.js', () => {
    return function MockWorkersList({ workers, on_revoke }) {
        return (
            <div data-testid="mock-workers-list">
                {workers.map((w) => (
                    <button
                        key={w.id}
                        data-testid={`revoke-btn-${w.id}`}
                        onClick={() => on_revoke(w.id, w.email)}
                    >
                        Revoke {w.email}
                    </button>
                ))}
            </div>
        )
    }
})

jest.mock('../components/admin_sidebar/admin_sidebar.js', () => {
    return function MockSidebar({ on_change }) {
        return (
            <div data-testid="mock-sidebar">
                <button onClick={() => on_change('workers')}>Workers</button>
                <button onClick={() => on_change('requests')}>Requests</button>
                <button onClick={() => on_change('messaging')}>Messaging</button>
                <button onClick={() => on_change('residents')}>Residents</button>
                <button onClick={() => on_change('analytics')}>Analytics</button>
                <button onClick={() => on_change('settings')}>Settings</button>
                <button onClick={() => on_change('unknown_section')}>Unknown</button>
            </div>
        )
    }
})

jest.mock('../components/admin_requests/admin_requests.js', () => {
    return function MockAdminRequests() { return <div>Requests section — coming soon</div> }
})

jest.mock('../components/admin_public_dashboard_settings/admin_public_dashboard_settings.js', () => {
    return function MockAdminPublicDashboardSettings() { return <div>Public dashboard field visibility</div> }
})

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('AdminDashboard', () => {
    const mock_worker_data = [
        { id: 'w1', email: 'worker1@city.gov' },
        { id: 'w2', email: 'worker2@city.gov' },
    ]
    let simulate_worker_update; // We will use this to push live updates to the UI

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(window, 'confirm').mockImplementation(() => true)

        const {
            subscribe_to_admin_threads,
            subscribe_to_thread_messages,
        } = require('../backend/admin_messaging_service.js')
        subscribe_to_admin_threads.mockImplementation(() => jest.fn())
        subscribe_to_thread_messages.mockImplementation(() => jest.fn())

        // By default, instantly call the React callback with the mock data
        subscribe_to_workers.mockImplementation((on_update, on_error) => {
            simulate_worker_update = on_update;
            on_update(mock_worker_data);
            return jest.fn(); // mock unsubscribe
        })
    })

    const wait_for_initial_load = async () => {
        await waitFor(() => {
            expect(screen.getByTestId('mock-stat-cards')).toHaveTextContent('Total: 2')
        })
    }

    // -----------------------------------------------------------------------
    // 1. Initial Mount & Data Fetching
    // -----------------------------------------------------------------------
    describe('Given the AdminDashboard is mounted', () => {
        describe('When the component initializes successfully', () => {
            it('Then it should setup listener and render the workers section by default', async () => {
                render(<AdminDashboard />)
                await wait_for_initial_load()

                expect(subscribe_to_workers).toHaveBeenCalledTimes(1)
                expect(screen.getByTestId('mock-top-bar')).toBeInTheDocument()
                expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument()
                expect(screen.getByTestId('revoke-btn-w1')).toBeInTheDocument()
            })
        })

        describe('When the live listener throws an error', () => {
            it('Then it should catch the error and display an error toast', async () => {
                subscribe_to_workers.mockImplementationOnce((on_update, on_error) => {
                    on_error(new Error('Firebase Live Listener Error'))
                    return jest.fn()
                })

                render(<AdminDashboard />)

                await waitFor(() => {
                    expect(screen.getByText('Firebase Live Listener Error')).toBeInTheDocument()
                })
            })
        })
    })

    // -----------------------------------------------------------------------
    // 2. Child Component Interactions
    // -----------------------------------------------------------------------
    describe('Given the Workers section is active', () => {
        describe('When the register button is rendered', () => {
            it('Then it is available for interaction (registration UI handled by internal live listeners)', async () => {
                render(<AdminDashboard />)
                await wait_for_initial_load()
                expect(screen.getByTestId('mock-register-btn')).toBeInTheDocument()
            })
        })
    })

    // -----------------------------------------------------------------------
    // 3. Worker Revocation Logic
    // -----------------------------------------------------------------------
    describe('Given the AdminDashboard is loaded with workers', () => {
        describe('When the admin successfully revokes a worker role', () => {
            it('Then it should display a success message and update when Firestore syncs', async () => {
                revoke_worker_role.mockResolvedValueOnce()

                render(<AdminDashboard />)
                await wait_for_initial_load()

                fireEvent.click(screen.getByTestId('revoke-btn-w1'))

                // Verify the backend call was made
                await waitFor(() => {
                    expect(revoke_worker_role).toHaveBeenCalledWith('w1')
                })

                // Simulate Firestore instantly pushing the updated data back down to React
                simulate_worker_update([{ id: 'w2', email: 'worker2@city.gov' }])

                await waitFor(() => {
                    expect(screen.queryByTestId('revoke-btn-w1')).not.toBeInTheDocument()
                })

                expect(screen.getByTestId('revoke-btn-w2')).toBeInTheDocument()
                const message_div = screen.getByText('Worker role revoked for worker1@city.gov')
                expect(message_div).toBeInTheDocument()
            })
        })

        describe('When revoking a worker role fails', () => {
            it('Then it should display an error message', async () => {
                revoke_worker_role.mockRejectedValueOnce(new Error('Permission Denied'))

                render(<AdminDashboard />)
                await wait_for_initial_load()

                fireEvent.click(screen.getByTestId('revoke-btn-w2'))

                const message_div = await screen.findByText(/Permission Denied/i)
                expect(message_div).toBeInTheDocument()
            })
        })
    })

    // -----------------------------------------------------------------------
    // 4. Sidebar Navigation & Rendering
    // -----------------------------------------------------------------------
    describe('Given the Sidebar is rendered', () => {
        describe('When the Requests section is clicked', () => {
            it('Then it should render the requests placeholder', async () => {
                render(<AdminDashboard />)
                await wait_for_initial_load() 

                fireEvent.click(screen.getByText('Requests'))
                expect(screen.getByText('Requests section — coming soon')).toBeInTheDocument()
            })
        })

        describe('When the Messaging section is clicked', () => {
            it('Then it should render the messaging placeholder', async () => {
                render(<AdminDashboard />)
                await wait_for_initial_load()

                fireEvent.click(screen.getByText('Messaging'))
                expect(screen.getByText('Monitor all conversations between workers and residents')).toBeInTheDocument()
            })
        })

        describe('When the Residents section is clicked', () => {
            it('Then it should render the residents placeholder', async () => {
                render(<AdminDashboard />)
                await wait_for_initial_load()

                fireEvent.click(screen.getByText('Residents'))
                expect(screen.getByText('Residents Management')).toBeInTheDocument()
            })
        })

        describe('When the Analytics section is clicked', () => {
            it('Then it should render the analytics placeholder', async () => {
                render(<AdminDashboard />)
                await wait_for_initial_load()

                fireEvent.click(screen.getByText('Analytics'))
                expect(screen.getByText('Analytics Overview')).toBeInTheDocument()
            })
        })

        describe('When the Settings section is clicked', () => {
            it('Then it should render the public dashboard settings component', async () => {
                render(<AdminDashboard />)
                await wait_for_initial_load()

                fireEvent.click(screen.getByText('Settings'))
                expect(screen.getByText('Public dashboard field visibility')).toBeInTheDocument()
            })
        })

        describe('When an unknown section is passed to the state', () => {
            it('Then it should return null for the content area safely', async () => {
                render(<AdminDashboard />)
                await wait_for_initial_load()

                fireEvent.click(screen.getByText('Unknown'))

                expect(screen.queryByTestId('mock-workers-list')).not.toBeInTheDocument()
                expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
            })
        })
    })
})