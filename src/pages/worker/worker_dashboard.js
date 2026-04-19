import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase_config.js'
import { get_claimed_requests } from '../../backend/worker_firebase.js'
import RequestCard from '../../components/request_card/request_card.js'
import './worker_dashboard.css'

const STATUS_FILTERS = ['all', 'open', 'acknowledged', 'in_progress', 'resolved']

function WorkerDashboard() {
  const [requests, set_requests] = useState([])
  const [loading, set_loading] = useState(true)
  const [active_filter, set_active_filter] = useState('all')
  const navigate = useNavigate()

useEffect(() => {
  const load = async () => {
    if (!auth.currentUser) {
      navigate('/login')
      return
    }
    try {
      const data = await get_claimed_requests(auth.currentUser.uid)
      set_requests(data)
    } catch (err) {
      console.error(err)
    } finally {
      set_loading(false)
    }
  }
  load()
}, [navigate])
  const handle_signout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const filtered_requests =
    active_filter === 'all'
      ? requests
      : requests.filter((r) => r.status === active_filter)

  return (
    <div className="worker_page">
      <aside className="worker_sidebar">
        <div className="worker_sidebar_logo">
          REPORT-<span>WIZA</span>
        </div>
        <div className="worker_sidebar_role">Worker Portal</div>
        <nav className="worker_sidebar_nav">
          <div className="worker_sidebar_item active">My Requests</div>
        </nav>
        <div className="worker_sidebar_bottom">
          <div className="worker_sidebar_avatar">
            {auth.currentUser?.displayName?.[0] || 'W'}
          </div>
          <div className="worker_sidebar_user_info">
            <div className="worker_sidebar_user_name">
              {auth.currentUser?.displayName || 'Worker'}
            </div>
            <div className="worker_sidebar_user_role">Municipal Worker</div>
          </div>
        </div>
      </aside>

      <div className="worker_main">
        <div className="worker_top_bar">
          <div>
            <h1 className="worker_top_bar_title">My Requests</h1>
            <p className="worker_top_bar_sub">
              Manage and update your assigned service requests
            </p>
          </div>
          <button className="worker_signout_btn" onClick={handle_signout}>
            Sign out
          </button>
        </div>

        <div className="worker_content">
          <div className="worker_filters">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                className={`worker_filter_btn ${active_filter === f ? 'active' : ''}`}
                onClick={() => set_active_filter(f)}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="worker_loading">Loading requests...</p>
          ) : filtered_requests.length === 0 ? (
            <p className="worker_empty">No requests found.</p>
          ) : (
            <div className="worker_requests_grid">
              {filtered_requests.map((request) => (
                <div
                  key={request.id}
                  className="worker_card_wrapper"
                  onClick={() => navigate(`/worker/requests/${request.id}`)}
                >
                  <RequestCard request={request} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkerDashboard