import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

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
	useLocation: () => ({ pathname: '/' }),
	BrowserRouter: ({ children }) => <div>{children}</div>,
}))

jest.mock('../components/request_card/like_button/like_button.js', () => {
	return function MockLikeButton() {
		return <button data-testid="like-button">Like</button>
	}
})

jest.mock('../pages/resident/resident_requests.css', () => ({}))

/* ─────────────────────────────────────────────────────────────────────────────
   Imports — after mocks
───────────────────────────────────────────────────────────────────────────── */

import RequestCard from '../components/request_card/request_card.js'

jest.mock('../backend/resident_firebase.js', () => ({
	fetchResidentRequests: jest.fn(),
}))

import ResidentRequests from '../pages/resident/resident_requests.js'
import { fetchResidentRequests } from '../backend/resident_firebase.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Shared fixture
   - status: 'open'       → STATUS.SUBMITTED  → displays as 'Submitted'
   - sa_ward: 5           → renders as 'Ward 5'
   - sa_m_name            → renders as municipality name
───────────────────────────────────────────────────────────────────────────── */

const base_request = {
	id: 'req-001',
	category: 'water',
	status: 'open',
	sa_ward: 5,
	sa_m_name: 'Cape Town',
	description: 'Burst pipe on main road',
	like_count: 2,
}

/* ─────────────────────────────────────────────────────────────────────────────
   RequestCard
───────────────────────────────────────────────────────────────────────────── */

describe('RequestCard', () => {
	describe('Given a request with status Open', () => {
		it('Then it should render the category', () => {
			render(<RequestCard request={base_request} />)
			expect(screen.getByText('water')).toBeInTheDocument()
		})

		it('Then it should render the status badge', () => {
			render(<RequestCard request={base_request} />)
			// STATUS_DISPLAY['open'] = 'Submitted'
			expect(screen.getByText('Submitted')).toBeInTheDocument()
		})

		it('Then it should render the location', () => {
			render(<RequestCard request={base_request} />)
			expect(screen.getByText(/Ward 5/)).toBeInTheDocument()
			expect(screen.getByText(/Cape Town/)).toBeInTheDocument()
		})

		it('Then it should render the description', () => {
			render(<RequestCard request={base_request} />)
			expect(
				screen.getByText('Burst pipe on main road')
			).toBeInTheDocument()
		})

		it('Then it should show the LikeButton', () => {
			render(<RequestCard request={base_request} />)
			expect(screen.getByTestId('like-button')).toBeInTheDocument()
		})
	})

	describe('Given a request with status Resolved', () => {
		it('Then it should NOT show the LikeButton', () => {
			render(
				<RequestCard
					request={{ ...base_request, status: 'resolved' }}
				/>
			)
			expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
		})
	})

	describe('Given a request with status Closed', () => {
		it('Then it should NOT show the LikeButton', () => {
			render(
				<RequestCard request={{ ...base_request, status: 'closed' }} />
			)
			expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
		})
	})
})

/* ─────────────────────────────────────────────────────────────────────────────
   ResidentRequests
───────────────────────────────────────────────────────────────────────────── */

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
