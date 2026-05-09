import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import RequestCard from '../../components/request_card/request_card.js'
import { fetchPublicDashboardData } from '../../backend/public_dashboard_service.js'
import './public_dashboard.css'
import * as esri from 'esri-leaflet'

// --- SAFEGUARD FOR JEST TESTING ---
let safeEsri = esri
if (process.env.NODE_ENV === 'test') {
	const dummyLayer = {
		resetStyle: () => {},
	}
	// Return dummyLayer to allow method chaining safely
	dummyLayer.bindPopup = () => dummyLayer
	dummyLayer.on = () => dummyLayer
	dummyLayer.addTo = () => dummyLayer

	safeEsri = {
		featureLayer: () => dummyLayer,
	}
}

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const openIcon = new L.Icon({
	iconUrl:
		'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
})

const inProgressIcon = new L.Icon({
	iconUrl:
		'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
})

const resolvedIcon = new L.Icon({
	iconUrl:
		'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
})

function FixMapSize() {
	const map = useMap()
	useEffect(() => {
		setTimeout(() => map.invalidateSize(), 100)
	}, [map])
	return null
}

function WardBoundaries() {
	const map = useMap()
	useEffect(() => {
		const wardLayer = safeEsri
			.featureLayer({
				url: 'https://services7.arcgis.com/oeoyTUJC8HEeYsRB/arcgis/rest/services/SA_Wards2020/FeatureServer/0',
				style: () => ({
					color: '#f59e0b',
					weight: 2,
					fillColor: '#f59e0b',
					fillOpacity: 0.08,
				}),
			})
			.bindPopup((layer) => {
				const props = layer.feature?.properties || {}
				return `
          <div>
            <strong>${props.WardLabel || `Ward ${props.WardNo || 'Unknown'}`}</strong><br />
            Ward Number: ${props.WardNo || 'N/A'}<br />
            Municipality: ${props.Municipali || 'N/A'}<br />
            Province: ${props.Province || 'N/A'}
          </div>
        `
			})
			.on('mouseover', (event) => {
				event.layer.setStyle({ weight: 6, fillOpacity: 0.18 })
			})
			.on('mouseout', (event) => {
				wardLayer.resetStyle(event.layer)
			})
			.addTo(map)
		return () => map.removeLayer(wardLayer)
	}, [map])
	return null
}

function FitMapToRequests({ requests }) {
	const map = useMap()
	useEffect(() => {
		if (!requests.length) {
			return
		}
		const bounds = L.latLngBounds(
			requests.map((r) => [r.latitude, r.longitude])
		)
		map.fitBounds(bounds, { padding: [40, 40] })
	}, [map, requests])
	return null
}

function getStatusIcon(status) {
	switch (status) {
		case 'SUBMITTED':
		case 'UNASSIGNED':
			return openIcon
		case 'ASSIGNED':
		case 'IN_PROGRESS':
			return inProgressIcon
		case 'RESOLVED':
			return resolvedIcon
		default:
			return inProgressIcon
	}
}

function PublicDashboard() {
	const [active, setActive] = useState([])
	const [resolved, setResolved] = useState([])
	const [stats, setStats] = useState({
		open_count: 0,
		resolved_count: 0,
		wards_affected: 0,
	})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [categoryFilter, setCategoryFilter] = useState('All')
	const [wardFilter, setWardFilter] = useState('All')
	const [statusFilter, setStatusFilter] = useState('All')

	useEffect(() => {
		fetchPublicDashboardData()
			.then(({ active, resolved, stats }) => {
				setActive(active)
				setResolved(resolved)
				setStats(stats)
			})
			.catch((err) => {
				console.error('Failed to load dashboard data:', err)
				setError(
					'Failed to load service requests. Please try again later.'
				)
			})
			.finally(() => setLoading(false))
	}, [])

	const allRequests = [...active, ...resolved]

	const categories = ['All', ...new Set(allRequests.map((r) => r.category))]
	const wards = ['All', ...new Set(allRequests.map((r) => r.ward))]
	const statuses = ['All', ...new Set(allRequests.map((r) => r.status))]

	const matchesFilters = (request) => {
		const categoryMatches =
			categoryFilter === 'All' || request.category === categoryFilter
		const wardMatches = wardFilter === 'All' || request.ward === wardFilter
		const statusMatches =
			statusFilter === 'All' || request.status === statusFilter

		return categoryMatches && wardMatches && statusMatches
	}

	const filteredActive = active.filter(matchesFilters)
	const filteredResolved = resolved.filter(matchesFilters)
	const filteredRequests = [...filteredActive, ...filteredResolved]

	const filteredWardsAffected = new Set(
		filteredRequests.map((request) => request.ward)
	).size

	const hasActiveFilters =
		categoryFilter !== 'All' || wardFilter !== 'All' || statusFilter !== 'All'

	const clearFilters = () => {
		setCategoryFilter('All')
		setWardFilter('All')
		setStatusFilter('All')
	}

	if (loading) {
		return (
			<div className="public_dashboard">
				<div className="dashboard_loading">
					<p>Loading service requests…</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="public_dashboard">
				<div className="dashboard_error">
					<p>{error}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="public_dashboard">
			<header className="dashboard_header">
				<Link to="/" className="home_button">
					🏠 Home
				</Link>
				<p className="dashboard_eyebrow">Public Municipal Dashboard</p>
				<h1>Community Service Dashboard</h1>
				<p className="dashboard_intro">
					Browse open and recently resolved municipal service requests
					in your community. This dashboard is publicly accessible and
					read-only.
				</p>
			</header>

			<section className="summary_grid">
				<div className="summary_card">
					<span className="summary_label">Open Requests</span>
					<span className="summary_value">
						{hasActiveFilters
							? filteredActive.length
							: stats.open_count}
					</span>
				</div>
				<div className="summary_card">
					<span className="summary_label">Recently Resolved</span>
					<span className="summary_value">
						{hasActiveFilters
							? filteredResolved.length
							: stats.resolved_count}
					</span>
				</div>
				<div className="summary_card">
					<span className="summary_label">Wards Affected</span>
					<span className="summary_value">
						{hasActiveFilters
							? filteredWardsAffected
							: stats.wards_affected}
					</span>
				</div>
			</section>

			<section className="filter_section">
				<div className="section_heading_row">
					<h2>Filter Dashboard</h2>
					{hasActiveFilters && (
						<button
							className="clear_filters_btn"
							onClick={clearFilters}
						>
							Clear filters
						</button>
					)}
				</div>

				<div className="filter_grid">
					<label className="filter_control">
						<span>Category</span>
						<select
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value)}
						>
							{categories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</label>

					<label className="filter_control">
						<span>Ward</span>
						<select
							value={wardFilter}
							onChange={(e) => setWardFilter(e.target.value)}
						>
							{wards.map((ward) => (
								<option key={ward} value={ward}>
									{ward}
								</option>
							))}
						</select>
					</label>

					<label className="filter_control">
						<span>Status</span>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
						>
							{statuses.map((status) => (
								<option key={status} value={status}>
									{status}
								</option>
							))}
						</select>
					</label>
				</div>

				<p className="filter_result_text">
					Showing {filteredRequests.length} of {allRequests.length}{' '}
					requests.
				</p>
			</section>

			<section className="map_section">
				<div className="section_heading_row">
					<h2>Ward Map Overview</h2>
				</div>
				<div className="map_container">
					<MapContainer
						center={[-26.2041, 28.0473]}
						zoom={13}
						scrollWheelZoom={true}
						className="leaflet_map"
					>
						<FixMapSize />
						<WardBoundaries />
						<FitMapToRequests requests={filteredRequests} />
						<TileLayer
							attribution="&copy; OpenStreetMap contributors"
							url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
						/>
						{filteredRequests.map((request) => (
							<Marker
								key={request.id}
								position={[request.latitude, request.longitude]}
								icon={getStatusIcon(request.status)}
							>
								<Popup>
									<div>
										<strong>{request.category}</strong>
										<br />
										Status: {request.status}
										<br />
										{request.ward}
										<br />
										{request.municipality}
										<br />
										{request.description}
									</div>
								</Popup>
							</Marker>
						))}
					</MapContainer>
					<div className="map_legend">
						<div className="legend_item">
							<span className="legend_dot legend_open"></span>
							<span>Open</span>
						</div>
						<div className="legend_item">
							<span className="legend_dot legend_progress"></span>
							<span>In Progress</span>
						</div>
						<div className="legend_item">
							<span className="legend_dot legend_resolved"></span>
							<span>Resolved</span>
						</div>
					</div>
				</div>
			</section>

			<section className="dashboard_section">
				<div className="section_heading_row">
					<h2>Open Requests</h2>
					<span className="section_note">
						Currently active issues
					</span>
				</div>
				<div className="request_list">
					{filteredActive.length > 0 ? (
						filteredActive.map((request) => (
							<RequestCard key={request.id} request={request} />
						))
					) : (
						<p className="empty_state">
							No active requests match the selected filters.
						</p>
					)}
				</div>
			</section>

			<section className="dashboard_section">
				<div className="section_heading_row">
					<h2>Recently Resolved</h2>
					<span className="section_note">
						Latest completed issues
					</span>
				</div>
				<div className="request_list">
					{filteredResolved.length > 0 ? (
						filteredResolved.map((request) => (
							<RequestCard key={request.id} request={request} />
						))
					) : (
						<p className="empty_state">
							No resolved requests match the selected filters.
						</p>
					)}
				</div>
			</section>
		</div>
	)
}

export default PublicDashboard