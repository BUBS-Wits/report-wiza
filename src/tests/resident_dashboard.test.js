import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ResidentDashboard from '../pages/resident_dashboard/resident_dashboard'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
	fetch_resident_profile,
	fetch_resident_requests,
	subscribe_to_resident_unread_count,
} from '../backend/resident_dashboard_service'
import { useNavigate } from 'react-router-dom'

// Mock external dependencies
jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
	signOut: jest.fn(),
}))

jest.mock('../firebase_config', () => ({ auth: {}, db: {} }))

jest.mock('../backend/resident_dashboard_service', () => ({
	fetch_resident_profile: jest.fn(),
	fetch_resident_requests: jest.fn(),
	subscribe_to_resident_unread_count: jest.fn(),
}))

jest.mock('react-router-dom', () => ({
	Link: function MockLink({ children, to, className }) {
		return (
			<a href={to} className={className}>
				{children}
			</a>
		)
	},
	useLocation: () => ({ pathname: '/resident-dashboard' }),
	useNavigate: jest.fn(),
}))

jest.mock(
	'../components/message_thread/message_thread',
	() =>
		function MockMessageThread() {
			return <div data-testid="message-thread" />
		}
)

jest.mock(
	'../components/request_card/like_button/like_button',
	() =>
		function MockLikeButton() {
			return <div data-testid="like-button" />
		}
)

describe('ResidentDashboard Component', () => {
	let mockNavigate

	beforeEach(() => {
		jest.clearAllMocks()
		mockNavigate = jest.fn()
		useNavigate.mockReturnValue(mockNavigate)
	})

	test('renders loading state initially', () => {
		onAuthStateChanged.mockImplementation(() => jest.fn())
		render(<ResidentDashboard />)
		expect(screen.getByText('Loading your dashboard…')).toBeInTheDocument()
	})

	test('shows error screen if user is not logged in', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(null) // Simulate no authenticated user
			return jest.fn()
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.getByText('You are not logged in.')
			).toBeInTheDocument()
		})
	})

	test('shows error screen if data loading fails', async () => {
		const mockUser = { uid: 'user123' }
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(mockUser)
			return jest.fn()
		})

		fetch_resident_profile.mockRejectedValue(new Error('Network error'))
		fetch_resident_requests.mockRejectedValue(new Error('Network error'))

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(screen.getByText('Network error')).toBeInTheDocument()
		})
	})

	test('loads and displays resident profile and requests', async () => {
		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req1',
				category: 'Pothole',
				status: 'submitted',
				description: 'Big pothole',
				created_at: new Date('2023-01-01'),
			},
			{
				id: 'req2',
				category: 'Water Leak',
				status: 'in_progress',
				description: 'Leaking pipe',
				created_at: new Date('2023-01-02'),
			},
		]

		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(mockUser)
			return jest.fn()
		})
		fetch_resident_profile.mockResolvedValue(mockProfile)
		fetch_resident_requests.mockResolvedValue(mockRequests)
		subscribe_to_resident_unread_count.mockImplementation((uid, cb) => {
			cb(3) // 3 unread messages
			return jest.fn()
		})

		render(<ResidentDashboard />)

		// Wait for primary fetch to complete
		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		// Check Profile
		expect(screen.getByText('John Doe')).toBeInTheDocument()
		expect(screen.getByText('JD')).toBeInTheDocument() // Initials

		// Wait for the secondary effect (unread count subscription) to trigger re-render
		await waitFor(() => {
			expect(screen.getByText('3')).toBeInTheDocument()
		})

		// Check Requests in Sidebar (using getAllByText because active requests appear in both sidebar and details view)
		expect(screen.getAllByText('Pothole').length).toBeGreaterThan(0)
		expect(screen.getAllByText('Water Leak').length).toBeGreaterThan(0)

		// The first request should be selected and its details rendered in the main area (Length is 2: sidebar + details view)
		expect(screen.getAllByText('Big pothole').length).toBe(2)
	})

	test('shows empty state when there are no requests', async () => {
		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'Jane Doe' }

		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(mockUser)
			return jest.fn()
		})
		fetch_resident_profile.mockResolvedValue(mockProfile)
		fetch_resident_requests.mockResolvedValue([]) // No requests

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.getByText(
					"You haven't submitted any service requests yet."
				)
			).toBeInTheDocument()
		})
	})

	test('handles request selection correctly', async () => {
		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req1',
				category: 'Pothole',
				status: 'submitted',
				description: 'Big pothole',
				created_at: new Date(),
			},
			{
				id: 'req2',
				category: 'Water Leak',
				status: 'in_progress',
				description: 'Leaking pipe',
				created_at: new Date(),
			},
		]

		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(mockUser)
			return jest.fn()
		})
		fetch_resident_profile.mockResolvedValue(mockProfile)
		fetch_resident_requests.mockResolvedValue(mockRequests)

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		// Click the second request card
		const secondCard = screen
			.getAllByText('Water Leak')[0]
			.closest('button')
		fireEvent.click(secondCard)

		// Verify the details area updated to show the second request's description
		// It should now appear twice (once in sidebar, once in the detail view)
		await waitFor(() => {
			expect(screen.getAllByText('Leaking pipe').length).toBe(2)
		})
	})

	test('handles logout process correctly', async () => {
		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }

		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(mockUser)
			return jest.fn()
		})
		fetch_resident_profile.mockResolvedValue(mockProfile)
		fetch_resident_requests.mockResolvedValue([])
		signOut.mockResolvedValue() // Simulate successful signout

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(screen.getByLabelText('Log out')).toBeInTheDocument()
		})

		const logoutBtn = screen.getByLabelText('Log out')
		fireEvent.click(logoutBtn)

		expect(screen.getByText('Logging out…')).toBeInTheDocument()

		await waitFor(() => {
			expect(signOut).toHaveBeenCalledTimes(1)
			expect(mockNavigate).toHaveBeenCalledWith('/')
		})
	})
})
