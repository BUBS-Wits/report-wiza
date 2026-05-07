import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Global mocks ───────────────────────────────────────────────────────────

jest.mock('../firebase_config.js', () => ({
	auth: { currentUser: { uid: 'user-1' } },
	db: {},
	storage: {},
}))

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	getDoc: jest.fn(),
	setDoc: jest.fn(),
	updateDoc: jest.fn(),
	collection: jest.fn(),
	getDocs: jest.fn(),
	addDoc: jest.fn(),
	serverTimestamp: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
}))

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn((auth, cb) => {
		cb({ uid: 'user-1', getIdToken: jest.fn().mockResolvedValue('token') })
		return jest.fn()
	}),
}))

jest.mock('react-router-dom', () => ({
	NavLink: ({ children, to, className }) => (
		<a
			href={to}
			className={
				typeof className === 'function'
					? className({ isActive: false })
					: className
			}
		>
			{children}
		</a>
	),
	useNavigate: () => jest.fn(),
	BrowserRouter: ({ children }) => <div>{children}</div>,
}))

// ── Sidebar ────────────────────────────────────────────────────────────────

jest.mock('../components/sidebar/sidebar.css', () => ({}))

import Sidebar from '../components/sidebar/sidebar.js'

describe('Sidebar', () => {
	describe('Given the sidebar is rendered', () => {
		it('Then it should show the brand name', () => {
			render(<Sidebar />)
			expect(screen.getByText('WIZA')).toBeInTheDocument()
		})

		it('Then it should show Management section', () => {
			render(<Sidebar />)
			expect(screen.getByText('Management')).toBeInTheDocument()
		})

		it('Then it should show nav links', () => {
			render(<Sidebar />)
			expect(screen.getByText('Workers')).toBeInTheDocument()
			expect(screen.getByText('Requests')).toBeInTheDocument()
		})

		it('Then it should show Analytics dropdown button', () => {
			render(<Sidebar />)
			expect(screen.getByText('Analytics')).toBeInTheDocument()
		})

		it('Then clicking Analytics should expand the submenu', () => {
			render(<Sidebar />)
			fireEvent.click(screen.getByText('Analytics'))
			expect(screen.getByText('Category Report')).toBeInTheDocument()
		})

		it('Then clicking Analytics again should collapse the submenu', () => {
			render(<Sidebar />)
			fireEvent.click(screen.getByText('Analytics'))
			expect(screen.getByText('Category Report')).toBeInTheDocument()
			fireEvent.click(screen.getByText('Analytics'))
			expect(
				screen.queryByText('Category Report')
			).not.toBeInTheDocument()
		})

		it('Then it should show "soon" for unready sub items', () => {
			render(<Sidebar />)
			fireEvent.click(screen.getByText('Analytics'))
			const soonBadges = screen.getAllByText('soon')
			expect(soonBadges.length).toBeGreaterThan(0)
		})
	})
})

// ── Buttons ────────────────────────────────────────────────────────────────

import YellowBtn from '../components/buttons/yellow_btn.js'
import TransparentBtn from '../components/buttons/transparent_btn.js'

describe('YellowBtn', () => {
	it('Then it should render the button text', () => {
		render(<YellowBtn text="Submit" onClick={jest.fn()} />)
		expect(screen.getByText('Submit')).toBeInTheDocument()
	})

	it('Then it should call onClick when clicked', () => {
		const mock_click = jest.fn()
		render(<YellowBtn text="Submit" onClick={mock_click} />)
		fireEvent.click(screen.getByText('Submit'))
		expect(mock_click).toHaveBeenCalled()
	})
})

describe('TransparentBtn', () => {
	it('Then it should render the button text', () => {
		render(<TransparentBtn text="Cancel" onClick={jest.fn()} />)
		expect(screen.getByText('Cancel')).toBeInTheDocument()
	})

	it('Then it should call onClick when clicked', () => {
		const mock_click = jest.fn()
		render(<TransparentBtn text="Cancel" onClick={mock_click} />)
		fireEvent.click(screen.getByText('Cancel'))
		expect(mock_click).toHaveBeenCalled()
	})
})

// ── RequestCard ────────────────────────────────────────────────────────────

jest.mock('../components/request_card/like_button/like_button.js', () => {
	return function MockLikeButton() {
		return <button data-testid="like-button">Like</button>
	}
})

import RequestCard from '../components/request_card/request_card.js'

const base_request = {
	id: 'req-001',
	category: 'water',
	status: 'Open',
	ward: 'Ward 5',
	municipality: 'Cape Town',
	description: 'Burst pipe',
	like_count: 2,
}

describe('RequestCard', () => {
	it('Then it should render category, status, location and description', () => {
		render(<RequestCard request={base_request} />)
		expect(screen.getByText('water')).toBeInTheDocument()
		expect(screen.getByText('Open')).toBeInTheDocument()
		expect(screen.getByText('Ward 5 - Cape Town')).toBeInTheDocument()
		expect(screen.getByText('Burst pipe')).toBeInTheDocument()
	})

	it('Then it should show LikeButton for open requests', () => {
		render(<RequestCard request={base_request} />)
		expect(screen.getByTestId('like-button')).toBeInTheDocument()
	})

	it('Then it should hide LikeButton for Resolved requests', () => {
		render(
			<RequestCard request={{ ...base_request, status: 'Resolved' }} />
		)
		expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
	})

	it('Then it should hide LikeButton for Closed requests', () => {
		render(<RequestCard request={{ ...base_request, status: 'Closed' }} />)
		expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
	})
})

// ── ResidentRequests ───────────────────────────────────────────────────────

jest.mock('../backend/resident_firebase.js', () => ({
	fetchResidentRequests: jest.fn(),
}))

jest.mock('../pages/resident/resident_requests.css', () => ({}))

import ResidentRequests from '../pages/resident/resident_requests.js'
import { fetchResidentRequests } from '../backend/resident_firebase.js'

describe('ResidentRequests', () => {
	beforeEach(() => jest.clearAllMocks())

	it('Then it should show loading state', () => {
		fetchResidentRequests.mockReturnValue(new Promise(() => {}))
		render(<ResidentRequests />)
		expect(screen.getByText(/loading your requests/i)).toBeInTheDocument()
	})

	it('Then it should show empty state when no requests', async () => {
		fetchResidentRequests.mockResolvedValueOnce([])
		render(<ResidentRequests />)
		await waitFor(() =>
			expect(
				screen.getByText((c) =>
					c.includes('submitted any service requests')
				)
			).toBeInTheDocument()
		)
	})

	it('Then it should render requests', async () => {
		fetchResidentRequests.mockResolvedValueOnce([
			{
				id: 'r-1',
				category: 'electricity',
				status: 'open',
				description: 'Power outage',
				like_count: 0,
				created_at: { toDate: () => new Date('2024-01-01') },
			},
		])
		render(<ResidentRequests />)
		await screen.findByText('Power outage')
		expect(screen.getByText('electricity')).toBeInTheDocument()
	})

	it('Then it should show error when fetch fails', async () => {
		fetchResidentRequests.mockRejectedValueOnce(
			new Error('Could not load your requests. Try again later.')
		)
		render(<ResidentRequests />)
		await screen.findByText(/could not load/i)
	})

	it('Then it should show fallback values for null fields', async () => {
		fetchResidentRequests.mockResolvedValueOnce([
			{
				id: 'r-2',
				category: null,
				status: null,
				description: null,
				like_count: 0,
				created_at: null,
			},
		])
		render(<ResidentRequests />)
		await screen.findByText('Other')
		expect(screen.getByText('No description')).toBeInTheDocument()
		expect(screen.getByText(/unknown date/i)).toBeInTheDocument()
	})
})

// ── ClaimBtn ───────────────────────────────────────────────────────────────

import ClaimBtn from '../pages/request/claim/claim_btn.js'

describe('ClaimBtn', () => {
	it('Then it should render the Claim button', () => {
		render(<ClaimBtn request_id="req-001" />)
		expect(screen.getByText('Claim')).toBeInTheDocument()
	})
})

// ── category_report_service ────────────────────────────────────────────────

import {
	build_category_stats,
	compute_summary,
	format_resolution_time,
	get_resolution_class,
	fetch_report_data,
} from '../backend/category_report_service.js'

import { getDocs } from 'firebase/firestore'

describe('category_report_service', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('build_category_stats', () => {
		it('Then it should count requests per category', () => {
			const requests = [
				{ category: 'water', status: 'pending' },
				{ category: 'water', status: 'resolved' },
				{ category: 'road', status: 'in_progress' },
			]
			const stats = build_category_stats(requests)
			const water = stats.find((s) => s.category === 'water')
			expect(water.total).toBe(2)
			expect(water.pending).toBe(1)
			expect(water.resolved).toBe(1)
		})
	})

	describe('compute_summary', () => {
		it('Then it should compute totals and worst backlog', () => {
			const stats = [
				{ category: 'water', pending: 3, resolved: 2, avg_hours: 10 },
				{ category: 'road', pending: 1, resolved: 5, avg_hours: 20 },
			]
			const summary = compute_summary(stats)
			expect(summary.total_resolved).toBe(7)
			expect(summary.total_pending).toBe(4)
			expect(summary.worst_backlog.category).toBe('water')
		})

		it('Then it should return null worst_backlog when no pending items', () => {
			const stats = [
				{
					category: 'water',
					pending: 0,
					resolved: 0,
					avg_hours: null,
				},
			]
			const summary = compute_summary(stats)
			expect(summary.overall_avg_hours).toBeNull()
			expect(summary.worst_backlog).toBeNull()
		})
	})

	describe('format_resolution_time', () => {
		it('Then it should return null for null input', () => {
			expect(format_resolution_time(null)).toBeNull()
		})

		it('Then it should format minutes for hours < 1', () => {
			expect(format_resolution_time(0.5)).toBe('30m')
		})

		it('Then it should format hours for hours < 24', () => {
			expect(format_resolution_time(5)).toBe('5h')
		})

		it('Then it should format days for hours >= 24', () => {
			expect(format_resolution_time(48)).toBe('2.0d')
		})
	})

	describe('get_resolution_class', () => {
		it('Then it should return empty string for null', () => {
			expect(get_resolution_class(null)).toBe('')
		})

		it('Then it should return fast for <= 24h', () => {
			expect(get_resolution_class(12)).toBe('resolution_fast')
		})

		it('Then it should return medium for <= 72h', () => {
			expect(get_resolution_class(48)).toBe('resolution_medium')
		})

		it('Then it should return slow for > 72h', () => {
			expect(get_resolution_class(100)).toBe('resolution_slow')
		})
	})

	describe('fetch_report_data', () => {
		it('Then it should fetch and return stats', async () => {
			getDocs.mockResolvedValueOnce({
				docs: [
					{
						id: 'r1',
						data: () => ({ category: 'water', status: 'pending' }),
					},
				],
			})
			const result = await fetch_report_data()
			expect(result.total_requests).toBe(1)
			expect(result.stats).toBeDefined()
		})
	})
})
