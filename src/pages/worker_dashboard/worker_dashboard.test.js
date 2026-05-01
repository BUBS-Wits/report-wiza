import React from 'react'
import {
	render,
	screen,
	fireEvent,
	waitFor,
	act,
	waitForElementToBeRemoved,
} from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'

jest.mock('../../firebase_config.js', () => ({
	auth: {
		currentUser: {
			uid: 'worker-uid-1',
			getIdToken: jest.fn().mockResolvedValue('mock-token'),
		},
	},
}))

console.log = () => {}
console.debug = () => {}
console.error = () => {}

// Grab live references after mock is established
const { auth } = require('../../firebase_config.js')
const mock_current_user = auth.currentUser
const mock_get_id_token = auth.currentUser.getIdToken

const mock_unsubscribe = jest.fn()
const mock_on_auth_state_changed = jest.fn()

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: (...args) => mock_on_auth_state_changed(...args),
}))

// Numeric STATUS constants matching constants.js
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
		1: 'Assigned',
		2: 'In Progress',
		3: 'Resolved',
		4: 'Closed',
	}),
}))

jest.mock('../../backend/worker_analytics_service.js', () => ({
	fetch_worker_dashboard_data: jest.fn(),
}))

jest.mock('../../backend/worker_firebase.js', () => ({
	update_request_status: jest.fn(),
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
import { fetch_worker_dashboard_data } from '../../backend/worker_analytics_service.js'
import { update_request_status } from '../../backend/worker_firebase.js'

const MOCK_WORKER = {
	uid: 'worker-uid-1',
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
		status: 1, // STATUS.ASSIGNED
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
		status: 2, // STATUS.IN_PROGRESS
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
		status: 0, // STATUS.SUBMITTED
		sa_ward: 7,
		sa_province: 'Western Cape',
		sa_m_name: 'Cape Town',
		user_uid: 'user-uid-3',
		created_at: '2024-01-18T09:00:00Z',
		updated_at: null,
	},
]

function setup_mocks({
	claimed = MOCK_CLAIMED,
	unclaimed = MOCK_UNCLAIMED,
	worker = MOCK_WORKER,
	stats = MOCK_STATS,
} = {}) {
	fetch_worker_dashboard_data.mockResolvedValue({
		worker,
		tmp_requests: [],
		stats,
	})

	global.fetch = jest.fn().mockImplementation((url) => {
		if (url.includes('get-claimed-requests')) {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ data: claimed }),
			})
		}
		if (url.includes('get-unclaimed-requests')) {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ data: unclaimed }),
			})
		}
		return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
	})
}

function render_dashboard() {
	return render(<WorkerDashboard />)
}

describe('Loading state', () => {
	beforeEach(() => {
		mock_on_auth_state_changed.mockImplementation(() => mock_unsubscribe)
		setup_mocks()
	})

	test('shows loading screen initially', () => {
		render_dashboard()
		expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument()
	})
})

describe('Auth', () => {
	test('shows error when user is not logged in', async () => {
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => cb(null), 0)
			return mock_unsubscribe
		})
		setup_mocks()
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByText(/not logged in/i)).toBeInTheDocument()
		)
	})

	test('renders dashboard after successful auth', async () => {
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => act(() => cb(mock_current_user)), 0)
			return mock_unsubscribe
		})
		setup_mocks()
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
	})

	test('unsubscribes from auth on unmount', () => {
		mock_on_auth_state_changed.mockReturnValue(mock_unsubscribe)
		setup_mocks()
		const { unmount } = render_dashboard()
		unmount()
		expect(mock_unsubscribe).toHaveBeenCalled()
	})
})

describe('Dashboard render', () => {
	beforeEach(() => {
		setup_mocks()
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => act(() => cb(mock_current_user)), 0)
			return mock_unsubscribe
		})
	})

	async function mount_and_wait() {
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
	}

	test('renders performance summary section', async () => {
		await mount_and_wait()
		expect(screen.getByText('Performance summary')).toBeInTheDocument()
	})

	test('defaults to queue section showing claimed requests', async () => {
		await mount_and_wait()
		expect(screen.getByText('Electricity')).toBeInTheDocument()
		expect(screen.getByText('Water')).toBeInTheDocument()
	})

	test('shows "Assigned request queue" heading in queue section', async () => {
		await mount_and_wait()
		expect(screen.getByText('Assigned request queue')).toBeInTheDocument()
	})

	test('shows filter row in queue section', async () => {
		await mount_and_wait()
		expect(screen.getByText('All')).toBeInTheDocument()
	})

	test('renders avg resolution days when available', async () => {
		await mount_and_wait()
		expect(screen.getByText('3')).toBeInTheDocument()
	})

	test('renders — for avg resolution days when null', async () => {
		setup_mocks({ stats: { ...MOCK_STATS, avg_resolution_days: null } })
		await mount_and_wait()
		const dashes = screen.getAllByText('—')
		expect(dashes.length).toBeGreaterThan(0)
	})
})

describe('Section switching', () => {
	beforeEach(() => {
		setup_mocks()
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => act(() => cb(mock_current_user)), 0)
			return mock_unsubscribe
		})
	})

	async function mount_and_wait() {
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
	}

	test('switches to available section showing unclaimed requests', async () => {
		await mount_and_wait()
		let loading = screen.queryByText(/Loading dashboard/i)
		if (loading) {
			await waitForElementToBeRemoved(() =>
				screen.queryByText(/Loading dashboard/i)
			)
		}
		fireEvent.click(screen.getAllByText('Available')[0])
		loading = screen.queryByText(/Loading dashboard/i)
		if (loading) {
			await waitForElementToBeRemoved(() =>
				screen.queryByText(/Loading dashboard/i)
			)
		}
		expect(screen.getAllByText('Available requests')[0]).toBeInTheDocument()
	})

	test('switching back to queue shows claimed requests', async () => {
		await mount_and_wait()
		fireEvent.click(screen.getByText('Available'))
		fireEvent.click(screen.getByText('Queue'))
		await waitFor(() =>
			expect(screen.getByText('Electricity')).toBeInTheDocument()
		)
	})

	test('filter row is hidden in available section', async () => {
		await mount_and_wait()
		fireEvent.click(screen.getByText('Available'))
		expect(screen.queryByText('All')).not.toBeInTheDocument()
	})
})

describe('Filter row', () => {
	beforeEach(() => {
		setup_mocks()
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => act(() => cb(mock_current_user)), 0)
			return mock_unsubscribe
		})
	})

	async function mount_and_wait() {
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
	}

	test('filters to only Assigned requests', async () => {
		await mount_and_wait()
		let loading = screen.queryByText(/Loading dashboard/i)
		if (loading) {
			await waitForElementToBeRemoved(() =>
				screen.queryByText(/Loading dashboard/i)
			)
		}
		fireEvent.click(screen.getAllByText('Assigned')[0])
		await waitFor(() =>
			expect(screen.getByText('Electricity')).toBeInTheDocument()
		)
		expect(screen.queryByText('Pipe burst')).not.toBeInTheDocument()
	})

	test('All filter shows all requests', async () => {
		await mount_and_wait()
		let loading = screen.queryByText(/Loading dashboard/i)
		if (loading) {
			await waitForElementToBeRemoved(() =>
				screen.queryByText(/Loading dashboard/i)
			)
		}
		fireEvent.click(screen.getAllByText('Assigned')[0])
		loading = screen.queryByText(/Loading dashboard/i)
		if (loading) {
			await waitForElementToBeRemoved(() =>
				screen.queryByText(/Loading dashboard/i)
			)
		}
		fireEvent.click(screen.getByText('All'))
		expect(screen.getAllByText('Electricity')[0]).toBeInTheDocument()
		expect(screen.getAllByText('Pipe burst')[0]).toBeInTheDocument()
	})

	test('shows empty state when filter matches nothing', async () => {
		await mount_and_wait()
		const loading = screen.queryByText(/Loading dashboard/i)
		if (loading) {
			await waitForElementToBeRemoved(() =>
				screen.queryByText(/Loading dashboard/i)
			)
		}
		fireEvent.click(screen.getByRole('button', { name: /Resolved/i }))
		expect(screen.getByText(/no resolved requests/i)).toBeInTheDocument()
	})
})

describe('Detail panel open/close', () => {
	beforeEach(() => {
		setup_mocks()
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => act(() => cb(mock_current_user)), 0)
			return mock_unsubscribe
		})
	})

	async function mount_and_wait() {
		const rendered = render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
		return rendered
	}

	test('opens panel when a request row is clicked', async () => {
		await mount_and_wait()
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(
				screen.getByText('Conversation with resident')
			).toBeInTheDocument()
		)
	})

	test('closes panel when close button is clicked', async () => {
		await mount_and_wait()
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(
				screen.getAllByLabelText('Close panel')[0]
			).toBeInTheDocument()
		)
		const loading = screen.queryByText(/Loading dashboard/i)
		if (loading) {
			await waitForElementToBeRemoved(() =>
				screen.queryByText(/Loading dashboard/i)
			)
		}
		fireEvent.click(screen.getAllByLabelText('Close panel')[0])
		await waitFor(() =>
			expect(
				screen.queryByText('Conversation with resident')
			).not.toBeInTheDocument()
		)
	})

	test('closes panel on Escape key', async () => {
		await mount_and_wait()
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

	test('clicking same row again closes panel', async () => {
		await mount_and_wait()
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

	test('clicking different row switches panel content', async () => {
		await mount_and_wait()
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(screen.getAllByText('req-001')[0]).toBeInTheDocument()
		)
		const loading = screen.queryByText(/Loading dashboard/i)
		if (loading) {
			await waitForElementToBeRemoved(() =>
				screen.queryByText(/Loading dashboard/i)
			)
		}
		fireEvent.click(screen.getAllByLabelText(/open request req-002/i)[0])
		await waitFor(() =>
			expect(screen.getAllByText('req-002')[0]).toBeInTheDocument()
		)
	})
})

describe('Detail panel content', () => {
	beforeEach(() => {
		setup_mocks()
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => act(() => cb(mock_current_user)), 0)
			return mock_unsubscribe
		})
	})

	async function open_first_panel() {
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(
				screen.getByText('Conversation with resident')
			).toBeInTheDocument()
		)
		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: 'In Progress' })
			).toBeInTheDocument()
		)
	}

	test('shows request metadata in panel', async () => {
		await open_first_panel()
		expect(screen.getAllByText('Electricity')[0]).toBeInTheDocument()
		expect(screen.getAllByText('Gauteng')[0]).toBeInTheDocument()
		expect(screen.getAllByText('Joburg')[0]).toBeInTheDocument()
	})

	test('shows message thread when user_uid is present', async () => {
		await open_first_panel()
		expect(screen.getByTestId('message-thread')).toBeInTheDocument()
	})

	test('shows no-resident message when user_uid is absent', async () => {
		setup_mocks({
			claimed: [{ ...MOCK_CLAIMED[0], user_uid: null }],
		})
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(
				screen.getByText(/resident information unavailable/i)
			).toBeInTheDocument()
		)
	})

	test('shows status update section in queue section', async () => {
		await open_first_panel()
		expect(screen.getByText('Update Status')).toBeInTheDocument()
	})

	test('active status button is disabled', async () => {
		await open_first_panel() // req-001 has status 1 = Assigned
		expect(screen.getByRole('button', { name: 'Assigned' })).toBeDisabled()
	})

	test('non-active status buttons are enabled', async () => {
		await open_first_panel()
		expect(
			screen.getByRole('button', { name: 'In Progress' })
		).not.toBeDisabled()
		expect(
			screen.getByRole('button', { name: 'Resolved' })
		).not.toBeDisabled()
	})

	test('shows claim button in available section', async () => {
		render_dashboard()
		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: 'Queue' })
			).toBeInTheDocument()
		)
		fireEvent.click(screen.getByText('Available'))
		const loading = screen.queryByText(/Loading dashboard/i)
		if (loading) {
			await waitForElementToBeRemoved(() =>
				screen.queryByText(/Loading dashboard/i)
			)
		}
		fireEvent.click(screen.getAllByLabelText(/open request req-003/i)[0])
		await waitFor(() =>
			expect(screen.getByTestId('claim-btn')).toBeInTheDocument()
		)
		expect(screen.queryByText('Update Status')).not.toBeInTheDocument()
	})

	test('falls back to "Resident" when resident_name is absent', async () => {
		setup_mocks({
			claimed: [{ ...MOCK_CLAIMED[0], resident_name: undefined }],
		})
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(screen.getByTestId('message-thread')).toBeInTheDocument()
		)
	})

	test('shows — for dates when created_at and updated_at are absent', async () => {
		setup_mocks({
			claimed: [
				{ ...MOCK_CLAIMED[0], created_at: null, updated_at: null },
			],
		})
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(screen.getAllByText('-').length).toBeGreaterThan(0)
		)
	})
})

describe('Status update', () => {
	beforeEach(() => {
		setup_mocks()
		update_request_status.mockResolvedValue({ success: true })
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => act(() => cb(mock_current_user)), 0)
			return mock_unsubscribe
		})
	})

	async function open_first_panel() {
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
		fireEvent.click(screen.getAllByLabelText(/open request req-001/i)[0])
		await waitFor(() =>
			expect(screen.getByText('Update Status')).toBeInTheDocument()
		)
		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: 'In Progress' })
			).toBeInTheDocument()
		)
	}

	test('calls update_request_status with correct args', async () => {
		await open_first_panel()
		fireEvent.click(screen.getByRole('button', { name: 'In Progress' }))
		await waitFor(() =>
			expect(update_request_status).toHaveBeenCalledWith(
				'req-001',
				2 // STATUS.IN_PROGRESS
			)
		)
	})

	test('closes panel after successful status update', async () => {
		await open_first_panel()
		fireEvent.click(screen.getByRole('button', { name: 'In Progress' }))
		await waitFor(() =>
			expect(screen.queryByText('Update Status')).not.toBeInTheDocument()
		)
	})

	test('shows success busy tooltip', async () => {
		await open_first_panel()
		fireEvent.click(screen.getByRole('button', { name: 'In Progress' }))
		await waitFor(() =>
			expect(
				screen.getByText('Successfully updated request status.')
			).toBeInTheDocument()
		)
	})

	test('shows error tooltip when update fails', async () => {
		update_request_status.mockRejectedValue(new Error('Network error'))
		await open_first_panel()
		fireEvent.click(screen.getByRole('button', { name: 'In Progress' }))
		await waitFor(() =>
			expect(screen.getByText('Network error')).toBeInTheDocument()
		)
	})

	test('shows fallback error message when error has no message', async () => {
		render_dashboard()
		update_request_status.mockRejectedValue({})
		await open_first_panel()
		fireEvent.click(screen.getByRole('button', { name: 'In Progress' }))
		await waitFor(() =>
			expect(
				screen.getByText('Failed to update request status.')
			).toBeInTheDocument()
		)
	})
})

describe('Error state', () => {
	beforeEach(() => {
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => act(() => cb(mock_current_user)), 0)
			return mock_unsubscribe
		})
	})

	test('shows error screen when fetch_worker_dashboard_data rejects', async () => {
		fetch_worker_dashboard_data.mockRejectedValue(new Error('Server error'))
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: [] }),
		})
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByText('Server error')).toBeInTheDocument()
		)
	})

	test('fetch failures on claimed/unclaimed return [] and still load dashboard', async () => {
		fetch_worker_dashboard_data.mockResolvedValue({
			worker: MOCK_WORKER,
			tmp_requests: [],
			stats: MOCK_STATS,
		})
		global.fetch = jest.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ error: 'Unauthorized' }),
		})
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByTestId('nav-bar')).toBeInTheDocument()
		)
	})

	test('retry button calls load_dashboard again', async () => {
		fetch_worker_dashboard_data.mockRejectedValue(new Error('Fail'))
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: [] }),
		})
		render_dashboard()
		await waitFor(() =>
			expect(screen.getByText('Try again')).toBeInTheDocument()
		)
		fetch_worker_dashboard_data.mockResolvedValue({
			worker: MOCK_WORKER,
			tmp_requests: [],
			stats: MOCK_STATS,
		})
		fireEvent.click(screen.getByText('Try again'))
		await waitFor(() =>
			expect(
				fetch_worker_dashboard_data.mock.calls.length
			).toBeGreaterThanOrEqual(2)
		)
	})
})

describe('EmptyQueue', () => {
	beforeEach(() => {
		setup_mocks({ claimed: [] })
		mock_on_auth_state_changed.mockImplementation((_, cb) => {
			setTimeout(() => act(() => cb(mock_current_user)), 0)
			return mock_unsubscribe
		})
	})

	test('shows generic empty message for All filter', async () => {
		render_dashboard()
		await waitFor(() =>
			expect(
				screen.getByText(/no requests assigned to you/i)
			).toBeInTheDocument()
		)
	})
})
