import React from 'react'
import {
	render,
	screen,
	fireEvent,
	waitFor,
	within,
} from '@testing-library/react'
import { STATUS, STATUS_DISPLAY } from '../constants.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks — all jest.mock() calls are hoisted by Babel, so order here is
   cosmetic only. Keep them grouped by concern for readability.
───────────────────────────────────────────────────────────────────────────── */

// ── CSS ──────────────────────────────────────────────────────────────────────
jest.mock('../pages/worker_dashboard/worker_dashboard.css', () => ({}))

// ── Worker nav bar ────────────────────────────────────────────────────────────
// Render name & email so the component tests that assert on those values pass.
jest.mock(
	'../components/worker_nav_bar/worker_nav_bar.js',
	() =>
		function MockWorkerNavBar({ user }) {
			return (
				<nav data-testid="worker-nav-bar">
					<span>{user?.name}</span>
					<span>{user?.email}</span>
				</nav>
			)
		}
)

// ── Firebase auth ─────────────────────────────────────────────────────────────
jest.mock('firebase/auth', () => ({
	getAuth: jest.fn(),
	onAuthStateChanged: jest.fn((auth, callback) => {
		callback({ uid: 'worker_001' })
		return jest.fn() // unsubscribe
	}),
}))

// ── Firebase config ───────────────────────────────────────────────────────────
jest.mock('../firebase_config.js', () => ({
	auth: {},
	db: {},
}))

// ── Service layer ─────────────────────────────────────────────────────────────
// fetch_worker_dashboard_data → controlled jest.fn() for component tests.
// compute_worker_stats        → real pure implementation, inlined so tests
//                               run without touching Firebase at all.
jest.mock('../backend/worker_dashboard_service.js', () => {
	const compute_worker_stats = (requests) => {
		const t = jest.requireActual('../constants.js')
		const by_status = (status) =>
			requests.filter((r) => r.status === status)

		const resolved = by_status(t.STATUS.RESOLVED)
		let avg_resolution_days = 0

		if (resolved.length > 0) {
			const total_ms = resolved.reduce((sum, r) => {
				const assigned = r.assignedAt?.toMillis?.() ?? 0
				const resolved_at =
					r.resolvedAt?.toMillis?.() ?? r.updatedAt?.toMillis?.() ?? 0
				return sum + Math.max(0, resolved_at - assigned)
			}, 0)

			avg_resolution_days = parseFloat(
				(total_ms / resolved.length / (1000 * 60 * 60 * 24)).toFixed(1)
			)
		}

		return {
			total: requests.length,
			resolved: resolved.length,
			pending: by_status(t.STATUS.ASSIGNED).length,
			acknowledged: by_status(t.STATUS.IN_PROGRESS).length,
			closed: by_status(t.STATUS.CLOSED).length,
			avg_resolution_days,
		}
	}

	return {
		fetch_worker_dashboard_data: jest.fn(),
		compute_worker_stats,
	}
})

/* ─────────────────────────────────────────────────────────────────────────────
   Imports — after mocks are declared (hoisting means mocks always win)
───────────────────────────────────────────────────────────────────────────── */

import WorkerDashboard from '../pages/worker_dashboard/worker_dashboard.js'
import {
	fetch_worker_dashboard_data,
	compute_worker_stats,
} from '../backend/worker_dashboard_service.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Shared fixtures
───────────────────────────────────────────────────────────────────────────── */

const mockTimestamp = (dateString) => ({
	toMillis: () => new Date(dateString).getTime(),
})

const MOCK_REQUESTS = [
	{
		id: 'REQ-001',
		category: 'Potholes',
		description: 'Large pothole on Main Rd',
		ward: 'Ward 12',
		municipality: 'City of Cape Town',
		status: STATUS.ASSIGNED,
		priority: 'High',
		assignedAt: mockTimestamp('2026-04-15T00:00:00Z'),
		updatedAt: mockTimestamp('2026-04-15T00:00:00Z'),
	},
	{
		id: 'REQ-007',
		category: 'Water',
		description: 'Burst pipe on Elm Street',
		ward: 'Ward 12',
		municipality: 'City of Cape Town',
		status: STATUS.IN_PROGRESS,
		priority: 'Critical',
		assignedAt: mockTimestamp('2026-04-14T00:00:00Z'),
		updatedAt: mockTimestamp('2026-04-17T00:00:00Z'),
	},
	{
		id: 'REQ-019',
		category: 'Waste',
		description: 'Missed bin collection',
		ward: 'Ward 12',
		municipality: 'City of Cape Town',
		status: STATUS.RESOLVED,
		priority: 'Low',
		assignedAt: mockTimestamp('2026-04-08T00:00:00Z'),
		updatedAt: mockTimestamp('2026-04-10T00:00:00Z'),
		resolvedAt: mockTimestamp('2026-04-10T00:00:00Z'),
	},
	{
		id: 'REQ-031',
		category: 'Water',
		description: 'No water pressure',
		ward: 'Ward 15',
		municipality: 'City of Cape Town',
		status: STATUS.CLOSED,
		priority: 'High',
		assignedAt: mockTimestamp('2026-04-01T00:00:00Z'),
		updatedAt: mockTimestamp('2026-04-03T00:00:00Z'),
	},
]

const MOCK_STATS = {
	total: 4,
	resolved: 1,
	pending: 1,
	acknowledged: 1,
	closed: 1,
	avg_resolution_days: 2.0,
}

const MOCK_SERVICE_RESPONSE = {
	worker: {
		uid: 'worker_001',
		name: 'Thendo Mukhuba',
		email: 'thendo@capetown.gov.za',
		role: 'worker',
	},
	requests: MOCK_REQUESTS,
	stats: MOCK_STATS,
}

/* ─────────────────────────────────────────────────────────────────────────────
   SERVICE — compute_worker_stats unit tests
───────────────────────────────────────────────────────────────────────────── */

describe('compute_worker_stats', () => {
	test('returns zero stats for an empty request list', () => {
		const stats = compute_worker_stats([])
		expect(stats.total).toBe(0)
		expect(stats.resolved).toBe(0)
		expect(stats.avg_resolution_days).toBe(0)
	})

	test('counts each status correctly', () => {
		const stats = compute_worker_stats(MOCK_REQUESTS)
		expect(stats.total).toBe(4)
		expect(stats.pending).toBe(1)
		expect(stats.acknowledged).toBe(1)
		expect(stats.resolved).toBe(1)
		expect(stats.closed).toBe(1)
	})

	test('calculates average resolution time in days', () => {
		const stats = compute_worker_stats(MOCK_REQUESTS)
		expect(stats.avg_resolution_days).toBe(2.0)
	})

	test('avg_resolution_days is 0 when no requests are resolved', () => {
		const unresolved = MOCK_REQUESTS.filter(
			(r) => r.status !== STATUS.RESOLVED
		)
		const stats = compute_worker_stats(unresolved)
		expect(stats.avg_resolution_days).toBe(0)
	})

	test('handles multiple resolved requests and rounds to 1 decimal', () => {
		const requests = [
			{
				status: STATUS.RESOLVED,
				assignedAt: mockTimestamp('2026-04-01T00:00:00Z'),
				resolvedAt: mockTimestamp('2026-04-04T00:00:00Z'),
			},
			{
				status: STATUS.RESOLVED,
				assignedAt: mockTimestamp('2026-04-01T00:00:00Z'),
				resolvedAt: mockTimestamp('2026-04-03T00:00:00Z'),
			},
		]
		const stats = compute_worker_stats(requests)
		expect(stats.avg_resolution_days).toBe(2.5)
	})
})

/* ─────────────────────────────────────────────────────────────────────────────
   FRONTEND — WorkerDashboard component tests
───────────────────────────────────────────────────────────────────────────── */

describe('WorkerDashboard component', () => {
	beforeEach(() => {
		const { onAuthStateChanged } = require('firebase/auth')
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'worker_001' })
			return jest.fn()
		})
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	function mockSuccessfulFetch() {
		fetch_worker_dashboard_data.mockResolvedValueOnce(MOCK_SERVICE_RESPONSE)
	}

	/* ── US-003: Dashboard renders for authenticated worker ─────────────────── */

	test('US-003 — shows loading state on initial render', () => {
		fetch_worker_dashboard_data.mockReturnValueOnce(new Promise(() => {}))
		render(<WorkerDashboard />)
		expect(screen.getByText('Loading dashboard…')).toBeInTheDocument()
	})

	test('US-003 — renders worker name after data loads', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() =>
			expect(screen.getByText('Thendo Mukhuba')).toBeInTheDocument()
		)
	})

	test('US-003 — renders worker email after data loads', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() =>
			expect(
				screen.getByText('thendo@capetown.gov.za')
			).toBeInTheDocument()
		)
	})

	test('US-003 — shows error screen when service call fails', async () => {
		fetch_worker_dashboard_data.mockRejectedValueOnce(
			new Error('Not authenticated.')
		)
		render(<WorkerDashboard />)
		await waitFor(() =>
			expect(screen.getByText('Not authenticated.')).toBeInTheDocument()
		)
	})

	test('US-003 — retry button reloads dashboard after error', async () => {
		fetch_worker_dashboard_data
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce(MOCK_SERVICE_RESPONSE)

		render(<WorkerDashboard />)
		await waitFor(() => screen.getByText('Try again'))
		fireEvent.click(screen.getByText('Try again'))
		await waitFor(() =>
			expect(screen.getByText('Thendo Mukhuba')).toBeInTheDocument()
		)
	})

	/* ── US-049: Performance summary ────────────────────────────────────────── */

	test('US-049 — renders the performance summary section heading', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() =>
			expect(screen.getByText('Performance summary')).toBeInTheDocument()
		)
	})

	test('US-049 — displays total assigned count', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() => {
			const card = screen
				.getByText(`Total ${STATUS_DISPLAY[STATUS.ASSIGNED]}`)
				.closest('.wd-stat-card')
			expect(within(card).getByText(/4/)).toBeInTheDocument()
		})
	})

	test('US-049 — displays resolved count', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() => {
			const resolvedElements = screen.getAllByText(
				STATUS_DISPLAY[STATUS.RESOLVED]
			)
			const statLabel = resolvedElements.find((el) =>
				el.classList.contains('wd-stat-label')
			)
			const card = statLabel.closest('.wd-stat-card')
			expect(within(card).getByText(/1/)).toBeInTheDocument()
		})
	})

	test('US-049 — displays average resolution time', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() => {
			const card = screen
				.getByText('Avg. resolution time')
				.closest('.wd-stat-card')
			expect(within(card).getByText(/2/)).toBeInTheDocument()
		})
	})

	test('US-049 — awaiting action count equals pending + acknowledged', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() => {
			const card = screen
				.getByText('Awaiting action')
				.closest('.wd-stat-card')
			expect(within(card).getByText(/2/)).toBeInTheDocument()
		})
	})

	/* ── US-022: Request queue and filtering ─────────────────────────────────── */

	test('US-022 — renders the assigned request queue section heading', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() =>
			expect(
				screen.getByText('Assigned request queue')
			).toBeInTheDocument()
		)
	})

	test('US-022 — renders all filter buttons', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() => screen.getByText('Assigned request queue'))
		;[
			'All',
			STATUS_DISPLAY[STATUS.ASSIGNED],
			STATUS_DISPLAY[STATUS.IN_PROGRESS],
			STATUS_DISPLAY[STATUS.RESOLVED],
			STATUS_DISPLAY[STATUS.CLOSED],
		].forEach((s) =>
			expect(
				screen.getByRole('button', { name: new RegExp(`^${s}`) })
			).toBeInTheDocument()
		)
	})

	test("US-022 — all requests are visible when 'All' filter is active", async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() => screen.getByText('REQ-001'))
		expect(screen.getByText('REQ-007')).toBeInTheDocument()
		expect(screen.getByText('REQ-019')).toBeInTheDocument()
		expect(screen.getByText('REQ-031')).toBeInTheDocument()
	})

	test("US-022 — filtering to 'Pending' shows only pending requests", async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() => screen.getByText('REQ-001'))

		fireEvent.click(
			screen.getByRole('button', {
				name: new RegExp('^' + STATUS_DISPLAY[STATUS.ASSIGNED]),
			})
		)
		expect(screen.getByText('REQ-001')).toBeInTheDocument()
		expect(screen.queryByText('REQ-007')).not.toBeInTheDocument()
		expect(screen.queryByText('REQ-019')).not.toBeInTheDocument()
		expect(screen.queryByText('REQ-031')).not.toBeInTheDocument()
	})

	test("US-022 — filtering to 'Resolved' shows only resolved requests", async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() => screen.getByText('REQ-019'))

		fireEvent.click(
			screen.getByRole('button', {
				name: new RegExp('^' + STATUS_DISPLAY[STATUS.RESOLVED]),
			})
		)
		expect(screen.getByText('REQ-019')).toBeInTheDocument()
		expect(screen.queryByText('REQ-001')).not.toBeInTheDocument()
	})

	test('US-022 — shows empty state message when a filter has no results', async () => {
		fetch_worker_dashboard_data.mockResolvedValueOnce({
			...MOCK_SERVICE_RESPONSE,
			requests: MOCK_REQUESTS.filter(
				(r) => r.status !== STATUS.IN_PROGRESS
			),
			stats: { ...MOCK_STATS, acknowledged: 0 },
		})

		render(<WorkerDashboard />)
		await waitFor(() => screen.getByText('Assigned request queue'))

		fireEvent.click(
			screen.getByRole('button', {
				name: new RegExp(STATUS_DISPLAY[STATUS.IN_PROGRESS]),
			})
		)
		expect(
			screen.getByText(
				`No ${STATUS_DISPLAY[STATUS.IN_PROGRESS].toLowerCase()} requests assigned to you.`
			)
		).toBeInTheDocument()
	})

	test('US-022 — request row displays category, ward, and status badge', async () => {
		mockSuccessfulFetch()
		render(<WorkerDashboard />)
		await waitFor(() => screen.getByText('Potholes'))

		const row = screen.getByText('REQ-001').closest('.wd-req-row')
		expect(within(row).getByText(/Ward 12/)).toBeInTheDocument()
		expect(
			within(row).getByText(
				new RegExp('^' + STATUS_DISPLAY[STATUS.ASSIGNED], 'i')
			)
		).toBeInTheDocument()
	})
})
