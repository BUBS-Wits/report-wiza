// src/pages/admin_satisfaction_report/admin_satisfaction_report.js
import React, { useEffect, useState } from 'react'
import {
	fetch_rated_requests,
	fetch_assignments,
	fetch_workers,
} from '../../backend/admin_firebase.js'
import './admin_satisfaction_report.css'

const CATEGORY_LABELS = {
	potholes: 'Potholes',
	water: 'Water',
	electricity: 'Electricity',
	waste: 'Waste',
	other: 'Other',
}

function RatingBar({ avg, max = 4 }) {
	const pct = Math.round((avg / max) * 100)
	const color = avg >= 3 ? '#f59e0b' : avg >= 2 ? '#d97706' : '#dc2626'
	return (
		<div className="rating_bar_track">
			<div
				className="rating_bar_fill"
				style={{ width: `${pct}%`, backgroundColor: color }}
			/>
		</div>
	)
}

function aggregate_by_category(requests) {
	const result = {}
	requests.forEach(({ rating, category }) => {
		if (!category) {
			return
		}
		if (!result[category]) {
			result[category] = []
		}
		result[category].push(rating)
	})
	return Object.entries(result).map(([cat, ratings]) => ({
		category: cat,
		label: CATEGORY_LABELS[cat] || cat,
		count: ratings.length,
		avg: parseFloat(
			(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
		),
	}))
}

function aggregate_by_worker(requests, assignment_map, worker_map) {
	const result = {}
	requests.forEach(({ id, rating }) => {
		const worker_uid = assignment_map[id]
		if (!worker_uid) {
			return
		}
		if (!result[worker_uid]) {
			result[worker_uid] = {
				display_name: worker_map[worker_uid] || 'Unknown Worker',
				ratings: [],
			}
		}
		result[worker_uid].ratings.push(rating)
	})
	return Object.entries(result).map(([uid, data]) => ({
		uid,
		display_name: data.display_name,
		count: data.ratings.length,
		avg: parseFloat(
			(
				data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
			).toFixed(1)
		),
	}))
}

function AdminSatisfactionReport() {
	const [by_category, set_by_category] = useState([])
	const [by_worker, set_by_worker] = useState([])
	const [total_count, set_total_count] = useState(0)
	const [overall_avg, set_overall_avg] = useState(null)
	const [loading, set_loading] = useState(true)
	const [error, set_error] = useState(null)

	useEffect(() => {
		const load_report = async () => {
			try {
				set_loading(true)

				const [rated_requests, assignments, workers] =
					await Promise.all([
						fetch_rated_requests(),
						fetch_assignments(),
						fetch_workers(),
					])

				if (rated_requests.length === 0) {
					set_by_category([])
					set_by_worker([])
					set_total_count(0)
					set_overall_avg(null)
					return
				}

				// Build request_uid -> worker_uid lookup from assignments
				const assignment_map = {}
				assignments.forEach((a) => {
					assignment_map[a.request_uid] = a.worker_uid
				})

				// Build worker uid -> display_name lookup
				const worker_map = {}
				workers.forEach((w) => {
					worker_map[w.id] = w.display_name || w.email || 'Unknown'
				})

				const all_ratings = rated_requests.map((r) => r.rating)
				const avg = parseFloat(
					(
						all_ratings.reduce((a, b) => a + b, 0) /
						all_ratings.length
					).toFixed(1)
				)

				set_total_count(rated_requests.length)
				set_overall_avg(avg)
				set_by_category(aggregate_by_category(rated_requests))
				set_by_worker(
					aggregate_by_worker(
						rated_requests,
						assignment_map,
						worker_map
					)
				)
			} catch (err) {
				console.error('Failed to load satisfaction report:', err)
				set_error('Could not load report. Please try again.')
			} finally {
				set_loading(false)
			}
		}

		load_report()
	}, [])

	if (loading) {
		return (
			<div className="satisfaction_report_container">
				<p className="satisfaction_loading">
					Loading satisfaction report...
				</p>
			</div>
		)
	}

	if (error) {
		return (
			<div className="satisfaction_report_container">
				<p className="satisfaction_error">{error}</p>
			</div>
		)
	}

	return (
		<div className="satisfaction_report_container">
			<h1 className="satisfaction_report_title">
				Resident Satisfaction Report
			</h1>
			<p className="satisfaction_report_subtitle">
				Average ratings (out of 4) grouped by worker and category.
			</p>

			{total_count === 0 ? (
				<div className="satisfaction_empty">
					<p>No rated requests found.</p>
				</div>
			) : (
				<>
					{/* Summary Card */}
					<div className="satisfaction_summary_card">
						<div className="satisfaction_summary_item">
							<span className="satisfaction_summary_value">
								{overall_avg}
							</span>
							<span className="satisfaction_summary_label">
								Overall Avg / 4
							</span>
						</div>
						<div className="satisfaction_summary_item">
							<span className="satisfaction_summary_value">
								{total_count}
							</span>
							<span className="satisfaction_summary_label">
								Total Ratings
							</span>
						</div>
					</div>

					{/* By Worker */}
					<section className="satisfaction_section">
						<h2 className="satisfaction_section_title">
							By Worker
						</h2>
						{by_worker.length === 0 ? (
							<p className="satisfaction_empty_inline">
								No assigned requests have been rated yet.
							</p>
						) : (
							<table className="satisfaction_table">
								<thead>
									<tr>
										<th>Worker</th>
										<th>Avg Rating</th>
										<th>Ratings</th>
										<th className="satisfaction_bar_col">
											Score
										</th>
									</tr>
								</thead>
								<tbody>
									{by_worker
										.sort((a, b) => b.avg - a.avg)
										.map((row) => (
											<tr key={row.uid}>
												<td>{row.display_name}</td>
												<td className="satisfaction_avg">
													{row.avg}{' '}
													<span className="satisfaction_max">
														/ 4
													</span>
												</td>
												<td>{row.count}</td>
												<td>
													<RatingBar avg={row.avg} />
												</td>
											</tr>
										))}
								</tbody>
							</table>
						)}
					</section>

					{/* By Category */}
					<section className="satisfaction_section">
						<h2 className="satisfaction_section_title">
							By Category
						</h2>
						{by_category.length === 0 ? (
							<p className="satisfaction_empty_inline">
								No category data available yet.
							</p>
						) : (
							<table className="satisfaction_table">
								<thead>
									<tr>
										<th>Category</th>
										<th>Avg Rating</th>
										<th>Ratings</th>
										<th className="satisfaction_bar_col">
											Score
										</th>
									</tr>
								</thead>
								<tbody>
									{by_category
										.sort((a, b) => b.avg - a.avg)
										.map((row) => (
											<tr key={row.category}>
												<td>{row.label}</td>
												<td className="satisfaction_avg">
													{row.avg}{' '}
													<span className="satisfaction_max">
														/ 4
													</span>
												</td>
												<td>{row.count}</td>
												<td>
													<RatingBar avg={row.avg} />
												</td>
											</tr>
										))}
								</tbody>
							</table>
						)}
					</section>
				</>
			)}
		</div>
	)
}

export default AdminSatisfactionReport
