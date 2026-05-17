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

/* ── Mocks ───────────────────────────────────────────────────────────────── */

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

// Mock the feedback form to immediately simulate a submission/cancellation
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
					<button onClick={onCancel}>Cancel Review</button>
				</div>
			)
		}
)

/* ── Test Setup ──────────────────────────────────────────────────────────── */

describe('ResidentDashboard Component', () => {
	let mockNavigate
	const originalFetch = global.fetch
	const originalAlert = window.alert
	const originalConsoleError = console.error

	beforeAll(() => {
		global.fetch = jest.fn()
		window.alert = jest.fn()
		console.error = jest.fn() // Suppress expected error logs
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

	/* ── 1. Initialization and Error Handling ── */

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

		// Test ErrorScreen "Try again"
		fireEvent.click(screen.getByText('Try again'))
		expect(mockNavigate).toHaveBeenCalledWith('/login')

		// Test ErrorScreen "Go back Home"
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

	/* ── 2. Empty States and Topbar Functions ── */

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
		expect(screen.getByText('JD')).toBeInTheDocument() // Initials helper verification

		// Test Logout
		signOut.mockResolvedValue()
		const logoutBtn = screen.getByLabelText('Log out')
		fireEvent.click(logoutBtn)

		expect(screen.getByText('Logging out…')).toBeInTheDocument()
		await waitFor(() => {
			expect(signOut).toHaveBeenCalled()
			expect(mockNavigate).toHaveBeenCalledWith('/')
		})
	})

	/* ── 3. Profile & Request Loading ── */

	test('loads and displays resident profile, unread count, and selects first request', async () => {
		onAuthStateChanged.mockImplementation((auth, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})

		// Use `name: null` instead of `name: ''` to properly trigger the `?? 'Resident'` fallback in the UI
		fetch_resident_profile.mockResolvedValue({ uid: 'user123', name: null })

		// Include a mix of weird/missing fields to cover fallbacks
		const mockRequests = [
			{
				id: 'req1',
				category: 'Pothole',
				status: 'submitted',
				description: 'Big pothole',
				created_at: { toDate: () => new Date('2023-01-01') }, // Firestore Timestamp format
				updated_at: null, // Null date test
				sa_ward: 'Ward 10',
			},
			{
				id: 'req2',
				category: 'Water Leak',
				status: 'unknown_status', // Unmapped status test
				priority: 'Unknown Priority', // Unmapped priority test
				description: 'Leaking pipe',
				created_at: new Date('2023-01-02'), // Standard JS Date format
				worker_uid: 'worker1',
				worker_name: 'Bob',
			},
		]

		fetch_resident_requests.mockResolvedValue(mockRequests)
		subscribe_to_resident_unread_count.mockImplementation((uid, cb) => {
			cb(5) // Unread count
			return jest.fn()
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		// Unread Badge Check (Wrapped in waitFor to allow async React rendering)
		await waitFor(() => {
			expect(screen.getByText('5')).toBeInTheDocument()
		})

		// Fallback names/dates check
		expect(screen.getAllByText('Resident').length).toBeGreaterThan(0) // Fallback name
		expect(screen.getAllByText('—').length).toBeGreaterThan(0) // Null date fallback

		// Select the second card
		const secondCard = screen
			.getAllByText('Water Leak')[0]
			.closest('button')
		fireEvent.click(secondCard)

		await waitFor(() => {
			// Priority fallback -> 'Not set'
			expect(screen.getByText('Not set')).toBeInTheDocument()
			expect(screen.getByText('Bob')).toBeInTheDocument()
		})

		// Test Back Button
		fireEvent.click(screen.getByLabelText('Back to requests'))
		expect(
			screen.getByText('Select a request to view details and messages.')
		).toBeInTheDocument()
	})

	/* ── 4. Complex Field Processing (Images, Locations, Reviews, Close Reasons) ── */

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
				priority: 'Critical',
				description: 'Fixing road',
				location: 'POINT(28.0583 -26.2309)', // Valid WKT String
				image: 'http://expired.com/img.jpg?X-Amz-Date=20000101T000000Z&X-Amz-Expires=3600',
				image_expires_at: new Date('2000-01-01').toISOString(), // Purposely expired
				rating: 3,
				comment: 'Decent job',
			},
		]
		fetch_resident_requests.mockResolvedValue(reqs)

		// Mock a successful signed URL fetch with Amazon headers
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: 'http://signed.com/img.jpg?X-Amz-Date=20260516T095040Z&X-Amz-Expires=432000',
			}),
		})

		// Mock Close Reason fetch
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

		// Ensure location was parsed correctly into a link (Note: rendered as lat, lon)
		const locLink = screen.getByRole('link', {
			name: /-26\.230900,\s*28\.058300/i,
		})
		expect(locLink).toBeInTheDocument()

		// Ensure signed URL was fetched
		expect(global.fetch).toHaveBeenCalledWith(
			'/api/get-signed-url?request_uid=req1'
		)

		// Ensure close reason is displayed
		await waitFor(() => {
			expect(screen.getByText('Patch applied.')).toBeInTheDocument()
		})

		// Ensure StarRating rendered 'Good' for a rating of 3
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

		// 1 hour in the future = not expired
		const futureDate = new Date()
		futureDate.setHours(futureDate.getHours() + 1)

		const reqs = [
			{
				id: 'req1',
				status: 'in_progress',
				location: 'POINT(INVALID_DATA)', // Bad string
				// Valid AWS formatted URL
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

		// Fetch shouldn't trigger because image isn't expired
		expect(global.fetch).not.toHaveBeenCalled()
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
				image: 'http://expired.com/img.jpg?X-Amz-Date=20000101T000000Z&X-Amz-Expires=3600',
				image_expires_at: new Date('2000-01-01').toISOString(), // Purposely expired
			},
		]
		fetch_resident_requests.mockResolvedValue(reqs)

		// Mock a FAILED signed URL fetch
		global.fetch.mockResolvedValueOnce({
			ok: false,
		})

		render(<ResidentDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		})

		// Ensure fallback image is used
		const img = screen.getByAltText('Request')
		expect(img).toHaveAttribute(
			'src',
			'http://expired.com/img.jpg?X-Amz-Date=20000101T000000Z&X-Amz-Expires=3600'
		)
	})

	/* ── 5. Feedback Form API Handling ── */

	test('submits feedback successfully with auth', async () => {
		onAuthStateChanged.mockImplementation((authObj, callback) => {
			callback({ uid: 'user123' })
			return jest.fn()
		})
		fetch_resident_profile.mockResolvedValue({ uid: 'user123' })
		fetch_resident_requests.mockResolvedValue([
			{ id: 'req1', status: 'resolved' },
		])

		// Mock auth token
		auth.currentUser = {
			getIdToken: jest.fn().mockResolvedValue('mock_token'),
		}

		// Mock successful API response
		global.fetch.mockResolvedValueOnce({ ok: true })

		render(<ResidentDashboard />)

		await waitFor(() =>
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		)

		// Open feedback form and submit it
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

		// Force auth.currentUser to null
		auth.currentUser = null

		global.fetch.mockResolvedValueOnce({ ok: true })

		render(<ResidentDashboard />)
		await waitFor(() =>
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		)

		fireEvent.click(screen.getByText('Review'))
		fireEvent.click(screen.getByText('Submit Mock Review'))

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				'/api/submit-review',
				expect.objectContaining({
					headers: { 'Content-Type': 'application/json' }, // No auth header
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

		// Mock JSON API error
		global.fetch.mockResolvedValueOnce({
			ok: false,
			text: async () => JSON.stringify({ error: 'JSON error message' }),
		})

		render(<ResidentDashboard />)

		await waitFor(() =>
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		)

		fireEvent.click(screen.getByText('Review'))
		fireEvent.click(screen.getByText('Submit Mock Review'))

		await waitFor(() => {
			expect(window.alert).toHaveBeenCalledWith('JSON error message')
		})
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

		// Mock HTML/Text API error (Invalid JSON)
		global.fetch.mockResolvedValueOnce({
			ok: false,
			text: async () => '<html>502 Bad Gateway</html>',
		})

		render(<ResidentDashboard />)

		await waitFor(() =>
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		)

		fireEvent.click(screen.getByText('Review'))
		fireEvent.click(screen.getByText('Submit Mock Review'))

		await waitFor(() => {
			expect(window.alert).toHaveBeenCalledWith(
				'Server error. Please check console for details.'
			)
		})
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

		// Mock outright promise rejection
		global.fetch.mockRejectedValueOnce(new Error('Fetch failed'))

		render(<ResidentDashboard />)

		await waitFor(() =>
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		)

		fireEvent.click(screen.getByText('Review'))
		fireEvent.click(screen.getByText('Submit Mock Review'))

		await waitFor(() => {
			expect(window.alert).toHaveBeenCalledWith('Error: ', 'Fetch failed')
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

		// Fail the close reason fetch
		getDocs.mockRejectedValueOnce(new Error('Permissions denied'))

		render(<ResidentDashboard />)

		await waitFor(() =>
			expect(
				screen.queryByText('Loading your dashboard…')
			).not.toBeInTheDocument()
		)

		// The fallback "—" should be rendered multiple times, verify at least one exists
		await waitFor(() => {
			expect(screen.getAllByText('—').length).toBeGreaterThan(0)
		})
	})
})
