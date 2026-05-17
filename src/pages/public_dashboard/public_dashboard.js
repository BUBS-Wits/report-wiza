import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase_config.js'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import RequestCard from '../../components/request_card/request_card.js'
import { fetchPublicDashboardData } from '../../backend/public_dashboard_service.js'
import { fetch_public_dashboard_visibility } from '../../backend/public_dashboard_settings_service.js'
import './public_dashboard.css'
import Navbar from '../../components/nav_bar/nav_bar.js'
import * as esri from 'esri-leaflet'

// --- SAFEGUARD FOR JEST TESTING ---
let safeEsri = esri
if (process.env.NODE_ENV === 'test') {
	const dummyLayer = {
		resetStyle: () => {},
	}
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
		if (!requests || !requests.length) {
			return
		}
		const validRequests = requests.filter(
			(r) =>
				typeof r.latitude === 'number' &&
				isFinite(r.latitude) &&
				typeof r.longitude === 'number' &&
				isFinite(r.longitude)
		)
		if (!validRequests.length) {
			return
		}
		try {
			const bounds = L.latLngBounds(
				validRequests.map((r) => [r.latitude, r.longitude])
			)
			if (bounds.isValid()) {
				map.fitBounds(bounds, { padding: [40, 40] })
			}
		} catch (e) {
			// ignore
		}
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
	const [visibleFields, setVisibleFields] = useState({
		category: true,
		status: true,
		ward: true,
		municipality: true,
		description: true,
		likes: true,
	})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const navigate = useNavigate()
	const [homeRoute, setHomeRoute] = useState('/')

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				setHomeRoute('/')
				return
			}
			try {
				const snap = await getDoc(doc(db, 'users', user.uid))
				const role = snap.data()?.role
				if (role === 'worker') {
					setHomeRoute('/worker-dashboard')
				} else if (role === 'resident') {
					setHomeRoute('/resident-dashboard')
				} else if (role === 'admin') {
					setHomeRoute('/admin')
				} else {
					setHomeRoute('/')
				}
			} catch {
				setHomeRoute('/')
			}
		})
		return () => unsub()
	}, [])

	useEffect(() => {
		Promise.all([
			fetchPublicDashboardData(),
			fetch_public_dashboard_visibility(),
		])
			.then(([{ active, resolved, stats }, visibility]) => {
				setActive(active)
				setResolved(resolved)
				setStats(stats)
				setVisibleFields(visibility)
			})
			.catch((err) => {
				console.error('Failed to load dashboard data:', err)
				setError(
					'Failed to load service requests. Please try again later.'
				)
			})
			.finally(() => setLoading(false))
	}, [])

	// NEW: function to refresh the whole dashboard after a like
	const refreshDashboard = useCallback(async () => {
		try {
			const { active, resolved, stats } = await fetchPublicDashboardData()
			setActive(active)
			setResolved(resolved)
			setStats(stats)
		} catch (err) {
			console.error('Failed to refresh dashboard data:', err)
		}
	}, [])

	const allRequests = [...active, ...resolved]
	const mapRequests = allRequests.filter(
		(r) =>
			typeof r.latitude === 'number' &&
			isFinite(r.latitude) &&
			typeof r.longitude === 'number' &&
			isFinite(r.longitude)
	)

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
			<Navbar />
			<header className="dashboard_header">
				<Link to={homeRoute} className="home_button">
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
					<span className="summary_value">{stats.open_count}</span>
				</div>
				<div className="summary_card">
					<span className="summary_label">Recently Resolved</span>
					<span className="summary_value">
						{stats.resolved_count}
					</span>
				</div>
				<div className="summary_card">
					<span className="summary_label">Wards Affected</span>
					<span className="summary_value">
						{stats.wards_affected}
					</span>
				</div>
			</section>

			{/* Map section only renders when there are valid coordinates */}
			{mapRequests.length > 0 && (
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
							<FitMapToRequests requests={mapRequests} />
							<TileLayer
								attribution="&copy; OpenStreetMap contributors"
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							/>
							{mapRequests.map((request) => (
								<Marker
									key={request.id}
									position={[
										request.latitude,
										request.longitude,
									]}
									icon={getStatusIcon(request.status)}
								>
									<Popup>
										<div>
											{visibleFields.category && (
											<>
												<strong>
													{request.category}
												</strong>
													<br />
												</>
										)}
										{visibleFields.status && (
											<>
												Status: {request.status}
													<br />
												</>
										)}
										{visibleFields.ward && (
											<>
												{request.ward}
													<br />
												</>
										)}
										{visibleFields.municipality && (
											<>
												{request.municipality}
													<br />
												</>
										)}
										{visibleFields.description &&
											request.description}
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
			)}

			<section className="dashboard_section">
				<div className="section_heading_row">
					<h2>Open Requests</h2>
					<span className="section_note">
						Currently active issues
					</span>
				</div>
				<div className="request_list">
					{active.length > 0 ? (
						active.map((request) => (
							<RequestCard
								key={request.id}
								request={request}
								visibleFields={visibleFields}
							/>
						))
					) : (
						<p className="empty_state">
							No active requests at this time.
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
					{resolved.length > 0 ? (
						resolved.map((request) => (
							<RequestCard
								key={request.id}
								request={request}
								visibleFields={visibleFields}
							/>
						))
					) : (
						<p className="empty_state">
							No resolved requests to show.
						</p>
					)}
				</div>
			</section>
		</div>
	)
}

export default PublicDashboard
