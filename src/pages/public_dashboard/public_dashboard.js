import React from 'react'
import RequestCard from '../../components/request_card.js'
import './public_dashboard.css'

function PublicDashboard() {
	const openRequests = [
		{
			id: 1,
			category: 'Potholes',
			status: 'In Progress',
			ward: 'Ward 12',
			municipality: 'City of Johannesburg',
			description:
				'Large pothole causing traffic delays near the intersection.',
		},
		{
			id: 2,
			category: 'Water',
			status: 'Open',
			ward: 'Ward 8',
			municipality: 'City of Johannesburg',
			description: 'Burst pipe reported outside a residential area.',
		},
		{
			id: 3,
			category: 'Electricity',
			status: 'Open',
			ward: 'Ward 4',
			municipality: 'City of Johannesburg',
			description:
				'Power outage affecting multiple streets since early morning.',
		},
		{
			id: 4,
			category: 'Waste',
			status: 'In Progress',
			ward: 'Ward 6',
			municipality: 'City of Johannesburg',
			description:
				'Overflowing refuse site reported near a school entrance.',
		},
	]

	const resolvedRequests = [
		{
			id: 5,
			category: 'Waste',
			status: 'Resolved',
			ward: 'Ward 5',
			municipality: 'City of Johannesburg',
			description: 'Illegal dumping site cleared by the municipal team.',
		},
		{
			id: 6,
			category: 'Electricity',
			status: 'Resolved',
			ward: 'Ward 3',
			municipality: 'City of Johannesburg',
			description: 'Streetlight outage fixed in the area.',
		},
		{
			id: 7,
			category: 'Water',
			status: 'Resolved',
			ward: 'Ward 2',
			municipality: 'City of Johannesburg',
			description: 'Water leak repaired outside a community clinic.',
		},
	]

	const wardsAffected = new Set(
		[...openRequests, ...resolvedRequests].map((request) => request.ward)
	).size

	return (
		<div className="public_dashboard">
			<header className="dashboard_header">
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
					<span className="section_tag">Coming soon</span>
				</div>
				<div className="map_placeholder">
					<p>Map and ward boundary overlay will appear here.</p>
					<span>
						This public dashboard will later display issue locations
						on a ward map.
					</span>
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
