import React from 'react'
import {
	render,
	screen,
	fireEvent,
	waitFor,
	act,
	prettyDOM,
} from '@testing-library/react'
import '@testing-library/jest-dom'

console.log = () => {}
console.debug = () => {}
console.error = () => {}

jest.mock('../../firebase_config.js', () => ({
	auth: {
		currentUser: {
			uid: 'worker-uid-1',
			getIdToken: jest.fn().mockResolvedValue('mock-token'),
		},
	},
	db: {},
}))

jest.mock('../../constants.js', () => ({
	STATUS: Object.freeze({
		SUBMITTED: 0,
		ASSIGNED: 1,
		IN_PROGRESS: 2,
		RESOLVED: 3,
		CLOSED: 4,
	}),
	STATUS_DISPLAY: Object.freeze({
		0: 'Submitted',
		1: 'Pending',
		2: 'Acknowledged',
		3: 'Resolved',
		4: 'Closed',
	}),
}))

const mock_unsub = jest.fn()
const mock_collection = jest.fn()
const mock_query = jest.fn()
const mock_where = jest.fn()
const mock_order_by = jest.fn()
const mock_on_snapshot = jest.fn()

jest.mock('firebase/firestore', () => ({
	collection: (...a) => mock_collection(...a),
	query: (...a) => mock_query(...a),
	where: (...a) => mock_where(...a),
	orderBy: (...a) => mock_order_by(...a),
	onSnapshot: (...a) => mock_on_snapshot(...a),
}))

const mock_on_auth_state_changed = jest.fn()
jest.mock('firebase/auth', () => ({
	onAuthStateChanged: (...a) => mock_on_auth_state_changed(...a),
}))

const mock_verify_worker = jest.fn()
const mock_compute_stats = jest.fn()
const mock_update_request_status = jest.fn()

jest.mock('../../backend/worker_analytics_service.js', () => ({
	verify_worker_and_get_profile: (...a) => mock_verify_worker(...a),
	compute_worker_stats: (...a) => mock_compute_stats(...a),
}))

jest.mock('../../backend/worker_firebase.js', () => ({
	update_request_status: (...a) => mock_update_request_status(...a),
}))

jest.mock('react-router-dom', () => ({
	useNavigate: () => jest.fn(),
}))

jest.mock(
	'../../components/worker_nav_bar/worker_nav_bar.js',
	() =>
		function MockNavBar({ sections, active_section }) {
			return (
				<nav data-testid="nav-bar" data-section={active_section}>
					<button onClick={sections.queue_onclick}>Queue</button>
					<button onClick={sections.available_onclick}>
						Available
					</button>
				</nav>
			)
		}
)

jest.mock(
	'../request/claim/claim_btn.js',
	() =>
		function MockClaimBtn({ request_uid, post_claim }) {
			return (
				<button data-testid="claim-btn" onClick={post_claim}>
					Claim {request_uid}
				</button>
			)
		}
)

jest.mock(
	'../../components/message_thread/message_thread.js',
	() =>
		function MockMessageThread({ request_id }) {
			return <div data-testid="message-thread">{request_id}</div>
		}
)

jest.mock('./worker_dashboard.css', () => ({}), { virtual: true })

import WorkerDashboard from './worker_dashboard.js'

const MOCK_WORKER_PROFILE = {
	name: 'Jane Smith',
	email: 'jane@example.com',
	role: 'worker',
}

const MOCK_STATS = {
	total: 10,
	resolved: 4,
	pending: 2,
	acknowledged: 3,
	avg_resolution_days: 3,
}

const MOCK_CLAIMED = [
	{
		id: 'req-001',
		category: 'Electricity',
		description: 'Street light is out',
		status: 1,
		sa_ward: 5,
		sa_province: 'Gauteng',
		sa_m_name: 'Joburg',
		user_uid: 'user-uid-1',
		resident_name: 'John Doe',
		created_at: '2024-01-15T10:00:00Z',
		updated_at: '2024-01-16T12:00:00Z',
	},
	{
		id: 'req-002',
		category: 'Water',
		description: 'Pipe burst',
		status: 2,
		sa_ward: 3,
		sa_province: 'Gauteng',
		sa_m_name: 'Joburg',
		user_uid: 'user-uid-2',
		resident_name: 'Alice',
		created_at: '2024-01-10T08:00:00Z',
		updated_at: null,
	},
]

const MOCK_UNCLAIMED = [
	{
		id: 'req-003',
		category: 'Roads',
		description: 'Pothole on main road',
		status: 0,
		sa_ward: 7,
		sa_province: 'Western Cape',
		sa_m_name: 'Cape Town',
		user_uid: 'user-uid-3',
		created_at: '2024-01-18T09:00:00Z',
		updated_at: null,
	},
]

let assignment_handler = null
let claimed_handler = null
let unclaimed_handler = null

function make_snapshot(items, type = 'modified', removed = undefined) {
	return {
		docs: items.map((item) => ({
			id: item.id,
			data: () => ({ ...item }),
		})),
		docChanges: () =>
			!removed
				? items.map((item) => {
						return {
							type,
							doc: {
								id: item.id,
								data: () => ({ ...item }),
							},
						}
					})
				: [
						{
							type,
							doc: {
								id: removed.id,
								data: () => ({ ...removed }),
							},
						},
					],
	}
}

function setup_firestore_mocks() {
	assignment_handler = null
	claimed_handler = null
	unclaimed_handler = null

	mock_collection.mockImplementation((_db, name) => `col:${name}`)
	mock_query.mockImplementation((col, ...rest) => ({ col, rest }))
	mock_where.mockReturnValue('where-constraint')
	mock_order_by.mockReturnValue('orderBy-constraint')

	mock_on_snapshot.mockImplementation(
		(function make_handler_capturer() {
			let call_count = 0
			return function (_query, handler) {
				call_count += 1
				// determines if it is the first onSnapShot call (in which case it is the outer assignment onSnapshot listener) or one of the other two which is dependent on the order you called them
				if (call_count === 1) {
					assignment_handler = handler
				} else if (call_count === 2) {
					claimed_handler = handler
				} else {
					unclaimed_handler = handler
				}
				return mock_unsub
			}
		})()
	)
}

function setup_service_mocks({
	worker_profile = MOCK_WORKER_PROFILE,
	stats = MOCK_STATS,
} = {}) {
	mock_verify_worker.mockResolvedValue({ data: () => worker_profile })
	mock_compute_stats.mockReturnValue(stats)
}

async function simulate_full_load({
	claimed = MOCK_CLAIMED,
	unclaimed = MOCK_UNCLAIMED,
} = {}) {
	await waitFor(() => {
		expect(mock_on_auth_state_changed).toHaveBeenCalled()
	})
	await act(async () => {
		const [, auth_cb] = mock_on_auth_state_changed.mock.calls[0]
		await auth_cb({ uid: 'worker-uid-1' })
	})

	await act(async () => {
		const docs = claimed.map((r) => ({
			id: `assignment-${r.id}`,
			data: () => ({ worker_uid: 'worker-uid-1', request_uid: r.id }),
		}))
		assignment_handler({ docs })
	})

	await act(async () => {
		claimed_handler(make_snapshot(claimed))
	})

	await act(async () => {
		unclaimed_handler(make_snapshot(unclaimed))
	})
}

function render_dashboard() {
	return render(<WorkerDashboard />)
}

async function mount_and_load({
	claimed = MOCK_CLAIMED,
	unclaimed = MOCK_UNCLAIMED,
} = {}) {
	render_dashboard()
	await simulate_full_load({ claimed, unclaimed })
	await waitFor(() =>
		expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
	)
}

beforeEach(() => {
	jest.clearAllMocks()
	mock_on_auth_state_changed.mockImplementation(() => {
		return mock_unsub
	})
	setup_firestore_mocks()
	setup_service_mocks()
})

describe('Loading state', () => {
	test('shows loading screen before auth resolves', () => {
		render_dashboard()
		expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument()
	})
})

describe('Auth', () => {
	test('shows error when user is not logged in', async () => {
		mock_on_auth_state_changed.mockImplementation((_auth, cb) => {
			setTimeout(
				() =>
					act(() => {
						cb(null)
					}),
				0
			)
			return mock_unsub
		})
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByText(/not logged in/i)).toBeInTheDocument()
		)
	})

	test('renders nav bar after successful auth + snapshot load', async () => {
		await mount_and_load()
		expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
	})

	test('unsubscribes from auth listener on unmount', () => {
		const { unmount } = render_dashboard()
		unmount()
		expect(mock_unsub).toHaveBeenCalled()
	})

	test('calls verify_worker_and_get_profile with the user uid', async () => {
		render_dashboard()
		await act(async () => {
			const [, cb] = mock_on_auth_state_changed.mock.calls[0]
			await cb({ uid: 'worker-uid-1' })
		})
		expect(mock_verify_worker).toHaveBeenCalledWith('worker-uid-1')
	})
})

describe('Dashboard render', () => {
	test('renders performance summary section', async () => {
		await mount_and_load()
		expect(screen.getByText('Performance summary')).toBeInTheDocument()
	})

	test('defaults to queue section and shows claimed requests', async () => {
		await mount_and_load()
		expect(screen.getByText('Electricity')).toBeInTheDocument()
		expect(screen.getByText('Water')).toBeInTheDocument()
	})

	test('shows "Assigned request queue" heading in queue section', async () => {
		await mount_and_load()
		expect(screen.getByText('Assigned request queue')).toBeInTheDocument()
	})

	test('shows filter row in queue section', async () => {
		await mount_and_load()
		expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
	})

	test('renders avg resolution days from stats', async () => {
		await mount_and_load()
		expect(screen.getByText('3')).toBeInTheDocument()
	})

	test('renders — for avg resolution days when null', async () => {
		setup_service_mocks({
			stats: { ...MOCK_STATS, avg_resolution_days: null },
		})
		await mount_and_load()
		expect(screen.getAllByText('—').length).toBeGreaterThan(0)
	})

	test('renders total assigned count from stats', async () => {
		await mount_and_load()
		expect(screen.getByText('10')).toBeInTheDocument()
	})

	test('renders resolved count from stats', async () => {
		await mount_and_load()
		expect(screen.getByText('4')).toBeInTheDocument()
	})
})

describe('Real-time snapshot updates', () => {
	test('re-renders when a new claimed request arrives via snapshot', async () => {
		await mount_and_load()

		const new_req = {
			id: 'req-999',
			category: 'Sanitation',
			description: 'Bin not collected',
			status: 1,
			sa_ward: 1,
			sa_province: 'Gauteng',
			sa_m_name: 'Joburg',
			user_uid: 'user-uid-9',
			created_at: '2024-02-01T08:00:00Z',
			updated_at: null,
		}

		await act(async () => {
			claimed_handler(make_snapshot([...MOCK_CLAIMED, new_req]))
		})

		expect(screen.getByText('Sanitation')).toBeInTheDocument()
	})

	test('removes a claimed request that disappears from snapshot', async () => {
		await mount_and_load()

		await act(async () => {
			const tmp = make_snapshot(
				[MOCK_CLAIMED[1]],
				'removed',
				MOCK_CLAIMED[0]
			)
			claimed_handler(tmp)
		})

		expect(screen.getByText('Water')).toBeInTheDocument()
		expect(screen.queryByText('Electricity')).not.toBeInTheDocument()
	})
})

describe('Section switching', () => {
	test('switches to available section and shows unclaimed requests', async () => {
		await mount_and_load()
		fireEvent.click(screen.getByText('Available'))
		await waitFor(() =>
			expect(screen.getByText('Available requests')).toBeInTheDocument()
		)
		expect(screen.getByText('Roads')).toBeInTheDocument()
	})

	test('switching back to queue shows claimed requests again', async () => {
		await mount_and_load()
		fireEvent.click(screen.getByText('Available'))
		fireEvent.click(screen.getByText('Queue'))
		await waitFor(() =>
			expect(screen.getByText('Electricity')).toBeInTheDocument()
		)
	})

	test('filter row is hidden in available section', async () => {
		await mount_and_load()
		fireEvent.click(screen.getByText('Available'))
		expect(
			screen.queryByRole('button', { name: 'All' })
		).not.toBeInTheDocument()
	})

	test('switching section closes open panel', async () => {
		await mount_and_load()
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(
				screen.getByText('Conversation with resident')
			).toBeInTheDocument()
		)
		fireEvent.click(screen.getByText('Available'))
		await waitFor(() =>
			expect(
				screen.queryByText('Conversation with resident')
			).not.toBeInTheDocument()
		)
	})
})

describe('Filter row', () => {
	test('filters to only Pending requests', async () => {
		await mount_and_load()
		fireEvent.click(screen.getAllByText('Pending')[0])
		await waitFor(() =>
			expect(screen.getByText('Electricity')).toBeInTheDocument()
		)
		expect(screen.queryByText('Pipe burst')).not.toBeInTheDocument()
	})

	test('All filter restores all requests', async () => {
		await mount_and_load()
		fireEvent.click(screen.getAllByText('Pending')[0])
		fireEvent.click(screen.getByRole('button', { name: 'All' }))
		expect(screen.getByText('Electricity')).toBeInTheDocument()
		expect(screen.getByText('Pipe burst')).toBeInTheDocument()
	})

	test('shows empty state when filter matches nothing', async () => {
		await mount_and_load()
		fireEvent.click(screen.getByRole('button', { name: /Resolved/i }))
		expect(screen.getByText(/no resolved requests/i)).toBeInTheDocument()
	})
})

describe('Detail panel open/close', () => {
	test('opens panel when a request row is clicked', async () => {
		await mount_and_load()
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(
				screen.getByText('Conversation with resident')
			).toBeInTheDocument()
		)
	})

	test('closes panel when close button is clicked', async () => {
		await mount_and_load()
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(
				screen.getAllByLabelText('Close panel')[0]
			).toBeInTheDocument()
		)
		fireEvent.click(screen.getAllByLabelText('Close panel')[0])
		await waitFor(() =>
			expect(
				screen.queryByText('Conversation with resident')
			).not.toBeInTheDocument()
		)
	})

	test('closes panel on Escape key', async () => {
		await mount_and_load()
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(
				screen.getByText('Conversation with resident')
			).toBeInTheDocument()
		)
		fireEvent.keyDown(window, { key: 'Escape' })
		await waitFor(() =>
			expect(
				screen.queryByText('Conversation with resident')
			).not.toBeInTheDocument()
		)
	})

	test('clicking the same row again closes the panel', async () => {
		await mount_and_load()
		const row = screen.getAllByLabelText(/open request req-001/i)[0]
		fireEvent.click(row)
		await waitFor(() =>
			expect(
				screen.getByText('Conversation with resident')
			).toBeInTheDocument()
		)
		fireEvent.click(row)
		await waitFor(() =>
			expect(
				screen.queryByText('Conversation with resident')
			).not.toBeInTheDocument()
		)
	})

	test('clicking a different row switches panel content', async () => {
		await mount_and_load()
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(screen.getAllByText('req-001')[0]).toBeInTheDocument()
		)
		fireEvent.click(screen.getAllByLabelText(/open request req-002/i)[0])
		await waitFor(() =>
			expect(screen.getAllByText('req-002')[0]).toBeInTheDocument()
		)
	})
})

describe('Detail panel content', () => {
	async function open_panel(req_label = /open request req-001/i) {
		await mount_and_load()
		fireEvent.click(screen.getAllByLabelText(req_label)[0])
		await waitFor(() =>
			expect(
				screen.getByText('Conversation with resident')
			).toBeInTheDocument()
		)
	}

	test('shows request metadata — category, province, municipality', async () => {
		await open_panel()
		expect(screen.getAllByText('Electricity')[0]).toBeInTheDocument()
		expect(screen.getAllByText('Gauteng')[0]).toBeInTheDocument()
		expect(screen.getAllByText('Joburg')[0]).toBeInTheDocument()
	})

	test('shows formatted created_at date', async () => {
		await open_panel()
		expect(screen.getAllByText('2024-01-15')[0]).toBeInTheDocument()
	})

	test('shows message thread when user_uid is present', async () => {
		await open_panel()
		expect(screen.getByTestId('message-thread')).toBeInTheDocument()
		expect(screen.getByTestId('message-thread').textContent).toBe('req-001')
	})

	test('shows no-resident message when user_uid is absent', async () => {
		const no_uid = [{ ...MOCK_CLAIMED[0], user_uid: null }]
		await mount_and_load({ claimed: no_uid })
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(
				screen.getByText(/resident information unavailable/i)
			).toBeInTheDocument()
		)
	})

	test('shows status update section when in queue section', async () => {
		await open_panel()
		expect(screen.getByText('Update Status')).toBeInTheDocument()
	})

	test('active status button is disabled', async () => {
		await open_panel() // req-001 has status 1 → 'Pending'
		expect(screen.getByRole('button', { name: 'Pending' })).toBeDisabled()
	})

	test('non-active status buttons are enabled', async () => {
		await open_panel()
		expect(
			screen.getByRole('button', { name: 'Acknowledged' })
		).not.toBeDisabled()
		expect(
			screen.getByRole('button', { name: 'Resolved' })
		).not.toBeDisabled()
	})

	test('shows claim button (not status update) in available section', async () => {
		await mount_and_load()
		fireEvent.click(screen.getByText('Available'))
		await waitFor(() =>
			expect(screen.getByText('Roads')).toBeInTheDocument()
		)
		fireEvent.click(screen.getAllByLabelText(/open request req-003/i)[0])
		await waitFor(() =>
			expect(screen.getByTestId('claim-btn')).toBeInTheDocument()
		)
		expect(screen.queryByText('Update Status')).not.toBeInTheDocument()
	})

	test('falls back to "Resident" label when resident_name is absent', async () => {
		const no_name = [{ ...MOCK_CLAIMED[0], resident_name: undefined }]
		await mount_and_load({ claimed: no_name })
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(screen.getByTestId('message-thread')).toBeInTheDocument()
		)
	})

	test('shows - for dates when both created_at and updated_at are absent', async () => {
		const no_dates = [
			{ ...MOCK_CLAIMED[0], created_at: null, updated_at: null },
		]
		await mount_and_load({ claimed: no_dates })
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(screen.getAllByText('-').length).toBeGreaterThan(0)
		)
	})
})

describe('Status update', () => {
	beforeEach(() => {
		mock_update_request_status.mockResolvedValue({ success: true })
	})

	async function open_panel_for_update() {
		await mount_and_load()
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(screen.getByText('Update Status')).toBeInTheDocument()
		)
	}

	test('calls update_request_status with correct id and new status', async () => {
		await open_panel_for_update()
		fireEvent.click(screen.getByRole('button', { name: 'Acknowledged' }))
		await waitFor(() =>
			expect(mock_update_request_status).toHaveBeenCalledWith(
				'req-001',
				2
			)
		)
	})

	test('closes the panel after a successful status update', async () => {
		await open_panel_for_update()
		fireEvent.click(screen.getByRole('button', { name: 'Acknowledged' }))
		await waitFor(() =>
			expect(screen.queryByText('Update Status')).not.toBeInTheDocument()
		)
	})

	test('shows success tooltip after update', async () => {
		await open_panel_for_update()
		fireEvent.click(screen.getByRole('button', { name: 'Acknowledged' }))
		await waitFor(() =>
			expect(
				screen.getByText('Successfully updated request status.')
			).toBeInTheDocument()
		)
	})

	test('shows error tooltip when update_request_status rejects with a message', async () => {
		mock_update_request_status.mockRejectedValue(new Error('Network error'))
		await open_panel_for_update()
		fireEvent.click(screen.getByRole('button', { name: 'Acknowledged' }))
		await waitFor(() =>
			expect(screen.getByText('Network error')).toBeInTheDocument()
		)
	})

	test('shows fallback error when rejected error has no message', async () => {
		mock_update_request_status.mockRejectedValue({})
		await open_panel_for_update()
		fireEvent.click(screen.getByRole('button', { name: 'Acknowledged' }))
		await waitFor(() =>
			expect(
				screen.getByText('Failed to update request status.')
			).toBeInTheDocument()
		)
	})

	test('does not call update again while first update is in-flight', async () => {
		let resolve_first
		mock_update_request_status.mockReturnValueOnce(
			new Promise((res) => {
				resolve_first = res
			})
		)
		await open_panel_for_update()
		fireEvent.click(screen.getByRole('button', { name: 'Acknowledged' }))
		fireEvent.click(screen.getByRole('button', { name: 'Resolved' }))
		expect(mock_update_request_status).toHaveBeenCalledTimes(1)
		await act(async () => resolve_first({ success: true }))
	})
})

describe('EmptyQueue', () => {
	/*
	test('shows generic empty message when there are no claimed requests', async () => {
		const r = render_dashboard()
		expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument()
		await waitFor(() => {
			expect(mock_on_auth_state_changed).toHaveBeenCalled()
		})
		console.info(prettyDOM(r.container.firstChild))
		await act(async () => {
			const [, auth_cb] = mock_on_auth_state_changed.mock.calls[0]
			await auth_cb({ uid: 'worker-uid-1' })
		})
		console.info(prettyDOM(r.container.firstChild))

		await act(async () => {
			assignment_handler({ docs: [] })
		})
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)

		await waitFor(() =>
			expect(
				screen.getByText(/no requests assigned to you/i)
			).toBeInTheDocument()
		)
	})
	*/

	test('shows filter-specific empty message when filter matches nothing', async () => {
		await mount_and_load()
		fireEvent.click(screen.getByRole('button', { name: /Resolved/i }))
		expect(screen.getByText(/no resolved requests/i)).toBeInTheDocument()
	})
})

describe('Cleanup', () => {
	test('unsubscribes all Firestore listeners on unmount', async () => {
		const { unmount } = render_dashboard()
		await simulate_full_load()
		unmount()
		expect(mock_unsub).toHaveBeenCalled()
	})

	test('registers at least one onSnapshot listener after load', async () => {
		await mount_and_load()
		expect(mock_on_snapshot).toHaveBeenCalled()
	})
})
