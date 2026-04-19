import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase_config.js'
import { update_request_status } from '../../../backend/worker_firebase.js'
import './worker_request_detail.css'

const VALID_STATUSES = ['acknowledged', 'in_progress', 'resolved']

function WorkerRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, set_request] = useState(null)
  const [loading, set_loading] = useState(true)
  const [updating, set_updating] = useState(false)
  const [message, set_message] = useState(null)
  const [is_error, set_is_error] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
       const snap = await getDoc(doc(db, 'service_requests', id))
        if (snap.exists()) {
          set_request({ id: snap.id, ...snap.data() })
        } else {
          navigate('/worker')
        }
      } catch (err) {
        console.error(err)
        navigate('/worker')
      } finally {
        set_loading(false)
      }
    }
    load()
  }, [id, navigate])

  const handle_status_update = async (new_status) => {
    set_updating(true)
    set_message(null)
    try {
      await update_request_status(id, new_status)
      set_request((prev) => ({ ...prev, status: new_status }))
      set_message(`Status updated to "${new_status.replace('_', ' ')}"`)
      set_is_error(false)
    } catch (err) {
      set_message(err.message)
      set_is_error(true)
    } finally {
      set_updating(false)
    }
  }

  if (loading) return <div className="wr_loading">Loading request...</div>
  if (!request) return null

  return (
    <div className="wr_page">
      <div className="wr_header">
        <button className="wr_back_btn" onClick={() => navigate('/worker')}>
          ← Back
        </button>
        <h1 className="wr_title">Request Detail</h1>
      </div>

      <div className="wr_body">
        <div className="wr_card">
          <div className="wr_card_top">
            <h2 className="wr_category">{request.category}</h2>
            <span className={`wr_status_badge ${request.status}`}>
              {request.status?.replace('_', ' ')}
            </span>
          </div>

          <div className="wr_detail_row">
            <span className="wr_label">Ward</span>
            <span className="wr_value">{request.location?.ward_name || '—'}</span>
          </div>
          <div className="wr_detail_row">
            <span className="wr_label">Municipality</span>
            <span className="wr_value">{request.location?.municipality || '—'}</span>
          </div>
          <div className="wr_detail_row">
            <span className="wr_label">Priority</span>
            <span className="wr_value">{request.priority || '—'}</span>
          </div>
          <div className="wr_detail_row">
            <span className="wr_label">Description</span>
            <span className="wr_value">{request.description}</span>
          </div>
        </div>

        <div className="wr_status_section">
          <h3 className="wr_status_title">Update Status</h3>
          <div className="wr_status_buttons">
            {VALID_STATUSES.map((status) => (
              <button
                key={status}
                className={`wr_status_btn ${request.status === status ? 'active' : ''}`}
                onClick={() => handle_status_update(status)}
                disabled={updating || request.status === status}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
          {message && (
            <p className={`wr_message ${is_error ? 'error' : 'success'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkerRequestDetail