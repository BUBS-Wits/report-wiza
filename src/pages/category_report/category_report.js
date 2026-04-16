import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '../../firebase_config'
import { REQUEST_CATEGORIES } from '../../constants'
import './category_report.css'

function CategoryReport() {
  const navigate = useNavigate()
  const [report_data, set_report_data] = useState([])
  const [loading, set_loading] = useState(true)
  const [error, set_error] = useState(null)
  const [total_requests, set_total_requests] = useState(0)
  const [generated_at] = useState(new Date())

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login')
        return
      }
      try {
        const user_doc = await getDoc(doc(db, 'users', user.uid))
        if (!user_doc.exists() || user_doc.data().role !== 'admin') {
          navigate('/login')
          return
        }
        await fetch_report_data()
      } catch (err) {
        set_error('Failed to verify admin permissions.')
        set_loading(false)
      }
    })
    return () => unsubscribe()
  }, [navigate])

  const fetch_report_data = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'requests'))
      const all_requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

      set_total_requests(all_requests.length)

      const stats = REQUEST_CATEGORIES.map((category) => {
        const cat_requests = all_requests.filter((r) => r.category === category)
        const resolved = cat_requests.filter((r) => r.status === 'resolved')
        const open = cat_requests.filter((r) => r.status === 'open')
        const in_progress = cat_requests.filter(
          (r) => r.status === 'in_progress' || r.status === 'acknowledged'
        )

        let avg_hours = null
        if (resolved.length > 0) {
          const total_ms = resolved.reduce((sum, r) => {
            const created = r.created_at?.toMillis?.() ?? 0
            const updated = r.updated_at?.toMillis?.() ?? 0
            return sum + Math.max(0, updated - created)
          }, 0)
          avg_hours = total_ms / resolved.length / (1000 * 60 * 60)
        }

        return {
          category,
          total: cat_requests.length,
          open: open.length,
          in_progress: in_progress.length,
          resolved: resolved.length,
          avg_hours,
        }
      })

      set_report_data(stats)
      set_loading(false)
    } catch (err) {
      set_error('Failed to load report data. Please try again.')
      set_loading(false)
    }
  }

  const format_resolution_time = (hours) => {
    if (hours === null) return null
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${Math.round(hours)}h`
    const days = hours / 24
    return `${days.toFixed(1)}d`
  }

  const get_resolution_class = (hours) => {
    if (hours === null) return ''
    if (hours <= 24) return 'resolution_fast'
    if (hours <= 72) return 'resolution_medium'
    return 'resolution_slow'
  }

  const max_total = Math.max(...report_data.map((r) => r.total), 1)

  const total_resolved = report_data.reduce((s, r) => s + r.resolved, 0)
  const total_open = report_data.reduce((s, r) => s + r.open, 0)

  const categories_with_avg = report_data.filter((r) => r.avg_hours !== null)
  const overall_avg_hours =
    categories_with_avg.length > 0
      ? categories_with_avg.reduce((s, r) => s + r.avg_hours, 0) / categories_with_avg.length
      : null

  const worst_backlog = [...report_data].sort((a, b) => b.open - a.open)[0]

  if (loading) {
    return (
      <div className="report_state_wrapper">
        <div className="report_spinner" />
        <p className="report_state_text">Loading report data…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="report_state_wrapper">
        <p className="report_error_text">{error}</p>
        <button className="report_retry_btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="report_page">
      <header className="report_header">
        <div className="report_header_inner">
          <nav className="report_breadcrumb">
            <span>Admin</span>
            <span className="breadcrumb_sep">›</span>
            <span>Analytics</span>
            <span className="breadcrumb_sep">›</span>
            <span className="breadcrumb_current">Category Report</span>
          </nav>
          <div className="report_header_row">
            <div>
              <h1 className="report_title">Request Volume &amp; Resolution Report</h1>
              <p className="report_subtitle">
                Breakdown by service category — all time ·{' '}
                <span className="report_generated">
                  Generated {generated_at.toLocaleDateString('en-ZA', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="report_main">
        {/* ── Summary cards ── */}
        <section className="summary_grid">
          <div className="summary_card">
            <span className="summary_value">{total_requests}</span>
            <span className="summary_label">Total Requests</span>
          </div>
          <div className="summary_card summary_card_blue">
            <span className="summary_value">{total_open}</span>
            <span className="summary_label">Currently Open</span>
          </div>
          <div className="summary_card summary_card_green">
            <span className="summary_value">{total_resolved}</span>
            <span className="summary_label">Resolved</span>
          </div>
          <div className="summary_card summary_card_amber">
            <span className="summary_value">
              {overall_avg_hours !== null ? format_resolution_time(overall_avg_hours) : '—'}
            </span>
            <span className="summary_label">Avg Resolution Time</span>
          </div>
          {worst_backlog && worst_backlog.open > 0 && (
            <div className="summary_card summary_card_red">
              <span className="summary_value summary_value_category">
                {worst_backlog.category}
              </span>
              <span className="summary_label">Worst Backlog</span>
            </div>
          )}
        </section>

        {/* ── Volume bar chart ── */}
        <section className="report_section">
          <h2 className="section_heading">Request Volume by Category</h2>
          <div className="bar_chart">
            {report_data.map((row) => (
              <div key={row.category} className="bar_row">
                <span className="bar_label">{row.category}</span>
                <div className="bar_track">
                  <div
                    className="bar_fill bar_fill_open"
                    style={{ width: `${(row.open / max_total) * 100}%` }}
                    title={`Open: ${row.open}`}
                  />
                  <div
                    className="bar_fill bar_fill_in_progress"
                    style={{ width: `${(row.in_progress / max_total) * 100}%` }}
                    title={`In Progress: ${row.in_progress}`}
                  />
                  <div
                    className="bar_fill bar_fill_resolved"
                    style={{ width: `${(row.resolved / max_total) * 100}%` }}
                    title={`Resolved: ${row.resolved}`}
                  />
                </div>
                <span className="bar_total">{row.total}</span>
              </div>
            ))}
            <div className="bar_legend">
              <span className="legend_dot legend_dot_open" /> Open
              <span className="legend_dot legend_dot_in_progress" /> In Progress
              <span className="legend_dot legend_dot_resolved" /> Resolved
            </div>
          </div>
        </section>

        {/* ── Data table ── */}
        <section className="report_section">
          <h2 className="section_heading">Detailed Breakdown</h2>
          <div className="table_wrapper">
            <table className="report_table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total</th>
                  <th>Open</th>
                  <th>In Progress</th>
                  <th>Resolved</th>
                  <th>Resolution Rate</th>
                  <th>Avg Resolution Time</th>
                </tr>
              </thead>
              <tbody>
                {report_data.map((row) => {
                  const resolution_rate =
                    row.total > 0 ? Math.round((row.resolved / row.total) * 100) : 0
                  return (
                    <tr key={row.category} className={row.open > 5 ? 'row_warn' : ''}>
                      <td>
                        <span className={`category_pill category_${row.category}`}>
                          {row.category}
                        </span>
                      </td>
                      <td className="td_num">{row.total}</td>
                      <td className="td_num td_open">{row.open}</td>
                      <td className="td_num td_in_progress">{row.in_progress}</td>
                      <td className="td_num td_resolved">{row.resolved}</td>
                      <td>
                        <div className="rate_bar_wrapper">
                          <div className="rate_bar_track">
                            <div
                              className="rate_bar_fill"
                              style={{ width: `${resolution_rate}%` }}
                            />
                          </div>
                          <span className="rate_label">{resolution_rate}%</span>
                        </div>
                      </td>
                      <td>
                        {row.avg_hours !== null ? (
                          <span className={`resolution_chip ${get_resolution_class(row.avg_hours)}`}>
                            {format_resolution_time(row.avg_hours)}
                          </span>
                        ) : (
                          <span className="resolution_chip resolution_none">No data</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="table_footnote">
            ⚑ Rows with more than 5 open requests are highlighted. Avg resolution time is
            calculated only from requests with status <em>resolved</em>.
          </p>
        </section>
      </main>
    </div>
  )
}

export default CategoryReport