import React from 'react'
import { render, screen } from '@testing-library/react'
import PublicDashboard from '../pages/public_dashboard/public_dashboard'

// 1. MOCK REACT ROUTER DOM
jest.mock(
	'react-router-dom',
	() => ({
		Link: ({ children, to }) => (
			<a href={to} data-testid="mock-link">
				{children}
			</a>
		),
	}),
	{ virtual: true }
)

// 2. MOCK LEAFLET CORE
jest.mock(
	'leaflet',
	() => {
		const mockIcon = jest.fn()
		mockIcon.Default = {
			prototype: { _getIconUrl: jest.fn() },
			mergeOptions: jest.fn(),
		}
		return {
			Icon: mockIcon,
			latLngBounds: jest.fn(() => ({})),
		}
	},
	{ virtual: true }
)

// 3. MOCK REACT-LEAFLET
jest.mock(
	'react-leaflet',
	() => ({
		MapContainer: ({ children }) => (
			<div data-testid="map-container">{children}</div>
		),
		TileLayer: () => <div data-testid="tile-layer"></div>,
		Marker: ({ children }) => (
			<div data-testid="map-marker">{children}</div>
		),
		Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
		useMap: () => ({
			invalidateSize: jest.fn(),
			fitBounds: jest.fn(),
			removeLayer: jest.fn(),
		}),
	}),
	{ virtual: true }
)

// 4. MOCK ESRI-LEAFLET
// This empty mock prevents the import statement from crashing.
// The "safeEsri" safeguard inside the component handles the actual logic!
jest.mock('esri-leaflet', () => ({}), { virtual: true })

// 5. MOCK REQUEST CARD
jest.mock('../components/request_card.js', () => {
	return function MockRequestCard({ request }) {
		return (
			<div data-testid={`request-card-${request.status}`}>
				{request.category}
			</div>
		)
	}
})

describe('PublicDashboard Component', () => {
	it('renders the header and introduction text', () => {
		render(<PublicDashboard />)

		expect(
			screen.getByText('Community Service Dashboard')
		).toBeInTheDocument()
		expect(
			screen.getByText(
				/Browse open and recently resolved municipal service requests/i
			)
		).toBeInTheDocument()
		expect(screen.getByTestId('mock-link')).toBeInTheDocument()
	})

	it('calculates and displays the correct summary statistics', () => {
		render(<PublicDashboard />)

		// Use getAllByText and grab the first element ([0]) since the text
		// appears in both the summary cards and the section headings!

		const openStat = screen.getAllByText('Open Requests')[0].nextSibling
		expect(openStat).toHaveTextContent('4')

		const resolvedStat =
			screen.getAllByText('Recently Resolved')[0].nextSibling
		expect(resolvedStat).toHaveTextContent('3')

		// "Wards Affected" only appears once, so getByText is still safe here
		const wardsStat = screen.getByText('Wards Affected').nextSibling
		expect(wardsStat).toHaveTextContent('4')
	})

	it('renders the map container and legend', () => {
		render(<PublicDashboard />)

		expect(screen.getByTestId('map-container')).toBeInTheDocument()

		const markers = screen.getAllByTestId('map-marker')
		expect(markers.length).toBe(7)

		expect(screen.getByText('Open')).toBeInTheDocument()
		expect(screen.getByText('In Progress')).toBeInTheDocument()
		expect(screen.getByText('Resolved')).toBeInTheDocument()
	})

	it('renders the correct number of open and resolved request cards', () => {
		render(<PublicDashboard />)

		const openCards = screen.queryAllByTestId('request-card-Open')
		const inProgressCards = screen.queryAllByTestId(
			'request-card-In Progress'
		)
		const resolvedCards = screen.queryAllByTestId('request-card-Resolved')

		expect(openCards.length).toBe(2)
		expect(inProgressCards.length).toBe(2)
		expect(resolvedCards.length).toBe(3)
	})
})
