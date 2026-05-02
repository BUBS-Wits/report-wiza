import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('../firebase_config.js', () => ({
	auth: { currentUser: { uid: 'user-1' } },
	db: {},
}))

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	getDoc: jest.fn(),
	updateDoc: jest.fn(),
	collection: jest.fn(),
	getDocs: jest.fn(),
	addDoc: jest.fn(),
	serverTimestamp: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
}))

jest.mock('../components/request_card/like_button/like_button.js', () => {
	return function MockLikeButton() {
		return <button data-testid="like-button">Like</button>
	}
})

jest.mock('../backend/resident_firebase.js', () => ({
	fetchResidentRequests: jest.fn(),
}))

jest.mock('../pages/resident/resident_requests.css', () => ({}))

// ── Imports after mocks ────────────────────────────────────────────────────

import RequestCard from '../components/request_card/request_card.js'
import ResidentRequests from '../pages/resident/resident_requests.js'
import { fetchResidentRequests } from '../backend/resident_firebase.js'
import { STATUS, STATUS_DISPLAY } from '../constants.js'

// ── Test data ──────────────────────────────────────────────────────────────

const base_request = {
	id: 'req-001',
	category: 'water',
	status: STATUS.SUBMITTED,
	sa_ward: 'Ward 5',
	sa_m_name: 'Cape Town',
	description: 'Burst pipe on main road',
	like_count: 3,
}

const mock_resident_requests = [
	{
		id: 'r-001',
		category: 'electricity',
		status: STATUS.SUBMITTED,
		description: 'Power outage',
		like_count: 0,
		created_at: { toDate: () => new Date('2024-03-01') },
	},
	{
		id: 'r-002',
		category: null,
		status: null,
		description: null,
		like_count: 2,
		created_at: null,
	},
]

// ── RequestCard ────────────────────────────────────────────────────────────

describe('RequestCard', () => {
	describe('Given a request with status Open', () => {
		it('Then it should render the category', () => {
			render(<RequestCard request={base_request} />)
			expect(screen.getByText('water')).toBeInTheDocument()
		})

		it('Then it should render the status badge', () => {
			render(<RequestCard request={base_request} />)
			expect(
				screen.getByText(STATUS_DISPLAY[STATUS.SUBMITTED])
			).toBeInTheDocument()
		})

		it('Then it should render the location', () => {
			render(<RequestCard request={base_request} />)
			expect(screen.getByText(/ward 5.*cape town/i)).toBeInTheDocument()
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
					request={{ ...base_request, status: STATUS.RESOLVED }}
				/>
			)
			expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
		})
	})

	describe('Given a request with status Closed', () => {
		it('Then it should NOT show the LikeButton', () => {
			render(
				<RequestCard
					request={{ ...base_request, status: STATUS.CLOSED }}
				/>
			)
			expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
		})
	})
})

// ── ResidentRequests ───────────────────────────────────────────────────────

describe('ResidentRequests', () => {
	beforeEach(() => jest.clearAllMocks())

	describe('Given the component is loading', () => {
		it('Then it should show a loading message', () => {
			fetchResidentRequests.mockReturnValue(new Promise(() => {}))
			render(<ResidentRequests />)
			expect(
				screen.getByText(/loading your requests/i)
			).toBeInTheDocument()
		})
	})

	describe('Given the resident has no requests', () => {
		it('Then it should show an empty state message', async () => {
			fetchResidentRequests.mockResolvedValueOnce([])
			render(<ResidentRequests />)
			await waitFor(() =>
				expect(
					screen.getByText((content) =>
						content.includes('submitted any service requests')
					)
				).toBeInTheDocument()
			)
		})
	})

	describe('Given the resident has requests', () => {
		it('Then it should render each request description', async () => {
			fetchResidentRequests.mockResolvedValueOnce(mock_resident_requests)
			render(<ResidentRequests />)
			await screen.findByText('Power outage')
			expect(screen.getByText('electricity')).toBeInTheDocument()
		})

		it('Then it should show status for each request', async () => {
			fetchResidentRequests.mockResolvedValueOnce(mock_resident_requests)
			render(<ResidentRequests />)
			await screen.findByText('Power outage')
			const statuses = screen.getAllByText('open')
			expect(statuses.length).toBeGreaterThan(0)
		})

		it('Then it should show "Other" for missing category', async () => {
			fetchResidentRequests.mockResolvedValueOnce(mock_resident_requests)
			render(<ResidentRequests />)
			await screen.findByText('Other')
		})

		it('Then it should show "No description" for missing description', async () => {
			fetchResidentRequests.mockResolvedValueOnce(mock_resident_requests)
			render(<ResidentRequests />)
			await screen.findByText('No description')
		})

		it('Then it should show "Unknown date" for missing created_at', async () => {
			fetchResidentRequests.mockResolvedValueOnce(mock_resident_requests)
			render(<ResidentRequests />)
			await screen.findByText(/unknown date/i)
		})

		it('Then it should format created_at when present', async () => {
			fetchResidentRequests.mockResolvedValueOnce(mock_resident_requests)
			render(<ResidentRequests />)
			await waitFor(() =>
				expect(screen.getByText(/2024/)).toBeInTheDocument()
			)
		})
	})

	describe('Given fetching requests fails', () => {
		it('Then it should show an error message', async () => {
			fetchResidentRequests.mockRejectedValueOnce(
				new Error('Could not load your requests. Try again later.')
			)
			render(<ResidentRequests />)
			await screen.findByText(/could not load/i)
		})
	})
})
