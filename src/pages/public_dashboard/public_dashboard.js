import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import RequestCard from '../../components/request_card/request_card.js'
import './public_dashboard.css'
import * as esri from 'esri-leaflet'
import { db } from '../../firebase_config.js'
import { collection, getDocs } from 'firebase/firestore'

// --- Helper to parse SRID=4326;POINT(lon lat) ---
function parseWktPoint(locationStr) {
	if (!locationStr) {
		return null
	}
	const match = locationStr.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i)
	if (match) {
		const lon = parseFloat(match[1])
		const lat = parseFloat(match[2])
		if (!isNaN(lat) && !isNaN(lon)) {
			return { lat, lon }
		}
	}
	return null
}

// --- Safeguard for Jest testing (keep as is) ---
let safeEsri = esri
if (process.env.NODE_ENV === 'test') {
	const dummyLayer = {
		bindPopup: () => this,
		on: () => this,
		addTo: () => this,
		resetStyle: () => {},
	}
	safeEsri = {
		featureLayer: () => dummyLayer,
	}
}

// --- Leaflet icon configuration (keep as is) ---
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
		const validRequests = requests.filter((r) => {
			if (r.latitude && r.longitude) {
				return true
			}
			const coords = parseWktPoint(r.location)
			return coords !== null
		})
		if (validRequests.length === 0) {
			return
		}
		const bounds = L.latLngBounds(
			validRequests.map((r) => {
				if (r.latitude && r.longitude) {
					return [r.latitude, r.longitude]
				}
				const coords = parseWktPoint(r.location)
				return [coords.lat, coords.lon]
			})
		)
		map.fitBounds(bounds, { padding: [40, 40] })
	}, [map, requests])
	return null
}

function getStatusIcon(status) {
	const s = status?.toLowerCase()
	if (s === 'open') {
		return openIcon
	}
	if (s === 'in progress') {
		return inProgressIcon
	}
	if (s === 'resolved') {
		return resolvedIcon
	}
	return inProgressIcon
}

function PublicDashboard() {
	const [openRequests, setOpenRequests] = useState([])
	const [resolvedRequests, setResolvedRequests] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		const fetchRequests = async () => {
			try {
				const snapshot = await getDocs(
					collection(db, 'service_requests')
				)
				const all = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
				}))
				const open = all.filter(
					(req) => req.status?.toLowerCase() !== 'resolved'
				)
				const resolved = all.filter(
					(req) => req.status?.toLowerCase() === 'resolved'
				)
				setOpenRequests(open)
				setResolvedRequests(resolved)
			} catch (err) {
				console.error('Failed to load service requests:', err)
				setError('Could not load requests. Please try again later.')
			} finally {
				setLoading(false)
			}
		}
		fetchRequests()
	}, [])

	const allRequests = [...openRequests, ...resolvedRequests]
	const wardsAffected = new Set(
		allRequests.map((req) => req.ward).filter(Boolean)
	).size

	if (loading) {
		return (
			<div className="public_dashboard_loading">Loading dashboard...</div>
		)
	}
	if (error) {
		return <div className="public_dashboard_error">{error}</div>
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
					<span className="summary_value">{openRequests.length}</span>
				</div>
				<div className="summary_card">
					<span className="summary_label">Recently Resolved</span>
					<span className="summary_value">
						{resolvedRequests.length}
					</span>
				</div>
				<div className="summary_card">
					<span className="summary_label">Wards Affected</span>
					<span className="summary_value">{wardsAffected}</span>
				</div>
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
						<FitMapToRequests requests={allRequests} />
						<TileLayer
							attribution="&copy; OpenStreetMap contributors"
							url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
						/>
						{allRequests.map((request) => {
							let lat, lon
							if (request.latitude && request.longitude) {
								lat = request.latitude
								lon = request.longitude
							} else if (request.location) {
								const coords = parseWktPoint(request.location)
								if (coords) {
									lat = coords.lat
									lon = coords.lon
								}
							}
							if (lat === undefined || lon === undefined) {
								return null
							}
							return (
								<Marker
									key={request.id}
									position={[lat, lon]}
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
							)
						})}
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
					{openRequests.map((request) => (
						<RequestCard key={request.id} request={request} />
					))}
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
					{resolvedRequests.map((request) => (
						<RequestCard key={request.id} request={request} />
					))}
				</div>
			</section>
		</div>
	)
}

export default PublicDashboard
