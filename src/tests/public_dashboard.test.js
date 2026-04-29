/* global jest */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Updated import paths with .js extensions
import PublicDashboard from '../pages/public_dashboard/public_dashboard.js'
import { fetchPublicDashboardData } from '../backend/public_dashboard_service.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks — Set up before importing the modules under test
───────────────────────────────────────────────────────────────────────────── */

// Mock CSS files
jest.mock('../pages/public_dashboard/public_dashboard.css', () => ({}))
jest.mock('leaflet/dist/leaflet.css', () => ({}))

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
	Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

// Mock the backend service
jest.mock('../backend/public_dashboard_service.js', () => ({
	fetchPublicDashboardData: jest.fn(),
}))

// Mock RequestCard to simplify the DOM and isolate dashboard logic
jest.mock('../components/request_card/request_card.js', () => {
	return function DummyRequestCard({ request }) {
		return (
			<div data-testid={`request-card-${request.id}`}>
				{request.category}
			</div>
		)
	}
})

// Mock Leaflet core to prevent JSDOM canvas/DOM crashes
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

// Mock esri-leaflet
jest.mock('esri-leaflet', () => ({
	featureLayer: jest.fn(() => ({
		bindPopup: jest.fn().mockReturnThis(),
		on: jest.fn().mockReturnThis(),
		addTo: jest.fn().mockReturnThis(),
		resetStyle: jest.fn(),
	})),
}))

// Mock React-Leaflet components
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

/* ─────────────────────────────────────────────────────────────────────────────
   Shared Fixtures
───────────────────────────────────────────────────────────────────────────── */

const mockDashboardData = {
	active: [
		{
			id: 'req_1',
			category: 'Pothole',
			status: 'IN_PROGRESS',
			latitude: -26.2,
			longitude: 28.0,
			ward: 'Ward 10',
		},
		{
			id: 'req_2',
			category: 'Water Leak',
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
			status: 'RESOLVED',
			latitude: -26.4,
			longitude: 28.2,
			ward: 'Ward 10',
		},
	],
	stats: {
		open_count: 2,
		resolved_count: 1,
		wards_affected: 2,
	},
}

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('PublicDashboard Component', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders the loading state initially', () => {
		// Return a promise that doesn't resolve immediately to keep it in loading state
		fetchPublicDashboardData.mockReturnValue(new Promise(() => {}))

		render(<PublicDashboard />)

		expect(
			screen.getByText('Loading service requests…')
		).toBeInTheDocument()
	})

	test('renders the error state if data fetching fails', async () => {
		// Temporarily silence console.error so our test output stays clean
		const consoleSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		fetchPublicDashboardData.mockRejectedValue(new Error('Network Error'))

		render(<PublicDashboard />)

		// Wait for the error message to appear after the promise rejects
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
		fetchPublicDashboardData.mockResolvedValue({
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

		// Check for empty state messages
		expect(
			screen.getByText('No active requests at this time.')
		).toBeInTheDocument()
		expect(
			screen.getByText('No resolved requests to show.')
		).toBeInTheDocument()

		// Check that stats are zero
		const statValues = screen.getAllByText('0')
		expect(statValues.length).toBe(3) // Open, Resolved, Wards
	})

	test('renders populated data and correctly maps child components', async () => {
		fetchPublicDashboardData.mockResolvedValue(mockDashboardData)

		render(<PublicDashboard />)

		await waitFor(() => {
			expect(
				screen.queryByText('Loading service requests…')
			).not.toBeInTheDocument()
		})

		// 1. Verify Header and Layout
		expect(
			screen.getByText('Community Service Dashboard')
		).toBeInTheDocument()

		// 2. Verify Stats Panel
		// FIX: Use getAllByText because both open_count and wards_affected equal 2
		const twos = screen.getAllByText('2')
		expect(twos.length).toBe(2)
		expect(screen.getByText('1')).toBeInTheDocument() // resolved_count

		// 3. Verify Active Requests rendering
		expect(screen.getByTestId('request-card-req_1')).toHaveTextContent(
			'Pothole'
		)
		expect(screen.getByTestId('request-card-req_2')).toHaveTextContent(
			'Water Leak'
		)

		// 4. Verify Resolved Requests rendering
		expect(screen.getByTestId('request-card-req_3')).toHaveTextContent(
			'Streetlight'
		)

		// 5. Verify Map Elements
		expect(screen.getByTestId('map-container')).toBeInTheDocument()
		expect(screen.getByTestId('tile-layer')).toBeInTheDocument()

		// 3 markers should be rendered (2 active + 1 resolved)
		const markers = screen.getAllByTestId('marker')
		expect(markers.length).toBe(3)
	})
})
