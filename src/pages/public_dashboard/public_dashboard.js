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
      description: 'Large pothole causing traffic delays near the intersection.',
    },
    {
      id: 2,
      category: 'Water',
      status: 'Open',
      ward: 'Ward 8',
      municipality: 'City of Johannesburg',
      description: 'Burst pipe reported outside residential area.',
    },
  ]

  const resolvedRequests = [
    {
      id: 3,
      category: 'Waste',
      status: 'Resolved',
      ward: 'Ward 5',
      municipality: 'City of Johannesburg',
      description: 'Illegal dumping site cleared by municipal team.',
    },
    {
      id: 4,
      category: 'Electricity',
      status: 'Resolved',
      ward: 'Ward 3',
      municipality: 'City of Johannesburg',
      description: 'Streetlight outage fixed in the area.',
    },
  ]

  return (
    <div className="public_dashboard">
      <header className="dashboard_header">
        <h1>Community Service Dashboard</h1>
        <p>
          View open and recently resolved municipal service requests in your
          community.
        </p>
      </header>

      <section className="dashboard_section">
        <h2>Open Requests</h2>
        <div className="request_list">
          {openRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      </section>

      <section className="dashboard_section">
        <h2>Recently Resolved</h2>
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