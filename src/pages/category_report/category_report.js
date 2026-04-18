import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase_config.js'
import {
	fetch_report_data,
	format_resolution_time,
	get_resolution_class,
} from '../../backend/category_report_service.js'
import Sidebar from '../../components/sidebar/sidebar.js'
import TopBar from '../../components/top_bar/top_bar.js'

import './category_report.css'

function CategoryReport() {
	const navigate = useNavigate()
	const [report_data, set_report_data] = useState([])
	const [summary, set_summary] = useState(null)
	const [total_requests, set_total_requests] = useState(0)
	const [loading, set_loading] = useState(true)
	const [error, set_error] = useState(null)
	const [generated_at] = useState(new Date())

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				navigate('/login')
				return
			}
			try {
				// 1. Fetch data directly (backend handles the admin verification now!)
				const response = await fetch_report_data(user.uid)

				// 2. Save the pre-calculated data to state
				set_report_data(response.stats)
				set_total_requests(response.total_requests)
				set_summary(response.summary)
			} catch (err) {
				// If the backend threw a 403 Forbidden, we can bounce them to login
				console.error(err)
				set_error('Failed to load report data. Please try again.')
			} finally {
				set_loading(false)
			}
		})
		return () => unsubscribe()
	}, [navigate])

	const max_total = Math.max(...report_data.map((r) => r.total), 1)

	// Helper function to render the correct view based on state
	const render_content = () => {
		/* ── Loading state ── */
		if (loading) {
			return (
				<div className="report_state_wrapper">
					<div className="report_spinner" />
					<p className="report_state_text">Loading report data…</p>
				</div>
			)
		}

		/* ── Error state ── */
		if (error) {
			return (
				<div className="report_state_wrapper">
					<p className="report_error_text">{error}</p>
					<button
						className="report_retry_btn"
						onClick={() => window.location.reload()}
					>
						Retry
					</button>
				</div>
			)
		}

		/* ── Main Data View ── */
		return (
			<div className="report_page">
				<main className="report_main">
					{/* ── Summary cards ── */}
					<section className="summary_grid">
						<div className="summary_card">
							<span className="summary_value">
								{total_requests}
							</span>
							<span className="summary_label">
								Total Requests
							</span>
						</div>

						<div className="summary_card summary_card_blue">
							<span className="summary_value">
								{summary?.total_pending ?? 0}
							</span>
							<span className="summary_label">Pending</span>
						</div>

						<div className="summary_card summary_card_green">
							<span className="summary_value">
								{summary?.total_resolved ?? 0}
							</span>
							<span className="summary_label">Resolved</span>
						</div>

						<div className="summary_card summary_card_amber">
							<span className="summary_value">
								{summary?.overall_avg_hours !== null &&
								summary?.overall_avg_hours !== undefined
									? format_resolution_time(
											summary.overall_avg_hours
										)
									: '—'}
							</span>
							<span className="summary_label">
								Avg Resolution Time
							</span>
						</div>

						{summary?.worst_backlog && (
							<div className="summary_card summary_card_red">
								<span className="summary_value summary_value_category">
									{summary.worst_backlog.category}
								</span>
								<span className="summary_label">
									Worst Backlog
								</span>
							</div>
						)}
					</section>

					{/* ── Volume bar chart ── */}
					<section className="report_section">
						<h2 className="section_heading">
							Request Volume by Category
						</h2>
						<div className="bar_chart">
							{report_data.map((row) => (
								<div key={row.category} className="bar_row">
									<span className="bar_label">
										{row.category}
									</span>
									<div className="bar_track">
										<div
											className="bar_fill bar_fill_open"
											style={{
												width: `${(row.pending / max_total) * 100}%`,
											}}
											title={`Pending: ${row.pending}`}
										/>
										<div
											className="bar_fill bar_fill_in_progress"
											style={{
												width: `${(row.in_progress / max_total) * 100}%`,
											}}
											title={`In Progress: ${row.in_progress}`}
										/>
										<div
											className="bar_fill bar_fill_resolved"
											style={{
												width: `${(row.resolved / max_total) * 100}%`,
											}}
											title={`Resolved: ${row.resolved}`}
										/>
									</div>
									<span className="bar_total">
										{row.total}
									</span>
								</div>
							))}
							<div className="bar_legend">
								<span className="legend_dot legend_dot_open" />{' '}
								Pending
								<span className="legend_dot legend_dot_in_progress" />{' '}
								In Progress
								<span className="legend_dot legend_dot_resolved" />{' '}
								Resolved
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
										<th>Pending</th>
										<th>In Progress</th>
										<th>Resolved</th>
										<th>Resolution Rate</th>
										<th>Avg Resolution Time</th>
									</tr>
								</thead>
								<tbody>
									{report_data.map((row) => {
										const resolution_rate =
											row.total > 0
												? Math.round(
														(row.resolved /
															row.total) *
															100
													)
												: 0
										return (
											<tr
												key={row.category}
												className={
													row.pending > 5
														? 'row_warn'
														: ''
												}
											>
												<td>
													<span
														className={`category_pill category_${row.category}`}
													>
														{row.category}
													</span>
												</td>
												<td className="td_num">
													{row.total}
												</td>
												<td className="td_num td_open">
													{row.pending}
												</td>
												<td className="td_num td_in_progress">
													{row.in_progress}
												</td>
												<td className="td_num td_resolved">
													{row.resolved}
												</td>
												<td>
													<div className="rate_bar_wrapper">
														<div className="rate_bar_track">
															<div
																className="rate_bar_fill"
																style={{
																	width: `${resolution_rate}%`,
																}}
															/>
														</div>
														<span className="rate_label">
															{resolution_rate}%
														</span>
													</div>
												</td>
												<td>
													{row.avg_hours !== null ? (
														<span
															className={`resolution_chip ${get_resolution_class(row.avg_hours)}`}
														>
															{format_resolution_time(
																row.avg_hours
															)}
														</span>
													) : (
														<span className="resolution_chip resolution_none">
															No data
														</span>
													)}
												</td>
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
						<p className="table_footnote">
							⚑ Rows with more than 5 pending requests are
							highlighted. Avg resolution time is calculated only
							from requests with status <em>resolved</em>.
						</p>
					</section>
				</main>
			</div>
		)
	}

	// Wrap the rendered content in the global Admin layout
	return (
		<div className="admin_page">
			<Sidebar />
			<div className="admin_main">
				<TopBar active_section="Analytics" />
				<div className="admin_content">{render_content()}</div>
			</div>
		</div>
	)
}

export default CategoryReport
