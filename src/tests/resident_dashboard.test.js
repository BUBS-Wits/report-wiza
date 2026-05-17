import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ResidentDashboard from '../pages/resident_dashboard/resident_dashboard.js'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase_config.js'
import {
	fetch_resident_profile,
	fetch_resident_requests,
	subscribe_to_resident_unread_count,
} from '../backend/resident_dashboard_service.js'
import { useNavigate } from 'react-router-dom'

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
	signOut: jest.fn(),
}))

jest.mock('../firebase_config.js', () => ({
	auth: {
		currentUser: {
			uid: 'user123',
			getIdToken: jest.fn(),
		},
	},
	db: {},
}))

jest.mock('../backend/resident_dashboard_service.js', () => ({
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
	'../components/message_thread/message_thread.js',
	() =>
		function MockMessageThread() {
			return <div data-testid="message-thread" />
		}
)

jest.mock(
	'../components/notification_bell/notification_bell.js',
	() =>
		function MockNotificationBell() {
			return <div data-testid="notification-bell" />
		}
)

jest.mock(
	'../components/request_card/like_button/like_button.js',
	() =>
		function MockLikeButton() {
			return <div data-testid="like-button" />
		}
)

jest.mock(
	'../components/feedback_form/feedback_form.js',
	() =>
		function MockFeedbackForm({ onCancel, onSubmit }) {
			return (
				<div data-testid="feedback-form">
					<button onClick={onCancel}>Cancel review</button>
					<button
						onClick={() =>
							onSubmit({
								rating: 5,
								comment: 'Great service',
							})
						}
					>
						Submit review
					</button>
				</div>
			)
		}
)

jest.mock('firebase/firestore', () => ({
	getDocs: jest.fn(),
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
}))

describe('ResidentDashboard Component', () => {
	let mockNavigate

	beforeEach(() => {
		jest.clearAllMocks()
		mockNavigate = jest.fn()
		useNavigate.mockReturnValue(mockNavigate)
		global.fetch = jest.fn()
		auth.currentUser.getIdToken.mockResolvedValue('fake-token')

		const firestore = require('firebase/firestore')
		firestore.getDocs.mockReset()
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	test('renders loading state initially', () => {
		onAuthStateChanged.mockImplementation(() => jest.fn())

		render(<ResidentDashboard />)

		expect(screen.getByText('Loading your dashboard…')).toBeInTheDocument()
	})

	test('shows error screen if user is not logged in', async () => {
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
			cb(3)
			return jest.fn()
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		expect(screen.getByText('John Doe')).toBeInTheDocument()
		expect(screen.getByText('JD')).toBeInTheDocument()

		await waitFor(() => {
			expect(screen.getByText('3')).toBeInTheDocument()
		})

		expect(screen.getAllByText('Pothole').length).toBeGreaterThan(0)
		expect(screen.getAllByText('Water Leak').length).toBeGreaterThan(0)
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
		fetch_resident_requests.mockResolvedValue([])

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.getByText(
					'You have not submitted any service requests yet.'
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

		const secondCard = screen
			.getAllByText('Water Leak')[0]
			.closest('button')
		fireEvent.click(secondCard)

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
		signOut.mockResolvedValue()

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(screen.getByLabelText('Log out')).toBeInTheDocument()
		})

		fireEvent.click(screen.getByLabelText('Log out'))

		expect(screen.getByText('Logging out…')).toBeInTheDocument()

		await waitFor(() => {
			expect(signOut).toHaveBeenCalledTimes(1)
			expect(mockNavigate).toHaveBeenCalledWith('/')
		})
	})

	describe('cancel request', () => {
		const originalConfirm = window.confirm

		beforeAll(() => {
			window.confirm = jest.fn(() => true)
		})

		afterAll(() => {
			window.confirm = originalConfirm
		})

		it.skip('calls cancel API and removes request from list', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					message: 'Request cancelled successfully.',
				}),
			})

			const mockRequests = [
				{
					id: 'req-cancel-1',
					category: 'Water',
					description: 'Test cancel',
					status: 'submitted',
					worker_uid: null,
					priority: 'Low',
					like_count: 0,
					sa_ward: 'Ward 1',
					sa_m_name: 'Test City',
					created_at: new Date(),
					updated_at: new Date(),
					location: null,
					image: null,
					worker_name: null,
					user_uid: 'user123',
				},
			]
			const mockProfile = { uid: 'user123', name: 'Test Resident' }

			fetch_resident_profile.mockResolvedValue(mockProfile)
			fetch_resident_requests.mockResolvedValue(mockRequests)
			subscribe_to_resident_unread_count.mockReturnValue(jest.fn())

			onAuthStateChanged.mockImplementation((auth, callback) => {
				callback({ uid: 'user123' })
				return jest.fn()
			})

			render(<ResidentDashboard />)

			await waitFor(() => {
				expect(
					screen.getAllByText('Test cancel').length
				).toBeGreaterThanOrEqual(1)
			})

			fireEvent.click(
				screen.getAllByText('Test cancel')[0].closest('button')
			)

			const cancelBtn = await screen.findByText('Cancel Request')
			expect(cancelBtn).toBeInTheDocument()
			fireEvent.click(cancelBtn)

			await waitFor(() => {
				expect(screen.queryAllByText('Test cancel')).toHaveLength(0)
			})

			expect(global.fetch).toHaveBeenCalledWith(
				'/api/cancel-request',
				expect.objectContaining({ method: 'POST' })
			)
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
		const firestore = require('firebase/firestore')

		firestore.getDocs.mockResolvedValue({
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

	test('renders request detail metadata for priority, worker, location, image, and review', async () => {
		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const signedImageUrl =
			'https://example.com/request.jpg?X-Amz-Date=20260516T095040Z&X-Amz-Expires=432000'

		const mockRequests = [
			{
				id: 'req-detail',
				category: 'Electricity',
				status: 'resolved',
				description: 'Power outage reported',
				created_at: new Date('2023-01-01'),
				updated_at: new Date('2023-01-02'),
				priority: 'High',
				worker_uid: 'worker123',
				worker_name: 'Worker One',
				sa_ward: 'Ward 4',
				location: 'POINT(28.047300 -26.204100)',
				image: signedImageUrl,
				image_expires_at: new Date('2099-01-01').toISOString(),
				rating: 5,
				comment: 'Excellent response',
				like_count: 4,
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

		expect(screen.getByText('High')).toBeInTheDocument()
		expect(screen.getByText('Worker One')).toBeInTheDocument()
		expect(screen.getAllByText('Ward 4').length).toBeGreaterThanOrEqual(1)
		expect(screen.getByText('Excellent response')).toBeInTheDocument()
		expect(screen.getByText('Excellent')).toBeInTheDocument()

		const locationLink = screen.getByRole('link', {
			name: /-26\.204100, 28\.047300/,
		})
		expect(locationLink).toHaveAttribute(
			'href',
			'https://www.google.com/maps?q=-26.2041,28.0473'
		)

		expect(screen.getByAltText('Request')).toHaveAttribute(
			'src',
			signedImageUrl
		)
		expect(screen.getByTestId('message-thread')).toBeInTheDocument()
	})

	test('renders fallback detail values when optional request fields are missing', async () => {
		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req-fallback',
				category: 'Roads',
				status: 'submitted',
				description: 'Road issue',
				created_at: null,
				updated_at: null,
				priority: null,
				worker_uid: null,
				worker_name: null,
				sa_ward: null,
				location: null,
				image: null,
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

		expect(screen.getByText('Not set')).toBeInTheDocument()
		expect(screen.getByText('Not yet assigned')).toBeInTheDocument()
		expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
		expect(screen.queryByAltText('Request')).not.toBeInTheDocument()
		expect(screen.queryByTestId('message-thread')).not.toBeInTheDocument()
	})

	test('shows blank close reason fallback when a closed request has no close reason comment', async () => {
		const firestore = require('firebase/firestore')

		firestore.getDocs.mockResolvedValueOnce({
			empty: true,
			docs: [],
		})

		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req-closed-empty',
				category: 'Water',
				status: 'closed',
				description: 'Closed request without reason',
				created_at: new Date('2023-01-01'),
				updated_at: new Date('2023-01-02'),
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
			expect(firestore.getDocs).toHaveBeenCalled()
		})

		expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
	})

	test('handles close reason fetch failure by showing fallback value', async () => {
		const firestore = require('firebase/firestore')

		firestore.getDocs.mockRejectedValueOnce(new Error('Permission denied'))

		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req-closed-error',
				category: 'Water',
				status: 'closed',
				description: 'Closed request with error',
				created_at: new Date('2023-01-01'),
				updated_at: new Date('2023-01-02'),
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
			expect(firestore.getDocs).toHaveBeenCalled()
		})

		expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
	})

	test('submits a resident review successfully', async () => {
		const alertSpy = jest
			.spyOn(window, 'alert')
			.mockImplementation(() => {})
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			text: async () => '',
		})

		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req-review',
				category: 'Pothole',
				status: 'resolved',
				description: 'Resolved pothole',
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
			expect(screen.getByText('Review')).toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Review'))

		await waitFor(() => {
			expect(screen.getByTestId('feedback-form')).toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Submit review'))

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalled()
		})

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/submit-review',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
					Authorization: 'Bearer fake-token',
				}),
				body: JSON.stringify({
					request_uid: 'req-review',
					rating: 5,
					comment: 'Great service',
				}),
			})
		)

		await waitFor(() => {
			expect(alertSpy).toHaveBeenCalledWith(
				'Review successfully submitted.'
			)
		})
	})

	test('handles resident review API JSON error response', async () => {
		const alertSpy = jest
			.spyOn(window, 'alert')
			.mockImplementation(() => {})

		global.fetch = jest.fn().mockResolvedValue({
			ok: false,
			text: async () =>
				JSON.stringify({ error: 'Review already exists' }),
		})

		const mockUser = { uid: 'user123' }
		const mockProfile = { uid: 'user123', name: 'John Doe' }
		const mockRequests = [
			{
				id: 'req-review-error',
				category: 'Pothole',
				status: 'resolved',
				description: 'Resolved pothole',
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
			expect(screen.getByText('Review')).toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Review'))

		await waitFor(() => {
			expect(screen.getByTestId('feedback-form')).toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Submit review'))

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalled()
		})

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/submit-review',
			expect.objectContaining({
				method: 'POST',
			})
		)

		await waitFor(() => {
			expect(alertSpy).toHaveBeenCalledWith('Review already exists')
		})
	})
})
