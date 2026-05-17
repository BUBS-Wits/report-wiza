import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ResidentDashboard from '../pages/resident_dashboard/resident_dashboard'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { getDocs } from 'firebase/firestore'
import {
	fetch_resident_profile,
	fetch_resident_requests,
	subscribe_to_resident_unread_count,
} from '../backend/resident_dashboard_service'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase_config'

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
	signOut: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	getDocs: jest.fn(),
}))

jest.mock('../firebase_config', () => ({
	auth: { currentUser: null },
	db: {},
}))

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
	'../components/notification_bell/notification_bell',
	() =>
		function MockNotificationBell() {
			return <div data-testid="notification-bell" />
		}
)

jest.mock(
	'../components/request_card/like_button/like_button',
	() =>
		function MockLikeButton() {
			return <div data-testid="like-button" />
		}
)

jest.mock(
	'../components/feedback_form/feedback_form',
	() =>
		function MockFeedbackForm({ onCancel, onSubmit }) {
			return (
				<div data-testid="feedback-form">
					<button
						onClick={() =>
							onSubmit({ rating: 4, comment: 'Good job' })
						}
					>
						Submit Mock Review
					</button>
					<button onClick={onCancel}>Cancel review</button>
				</div>
			)
		}
)

describe('ResidentDashboard Component', () => {
	let mockNavigate
	const originalFetch = global.fetch
	const originalAlert = window.alert
	const originalConsoleError = console.error

	beforeAll(() => {
		global.fetch = jest.fn()
		window.alert = jest.fn()
		console.error = jest.fn()
	})

	afterAll(() => {
		global.fetch = originalFetch
		window.alert = originalAlert
		console.error = originalConsoleError
	})

	beforeEach(() => {
		jest.clearAllMocks()
		mockNavigate = jest.fn()
		useNavigate.mockReturnValue(mockNavigate)
		auth.currentUser = null
	})

	test('renders loading state initially', () => {
		onAuthStateChanged.mockImplementation(() => jest.fn())

		render(<ResidentDashboard />)

		expect(screen.getByText('Loading your dashboard…')).toBeInTheDocument()
	})

	test('shows error screen if user is not logged in and handles ErrorScreen navigation', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(null)
			return jest.fn()
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.getByText('You are not logged in.')
			).toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Try again'))
		expect(mockNavigate).toHaveBeenCalledWith('/login')

		fireEvent.click(screen.getByText('Go back Home'))
		expect(mockNavigate).toHaveBeenCalledWith('/')
	})

	test('shows error screen if data loading fails', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockRejectedValue(new Error('Network failure'))

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(screen.getByText('Network failure')).toBeInTheDocument()
		})
	})

	test('shows empty state when there are no requests and handles logout', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({
			uid: 'user123',
			name: 'Jane Doe',
		})
		fetch_resident_requests.mockResolvedValue([])

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.getByText(
					'You have not submitted any service requests yet.'
				)
			).toBeInTheDocument()
		})

		expect(screen.getByText('JD')).toBeInTheDocument()

		signOut.mockResolvedValue()

		fireEvent.click(screen.getByLabelText('Log out'))

		expect(screen.getByText('Logging out…')).toBeInTheDocument()

		await waitFor(() => {
			expect(signOut).toHaveBeenCalled()
			expect(mockNavigate).toHaveBeenCalledWith('/')
		})
	})

	test('loads and displays resident profile, unread count, and selects first request', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({
			uid: 'user123',
			name: null,
		})

		const mockRequests = [
			{
				id: 'req1',
				category: 'Pothole',
				status: 'submitted',
				description: 'Big pothole',
				created_at: { toDate: () => new Date('2023-01-01') },
				updated_at: null,
				sa_ward: 'Ward 10',
			},
			{
				id: 'req2',
				category: 'Water Leak',
				status: 'unknown_status',
				priority: 'Unknown Priority',
				description: 'Leaking pipe',
				created_at: new Date('2023-01-02'),
				worker_uid: 'worker1',
				worker_name: 'Bob',
			},
		]

		fetch_resident_requests.mockResolvedValue(mockRequests)
		subscribe_to_resident_unread_count.mockImplementation((uid, cb) => {
			cb(5)
			return jest.fn()
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		await waitFor(() => {
			expect(screen.getByText('5')).toBeInTheDocument()
		})

		expect(screen.getAllByText('Resident').length).toBeGreaterThan(0)
		expect(screen.getAllByText('—').length).toBeGreaterThan(0)

		const secondCard = screen
			.getAllByText('Water Leak')[0]
			.closest('button')

		fireEvent.click(secondCard)

		await waitFor(() => {
			expect(screen.getByText('Not set')).toBeInTheDocument()
			expect(screen.getByText('Bob')).toBeInTheDocument()
		})

		fireEvent.click(screen.getByLabelText('Back to requests'))

		expect(
			screen.getByText('Select a request to view details and messages.')
		).toBeInTheDocument()
	})

	test('processes location, fetches signed URL, and handles StarRating', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({
			uid: 'user123',
			name: 'John',
		})

		const reqs = [
			{
				id: 'req1',
				status: 'closed',
				category: 'Road',
				priority: 'Critical',
				description: 'Fixing road',
				location: 'POINT(28.0583 -26.2309)',
				image: 'http://expired.com/img.jpg?X-Amz-Date=20000101T000000Z&X-Amz-Expires=3600',
				image_expires_at: new Date('2000-01-01').toISOString(),
				rating: 3,
				comment: 'Decent job',
			},
		]

		fetch_resident_requests.mockResolvedValue(reqs)

		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: 'http://signed.com/img.jpg?X-Amz-Date=20260516T095040Z&X-Amz-Expires=432000',
			}),
		})

		getDocs.mockResolvedValueOnce({
			empty: false,
			docs: [{ data: () => ({ text: 'Patch applied.' }) }],
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		const locLink = screen.getByRole('link', {
			name: /-26\.230900,\s*28\.058300/i,
		})
		expect(locLink).toBeInTheDocument()

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/get-signed-url?request_uid=req1'
		)

		await waitFor(() => {
			expect(screen.getByText('Patch applied.')).toBeInTheDocument()
		})

		expect(screen.getByText('Good')).toBeInTheDocument()
	})

	test('handles invalid location strings and non-expired images', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({
			uid: 'user123',
			name: 'John',
		})

		const futureDate = new Date()
		futureDate.setHours(futureDate.getHours() + 1)

		const reqs = [
			{
				id: 'req1',
				status: 'in_progress',
				category: 'Water',
				location: 'POINT(INVALID_DATA)',
				image: 'http://valid.com/img.jpg?X-Amz-Date=20260516T095040Z&X-Amz-Expires=432000',
				image_expires_at: futureDate.toISOString(),
			},
		]

		fetch_resident_requests.mockResolvedValue(reqs)

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		expect(global.fetch).not.toHaveBeenCalled()
		expect(screen.getByAltText('Request')).toHaveAttribute(
			'src',
			'http://valid.com/img.jpg?X-Amz-Date=20260516T095040Z&X-Amz-Expires=432000'
		)
	})

	test('handles signed URL fetch failure gracefully', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({
			uid: 'user123',
			name: 'John',
		})

		const reqs = [
			{
				id: 'req1',
				status: 'in_progress',
				category: 'Water',
				image: 'http://expired.com/img.jpg?X-Amz-Date=20000101T000000Z&X-Amz-Expires=3600',
				image_expires_at: new Date('2000-01-01').toISOString(),
			},
		]

		fetch_resident_requests.mockResolvedValue(reqs)

		global.fetch.mockResolvedValueOnce({
			ok: false,
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		const img = screen.getByAltText('Request')
		expect(img).toHaveAttribute(
			'src',
			'http://expired.com/img.jpg?X-Amz-Date=20000101T000000Z&X-Amz-Expires=3600'
		)
	})

	test('submits feedback successfully with auth', async () => {
		onAuthStateChanged.mockImplementation((authObj, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({ uid: 'user123' })
		fetch_resident_requests.mockResolvedValue([
			{ id: 'req1', status: 'resolved' },
		])

		auth.currentUser = {
			getIdToken: jest.fn().mockResolvedValue('mock_token'),
		}

		global.fetch.mockResolvedValueOnce({ ok: true })

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Review'))
		fireEvent.click(screen.getByText('Submit Mock Review'))

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				'/api/submit-review',
				expect.objectContaining({
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock_token',
					},
					body: JSON.stringify({
						request_uid: 'req1',
						rating: 4,
						comment: 'Good job',
					}),
				})
			)
			expect(window.alert).toHaveBeenCalledWith(
				'Review successfully submitted.'
			)
		})
	})

	test('submits feedback successfully without auth current user', async () => {
		onAuthStateChanged.mockImplementation((authObj, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({ uid: 'user123' })
		fetch_resident_requests.mockResolvedValue([
			{ id: 'req1', status: 'resolved' },
		])

		auth.currentUser = null

		global.fetch.mockResolvedValueOnce({ ok: true })

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Review'))
		fireEvent.click(screen.getByText('Submit Mock Review'))

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				'/api/submit-review',
				expect.objectContaining({
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						request_uid: 'req1',
						rating: 4,
						comment: 'Good job',
					}),
				})
			)
		})
	})

	test('handles feedback API json error gracefully', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({ uid: 'user123' })
		fetch_resident_requests.mockResolvedValue([
			{ id: 'req1', status: 'resolved' },
		])

		global.fetch.mockResolvedValueOnce({
			ok: false,
			text: async () => JSON.stringify({ error: 'JSON error message' }),
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Review'))
		fireEvent.click(screen.getByText('Submit Mock Review'))

		await waitFor(() => {
			expect(window.alert).toHaveBeenCalled()
		})

		expect(window.alert.mock.calls.flat().join(' ')).toContain(
			'JSON error message'
		)
	})

	test('handles feedback API generic text error gracefully', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({ uid: 'user123' })
		fetch_resident_requests.mockResolvedValue([
			{ id: 'req1', status: 'resolved' },
		])

		global.fetch.mockResolvedValueOnce({
			ok: false,
			text: async () => '<html>502 Bad Gateway</html>',
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Review'))
		fireEvent.click(screen.getByText('Submit Mock Review'))

		await waitFor(() => {
			expect(window.alert).toHaveBeenCalled()
		})

		expect(window.alert.mock.calls.flat().join(' ')).toContain(
			'Server error'
		)
	})

	test('handles network failure during feedback submission', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({ uid: 'user123' })
		fetch_resident_requests.mockResolvedValue([
			{ id: 'req1', status: 'resolved' },
		])

		global.fetch.mockRejectedValueOnce(new Error('Fetch failed'))

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Review'))
		fireEvent.click(screen.getByText('Submit Mock Review'))

		await waitFor(() => {
			expect(window.alert).toHaveBeenCalledWith(
				'Error submitting review.'
			)
		})
	})

	test('handles close reason fetch failure', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		fetch_resident_profile.mockResolvedValue({ uid: 'user123' })
		fetch_resident_requests.mockResolvedValue([
			{ id: 'req1', status: 'closed' },
		])

		getDocs.mockRejectedValueOnce(new Error('Permissions denied'))

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		await waitFor(() => {
			expect(screen.getAllByText('—').length).toBeGreaterThan(0)
		})
	})

	test('renders no-worker message when selected request has no assigned worker', async () => {
		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req1',
				category: 'Pothole',
				status: 'submitted',
				description: 'Big pothole',
				created_at: new Date('2023-01-01'),
				worker_uid: null,
				worker_name: null,
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
				screen.getByText(
					'Messaging will be available once a worker is assigned to this request.'
				)
			).toBeInTheDocument()
		})

		expect(screen.queryByTestId('message-thread')).not.toBeInTheDocument()
	})

	test('renders message thread when selected request has an assigned worker', async () => {
		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req1',
				category: 'Pothole',
				status: 'assigned',
				description: 'Big pothole',
				created_at: new Date('2023-01-01'),
				worker_uid: 'worker123',
				worker_name: 'Worker One',
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
			expect(screen.getByTestId('message-thread')).toBeInTheDocument()
		})
	})

	test('back button clears the selected request detail panel', async () => {
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
		]

		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(mockUser)
			return jest.fn()
		})
		fetch_resident_profile.mockResolvedValue(mockProfile)
		fetch_resident_requests.mockResolvedValue(mockRequests)

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(screen.getAllByText('Big pothole').length).toBe(2)
		})

		fireEvent.click(screen.getByLabelText('Back to requests'))

		expect(
			screen.getByText('Select a request to view details and messages.')
		).toBeInTheDocument()
	})

	test('shows close reason for a closed request', async () => {
		getDocs.mockResolvedValue({
			empty: false,
			docs: [{ data: () => ({ text: 'Duplicate request' }) }],
		})

		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req1',
				category: 'Pothole',
				status: 'closed',
				description: 'Big pothole',
				created_at: new Date('2023-01-01'),
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
			expect(screen.getByText('Close reason')).toBeInTheDocument()
		})

		await waitFor(() => {
			expect(screen.getByText('Duplicate request')).toBeInTheDocument()
		})
	})

	test('toggles the review form when review button is clicked', async () => {
		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req1',
				category: 'Pothole',
				status: 'resolved',
				description: 'Big pothole',
				created_at: new Date('2023-01-01'),
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
			expect(screen.getByText('Review')).toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Review'))

		expect(screen.getByTestId('feedback-form')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Cancel review'))

		expect(screen.queryByTestId('feedback-form')).not.toBeInTheDocument()
	})

	test('error screen buttons navigate correctly', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback(null)
			return jest.fn()
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.getByText('You are not logged in.')
			).toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Try again'))
		expect(mockNavigate).toHaveBeenCalledWith('/login')

		fireEvent.click(screen.getByText('Go back Home'))
		expect(mockNavigate).toHaveBeenCalledWith('/')
	})
})