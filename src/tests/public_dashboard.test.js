/* global jest */
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { fetch_public_dashboard_visibility } from '../backend/public_dashboard_settings_service.js'
import { onAuthStateChanged } from 'firebase/auth'
import PublicDashboard from '../pages/public_dashboard/public_dashboard.js'
// ✅ Import the live-listener export, not the old one-shot fetch
import { subscribe_to_public_dashboard } from '../backend/public_dashboard_service.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../pages/public_dashboard/public_dashboard.css', () => ({}))
jest.mock('leaflet/dist/leaflet.css', () => ({}))

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	Link: ({ children, to }) => <a href={to}>{children}</a>,
	useNavigate: () => mockNavigate,
}))

jest.mock('../components/nav_bar/nav_bar.js', () => {
	return function DummyNavBar() {
		return <div data-testid="navbar">Mock Navbar</div>
	}
})

jest.mock('../firebase_config.js', () => ({
	auth: {},
	db: {},
}))

jest.mock('firebase/auth', () => ({
	getAuth: jest.fn(),
	onAuthStateChanged: jest.fn(),
	signOut: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
	...jest.requireActual('firebase/firestore'),
	getFirestore: jest.fn(),
	onSnapshot: jest.fn(() => jest.fn()),
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	orderBy: jest.fn(),
	limit: jest.fn(),
	doc: jest.fn(),
	getDoc: jest.fn(),
}))

// ✅ Mock the live-listener export instead of the old fetchPublicDashboardData
jest.mock('../backend/public_dashboard_service.js', () => ({
	subscribe_to_public_dashboard: jest.fn(),
}))

jest.mock('../components/request_card/request_card.js', () => {
	return function DummyRequestCard({ request, visibleFields }) {
		return (
			<div data-testid={`request-card-${request.id}`}>
				<span>{request.category}</span>
				{visibleFields?.description !== false && (
					<span>{request.description}</span>
				)}
			</div>
		)
	}
})

jest.mock('leaflet', () => {
	const LMock = {
		Icon: class {
			constructor() {}
		},
		latLngBounds: jest.fn(() => ({})),
	}
	LMock.Icon.Default = {
		prototype: { _getIconUrl: jest.fn() },
		mergeOptions: jest.fn(),
	}
	return LMock
})

jest.mock('esri-leaflet', () => ({
	featureLayer: jest.fn(() => ({
		bindPopup: jest.fn().mockReturnThis(),
		on: jest.fn().mockReturnThis(),
		addTo: jest.fn().mockReturnThis(),
		resetStyle: jest.fn(),
	})),
}))

jest.mock('react-leaflet', () => ({
	MapContainer: ({ children }) => (
		<div data-testid="map-container">{children}</div>
	),
	TileLayer: () => <div data-testid="tile-layer" />,
	Marker: ({ children }) => <div data-testid="marker">{children}</div>,
	Popup: ({ children }) => <div data-testid="popup">{children}</div>,
	useMap: () => ({
		invalidateSize: jest.fn(),
		fitBounds: jest.fn(),
		removeLayer: jest.fn(),
	}),
}))

jest.mock('../backend/public_dashboard_settings_service.js', () => ({
	fetch_public_dashboard_visibility: jest.fn(),
}))

/* ─────────────────────────────────────────────────────────────────────────────
   Fixtures
───────────────────────────────────────────────────────────────────────────── */

const mockDashboardData = {
	active: [
		{
			id: 'req_1',
			category: 'Pothole',
			description: 'Large pothole near school',
			status: 'IN_PROGRESS',
			latitude: -26.2,
			longitude: 28.0,
			ward: 'Ward 10',
		},
		{
			id: 'req_2',
			category: 'Water Leak',
			description: 'Pipe leaking outside house',
			status: 'UNASSIGNED',
			latitude: -26.3,
			longitude: 28.1,
			ward: 'Ward 11',
		},
	],
	resolved: [
		{
			id: 'req_3',
			category: 'Streetlight',
			description: 'Streetlight repaired',
			status: 'RESOLVED',
			latitude: -26.4,
			longitude: 28.2,
			ward: 'Ward 10',
		},
	],
	stats: { open_count: 2, resolved_count: 1, wards_affected: 2 },
}

const defaultVisibility = {
	category: true,
	status: true,
	ward: true,
	municipality: true,
	description: true,
	likes: true,
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

/**
 * Wires subscribe_to_public_dashboard to call on_update synchronously with
 * the given payload and return a no-op unsubscribe function.
 */
const mockLiveData = (payload) => {
	subscribe_to_public_dashboard.mockImplementation((on_update) => {
		on_update(payload)
		return jest.fn() // unsubscribe
	})
}

/**
 * Wires subscribe_to_public_dashboard to call on_error synchronously.
 */
const mockLiveError = (error) => {
	subscribe_to_public_dashboard.mockImplementation((_on_update, on_error) => {
		on_error(error)
		return jest.fn()
	})
}

/**
 * Wires subscribe_to_public_dashboard to never call either callback,
 * keeping the component in the loading state indefinitely.
 */
const mockLivePending = () => {
	subscribe_to_public_dashboard.mockImplementation(() => jest.fn())
}

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('PublicDashboard Component', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		fetch_public_dashboard_visibility.mockResolvedValue(defaultVisibility)

		onAuthStateChanged.mockImplementation((auth, callback) => {
			if (typeof callback === 'function') callback(null)
			return jest.fn()
		})
	})

	test('renders the loading state initially', () => {
		// Listener never fires → component stays in loading state
		mockLivePending()

		render(<PublicDashboard />)

		expect(
			screen.getByText('Loading service requests…')
		).toBeInTheDocument()
	})

	test('renders the error state if the live listener fires an error', async () => {
		const consoleSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		mockLiveError(new Error('Firestore unavailable'))

		render(<PublicDashboard />)

		await waitFor(() => {
			expect(
				screen.getByText(
					'Failed to load service requests. Please try again later.'
				)
			).toBeInTheDocument()
		})

		consoleSpy.mockRestore()
	})

	test('renders empty states when there are no active or resolved requests', async () => {
		mockLiveData({
			active: [],
			resolved: [],
			stats: { open_count: 0, resolved_count: 0, wards_affected: 0 },
		})

		render(<PublicDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading service requests…')
			).not.toBeInTheDocument()
		})

		expect(
			screen.getByText('No active requests match the selected filters.')
		).toBeInTheDocument()
		expect(
			screen.getByText('No resolved requests match the selected filters.')
		).toBeInTheDocument()

		const statValues = screen.getAllByText('0')
		expect(statValues.length).toBe(3)
	})

	test('renders populated data and correctly maps child components', async () => {
		mockLiveData(mockDashboardData)

		render(<PublicDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading service requests…')
			).not.toBeInTheDocument()
		})

		expect(
			screen.getByText('Community Service Dashboard')
		).toBeInTheDocument()

		const twos = screen.getAllByText('2')
		expect(twos.length).toBe(2)
		expect(screen.getByText('1')).toBeInTheDocument()

		expect(screen.getByTestId('request-card-req_1')).toHaveTextContent(
			'Pothole'
		)
		expect(screen.getByTestId('request-card-req_2')).toHaveTextContent(
			'Water Leak'
		)
		expect(screen.getByTestId('request-card-req_3')).toHaveTextContent(
			'Streetlight'
		)

		expect(screen.getByTestId('map-container')).toBeInTheDocument()
		expect(screen.getByTestId('tile-layer')).toBeInTheDocument()

		const markers = screen.getAllByTestId('marker')
		expect(markers.length).toBe(3)
	})

	test('loads public dashboard visibility settings and hides disabled fields', async () => {
		mockLiveData(mockDashboardData)
		fetch_public_dashboard_visibility.mockResolvedValue({
			...defaultVisibility,
			description: false,
		})

		render(<PublicDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading service requests…')
			).not.toBeInTheDocument()
		})

		expect(fetch_public_dashboard_visibility).toHaveBeenCalledTimes(1)

		expect(screen.getByTestId('request-card-req_1')).toHaveTextContent(
			'Pothole'
		)

		expect(
			screen.queryByText('Large pothole near school')
		).not.toBeInTheDocument()
		expect(
			screen.queryByText('Pipe leaking outside house')
		).not.toBeInTheDocument()
		expect(
			screen.queryByText('Streetlight repaired')
		).not.toBeInTheDocument()
	})

	test('unsubscribes from the live listener on unmount', () => {
		const mockUnsub = jest.fn()
		subscribe_to_public_dashboard.mockImplementation((on_update) => {
			on_update(mockDashboardData)
			return mockUnsub
		})

		const { unmount } = render(<PublicDashboard />)
		unmount()

		expect(mockUnsub).toHaveBeenCalledTimes(1)
	})

	test('re-renders automatically when the listener pushes a new snapshot', async () => {
		let capturedOnUpdate

		subscribe_to_public_dashboard.mockImplementation((on_update) => {
			capturedOnUpdate = on_update
			// Fire an initial empty payload so loading ends
			on_update({
				active: [],
				resolved: [],
				stats: { open_count: 0, resolved_count: 0, wards_affected: 0 },
			})
			return jest.fn()
		})

		render(<PublicDashboard />)

		await waitFor(() =>
			expect(
				screen.queryByText('Loading service requests…')
			).not.toBeInTheDocument()
		)

		// Simulate Firestore pushing a live update
		act(() => {
			capturedOnUpdate(mockDashboardData)
		})

		expect(screen.getByTestId('request-card-req_1')).toBeInTheDocument()
		expect(screen.getByTestId('request-card-req_2')).toBeInTheDocument()
	})
})