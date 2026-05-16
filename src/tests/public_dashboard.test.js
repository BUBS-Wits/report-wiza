/* global jest */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { onAuthStateChanged } from 'firebase/auth'

import PublicDashboard from '../pages/public_dashboard/public_dashboard.js'
import { fetchPublicDashboardData } from '../backend/public_dashboard_service.js'

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

jest.mock('../backend/public_dashboard_service.js', () => ({
	fetchPublicDashboardData: jest.fn(),
}))

jest.mock('../components/request_card/request_card.js', () => {
	return function DummyRequestCard({ request }) {
		return (
			<div data-testid={`request-card-${request.id}`}>
				{request.category}
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

const mockDashboardData = {
	active: [
		{
			id: 'req_1',
			category: 'Pothole',
			status: 'IN_PROGRESS',
			latitude: -26.2,
			longitude: 28.0,
			ward: 'Ward 10',
			municipality: 'Metro A',
			description: 'Large pothole near school',
		},
		{
			id: 'req_2',
			category: 'Water Leak',
			status: 'UNASSIGNED',
			latitude: -26.3,
			longitude: 28.1,
			ward: 'Ward 11',
			municipality: 'Metro B',
			description: 'Water leaking from pipe',
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
			municipality: 'Metro A',
			description: 'Streetlight repaired',
		},
	],
	stats: {
		open_count: 2,
		resolved_count: 1,
		wards_affected: 2,
	},
}

const renderLoadedDashboard = async (data = mockDashboardData) => {
	fetchPublicDashboardData.mockResolvedValue(data)

	render(<PublicDashboard />)

	await waitFor(() => {
		expect(
			screen.queryByText('Loading service requests…')
		).not.toBeInTheDocument()
	})
}

describe('PublicDashboard Component', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		onAuthStateChanged.mockImplementation((auth, callback) => {
			if (typeof callback === 'function') {
				callback(null)
			}
			return jest.fn()
		})
	})

	test('renders the loading state initially', () => {
		fetchPublicDashboardData.mockReturnValue(new Promise(() => {}))

		render(<PublicDashboard />)

		expect(
			screen.getByText('Loading service requests…')
		).toBeInTheDocument()
	})

	test('renders the error state if data fetching fails', async () => {
		const consoleSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		fetchPublicDashboardData.mockRejectedValue(new Error('Network Error'))

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
		await renderLoadedDashboard({
			active: [],
			resolved: [],
			stats: { open_count: 0, resolved_count: 0, wards_affected: 0 },
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
		await renderLoadedDashboard()

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

	test('renders filter controls for category, ward, and status', async () => {
		await renderLoadedDashboard()

		expect(screen.getByText('Filter Dashboard')).toBeInTheDocument()
		expect(screen.getByLabelText('Category')).toBeInTheDocument()
		expect(screen.getByLabelText('Ward')).toBeInTheDocument()
		expect(screen.getByLabelText('Status')).toBeInTheDocument()
		expect(screen.getByText('Showing 3 of 3 requests.')).toBeInTheDocument()
	})

	test('filters the public dashboard by category', async () => {
		await renderLoadedDashboard()

		fireEvent.change(screen.getByLabelText('Category'), {
			target: { value: 'Pothole' },
		})

		expect(screen.getByTestId('request-card-req_1')).toBeInTheDocument()
		expect(
			screen.queryByTestId('request-card-req_2')
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId('request-card-req_3')
		).not.toBeInTheDocument()
		expect(screen.getByText('Showing 1 of 3 requests.')).toBeInTheDocument()
		expect(screen.getAllByTestId('marker').length).toBe(1)
	})

	test('filters the public dashboard by ward', async () => {
		await renderLoadedDashboard()

		fireEvent.change(screen.getByLabelText('Ward'), {
			target: { value: 'Ward 10' },
		})

		expect(screen.getByTestId('request-card-req_1')).toBeInTheDocument()
		expect(
			screen.queryByTestId('request-card-req_2')
		).not.toBeInTheDocument()
		expect(screen.getByTestId('request-card-req_3')).toBeInTheDocument()
		expect(screen.getByText('Showing 2 of 3 requests.')).toBeInTheDocument()
		expect(screen.getAllByTestId('marker').length).toBe(2)
	})

	test('filters the public dashboard by status', async () => {
		await renderLoadedDashboard()

		fireEvent.change(screen.getByLabelText('Status'), {
			target: { value: 'RESOLVED' },
		})

		expect(
			screen.queryByTestId('request-card-req_1')
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId('request-card-req_2')
		).not.toBeInTheDocument()
		expect(screen.getByTestId('request-card-req_3')).toBeInTheDocument()
		expect(screen.getByText('Showing 1 of 3 requests.')).toBeInTheDocument()
		expect(screen.getAllByTestId('marker').length).toBe(1)
	})

	test('clears active filters and restores all public requests', async () => {
		await renderLoadedDashboard()

		fireEvent.change(screen.getByLabelText('Category'), {
			target: { value: 'Pothole' },
		})

		expect(
			screen.queryByTestId('request-card-req_2')
		).not.toBeInTheDocument()
		expect(screen.getByText('Clear filters')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Clear filters'))

		expect(screen.getByTestId('request-card-req_1')).toBeInTheDocument()
		expect(screen.getByTestId('request-card-req_2')).toBeInTheDocument()
		expect(screen.getByTestId('request-card-req_3')).toBeInTheDocument()
		expect(screen.getByText('Showing 3 of 3 requests.')).toBeInTheDocument()
		expect(screen.getAllByTestId('marker').length).toBe(3)
	})

	test('displays readable status filter labels for different public request statuses', async () => {
		await renderLoadedDashboard({
			active: [
				{
					id: 'req_open',
					category: 'Road',
					status: 'open',
					latitude: -26.1,
					longitude: 28.1,
					ward: 'Ward 1',
					municipality: 'Metro A',
					description: 'Open road issue',
				},
				{
					id: 'req_ack',
					category: 'Water',
					status: 'acknowledged',
					latitude: -26.2,
					longitude: 28.2,
					ward: 'Ward 2',
					municipality: 'Metro A',
					description: 'Acknowledged water issue',
				},
				{
					id: 'req_progress',
					category: 'Electricity',
					status: 'in_progress',
					latitude: -26.3,
					longitude: 28.3,
					ward: 'Ward 3',
					municipality: 'Metro B',
					description: 'In progress electricity issue',
				},
				{
					id: 'req_custom',
					category: 'Other',
					status: 'custom_status',
					latitude: -26.4,
					longitude: 28.4,
					ward: 'Ward 4',
					municipality: 'Metro C',
					description: 'Custom status issue',
				},
			],
			resolved: [
				{
					id: 'req_closed',
					category: 'Waste',
					status: 'closed',
					latitude: -26.5,
					longitude: 28.5,
					ward: 'Ward 5',
					municipality: 'Metro D',
					description: 'Closed waste issue',
				},
			],
			stats: {
				open_count: 4,
				resolved_count: 1,
				wards_affected: 5,
			},
		})

		expect(
			screen.getByRole('option', { name: 'Submitted' })
		).toBeInTheDocument()
		expect(
			screen.getByRole('option', { name: 'Assigned' })
		).toBeInTheDocument()
		expect(
			screen.getByRole('option', { name: 'In Progress' })
		).toBeInTheDocument()
		expect(
			screen.getByRole('option', { name: 'Closed' })
		).toBeInTheDocument()
		expect(
			screen.getByRole('option', { name: 'custom_status' })
		).toBeInTheDocument()

		expect(screen.getAllByTestId('marker').length).toBe(5)
	})
})
