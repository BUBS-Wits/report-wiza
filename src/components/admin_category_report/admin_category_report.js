import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase_config.js'
import {
	verify_admin,
	fetch_report_data,
	compute_summary,
	format_resolution_time,
	get_resolution_class,
} from '../../backend/category_report_service.js'

import Sidebar from '../admin_sidebar/admin_sidebar.js'
import TopBar from '../top_bar/top_bar.js'

import './admin_category_report.css'

// Converts "Waste Management" → "waste_management" for CSS pill class lookup
const to_css_key = (cat) =>
	(cat || 'default').toLowerCase().replace(/\s+/g, '_')

function CategoryReport() {
	const navigate = useNavigate()
	const [report_data, set_report_data] = useState([])
	const [summary, set_summary] = useState(null)
	const [total_requests, set_total_requests] = useState(0)
	const [loading, set_loading] = useState(true)
	const [error, set_error] = useState(null)

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				navigate('/login')
				return
			}
			try {
				const is_admin = await verify_admin(user.uid)
				if (!is_admin) {
					navigate('/login')
					return
				}
				const { stats = [], total_requests: total = 0 } =
					await fetch_report_data()

				const safe_stats = Array.isArray(stats) ? stats : []
				set_report_data(safe_stats)
				set_total_requests(total)
				set_summary(compute_summary(safe_stats))
			} catch (err) {
				console.error('Error fetching report data:', err)
				set_error('Failed to load report data. Please try again.')
			} finally {
				set_loading(false)
			}
		})
		return () => unsubscribe()
	}, [navigate])

	// Safe fallback of 1 to avoid division-by-zero in bar width calculations
	const max_total = Math.max(...report_data.map((r) => r?.total || 0), 1)

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

		/* ── Main data view ── */
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
								{summary?.total_pending || 0}
							</span>
							<span className="summary_label">Pending</span>
						</div>

						<div className="summary_card summary_card_green">
							<span className="summary_value">
								{summary?.total_resolved || 0}
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
							{report_data.map((row, idx) => {
								const pending = row?.pending || 0
								const in_progress = row?.in_progress || 0
								const resolved = row?.resolved || 0
								const total = row?.total || 0

								// Each segment width is relative to the single largest category total
								const pending_pct = (pending / max_total) * 100
								const in_progress_pct =
									(in_progress / max_total) * 100
								const resolved_pct =
									(resolved / max_total) * 100

								return (
									<div
										key={row?.category || idx}
										className="bar_row"
									>
										<span className="bar_label">
											{row?.category || 'Unknown'}
										</span>
										<div className="bar_track">
											{pending_pct > 0 && (
												<div
													className="bar_fill bar_fill_open"
													style={{
														width: `${pending_pct}%`,
													}}
													title={`Pending: ${pending}`}
												/>
											)}
											{in_progress_pct > 0 && (
												<div
													className="bar_fill bar_fill_in_progress"
													style={{
														width: `${in_progress_pct}%`,
													}}
													title={`In Progress: ${in_progress}`}
												/>
											)}
											{resolved_pct > 0 && (
												<div
													className="bar_fill bar_fill_resolved"
													style={{
														width: `${resolved_pct}%`,
													}}
													title={`Resolved: ${resolved}`}
												/>
											)}
										</div>
										<span className="bar_total">
											{total}
										</span>
									</div>
								)
							})}

							<div className="bar_legend">
								<span className="legend_dot legend_dot_open" />
								Pending
								<span className="legend_dot legend_dot_in_progress" />
								In Progress
								<span className="legend_dot legend_dot_resolved" />
								Resolved
							</div>
						</div>
					</section>

					{/* ── Detailed breakdown table ── */}
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
									{report_data.map((row, idx) => {
										const pending = row?.pending || 0
										const in_progress =
											row?.in_progress || 0
										const resolved = row?.resolved || 0
										const total = row?.total || 0

										const resolution_rate =
											total > 0
												? Math.round(
														(resolved / total) * 100
													)
												: 0

										return (
											<tr
												key={row?.category || idx}
												className={
													pending > 5
														? 'row_warn'
														: ''
												}
											>
												<td>
													<span
														className={`category_pill category_${to_css_key(row?.category)}`}
													>
														{row?.category ||
															'Unknown'}
													</span>
												</td>
												<td className="td_num">
													{total}
												</td>
												<td className="td_num td_open">
													{pending}
												</td>
												<td className="td_num td_in_progress">
													{in_progress}
												</td>
												<td className="td_num td_resolved">
													{resolved}
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
													{row?.avg_hours !== null &&
													row?.avg_hours !==
														undefined ? (
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
