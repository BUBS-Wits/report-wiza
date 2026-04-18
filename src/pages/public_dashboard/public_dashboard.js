import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import RequestCard from '../../components/request_card/request_card.js'   // your corrected path
import './public_dashboard.css'
import * as esri from 'esri-leaflet'

// --- SAFEGUARD FOR JEST TESTING ---
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

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const openIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const inProgressIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const resolvedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
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
    if (!requests.length) {return}
    const bounds = L.latLngBounds(requests.map(r => [r.latitude, r.longitude]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, requests])
  return null
}

function getStatusIcon(status) {
  const s = status.toLowerCase()
  if (s === 'open') {return openIcon}
  if (s === 'in progress') {return inProgressIcon}
  if (s === 'resolved') {return resolvedIcon}
  return inProgressIcon
}

function PublicDashboard() {
  const openRequests = [
    {
      id: 1,
      category: 'Potholes',
      status: 'In Progress',
      ward: 'Ward 60',
      municipality: 'City of Johannesburg',
      description: 'Large pothole causing traffic delays near the intersection.',
      latitude: -26.2044,
      longitude: 28.0456,
      like_count: 0,           // added from your branch
    },
    {
      id: 2,
      category: 'Water',
      status: 'Open',
      ward: 'Ward 60',
      municipality: 'City of Johannesburg',
      description: 'Burst pipe reported outside a residential area.',
      latitude: -26.1958,
      longitude: 28.0342,
      like_count: 0,
    },
    {
      id: 3,
      category: 'Electricity',
      status: 'Open',
      ward: 'Ward 63',
      municipality: 'City of Johannesburg',
      description: 'Power outage affecting multiple streets since early morning.',
      latitude: -26.1912,
      longitude: 28.0551,
      like_count: 0,
    },
    {
      id: 4,
      category: 'Waste',
      status: 'In Progress',
      ward: 'Ward 61',
      municipality: 'City of Johannesburg',
      description: 'Overflowing refuse site reported near a school entrance.',
      latitude: -26.2089,
      longitude: 28.0614,
      like_count: 0,
    },
  ]

  const resolvedRequests = [
    {
      id: 5,
      category: 'Waste',
      status: 'Resolved',
      ward: 'Ward 60',
      municipality: 'City of Johannesburg',
      description: 'Illegal dumping site cleared by the municipal team.',
      latitude: -26.2015,
      longitude: 28.0281,
      like_count: 0,
    },
    {
      id: 6,
      category: 'Electricity',
      status: 'Resolved',
      ward: 'Ward 124',
      municipality: 'City of Johannesburg',
      description: 'Streetlight outage fixed in the area.',
      latitude: -26.2132,
      longitude: 28.0397,
      like_count: 0,
    },
    {
      id: 7,
      category: 'Water',
      status: 'Resolved',
      ward: 'Ward 63',
      municipality: 'City of Johannesburg',
      description: 'Water leak repaired outside a community clinic.',
      latitude: -26.1874,
      longitude: 28.0488,
      like_count: 0,
    },
  ]

  const wardsAffected = new Set(
    [...openRequests, ...resolvedRequests].map(r => r.ward)
  ).size

  const allRequests = [...openRequests, ...resolvedRequests]

  return (
    <div className="public_dashboard">
      <header className="dashboard_header">
        <Link to="/" className="home_button">🏠 Home</Link>
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
          <span className="summary_value">{resolvedRequests.length}</span>
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
            {allRequests.map(request => (
              <Marker
                key={request.id}
                position={[request.latitude, request.longitude]}
                icon={getStatusIcon(request.status)}
              >
                <Popup>
                  <div>
                    <strong>{request.category}</strong><br />
                    Status: {request.status}<br />
                    {request.ward}<br />
                    {request.municipality}<br />
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
          <span className="section_note">Currently active issues</span>
        </div>
        <div className="request_list">
          {openRequests.map(request => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      </section>

      <section className="dashboard_section">
        <div className="section_heading_row">
          <h2>Recently Resolved</h2>
          <span className="section_note">Latest completed issues</span>
        </div>
        <div className="request_list">
          {resolvedRequests.map(request => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default PublicDashboard