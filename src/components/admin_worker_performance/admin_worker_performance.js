import React, { useEffect, useState, useMemo } from 'react'
import './admin_worker_performance.css'
import { fetch_aggregate_worker_performance } from '../../backend/admin_worker_performance_service.js'
/* ── helpers ── */
import Sidebar from '../admin_sidebar/admin_sidebar.js'
import TopBar from '../top_bar/top_bar.js'

function get_initials(name = '') {
	return name
		.split(' ')
		.map((p) => p[0])
		.join('')
		.slice(0, 2)
		.toUpperCase()
}

function format_hours(hours) {
	if (!hours || hours === 0) {
		return null
	}
	if (hours < 1) {
		return `${Math.round(hours * 60)}m`
	}
	if (hours < 24) {
		return `${hours.toFixed(1)}h`
	}
	const days = (hours / 24).toFixed(1)
	return `${days}d`
}

function time_chip_class(hours) {
	if (!hours || hours === 0) {
		return 'wp_time_none'
	}
	if (hours <= 24) {
		return 'wp_time_fast'
	}
	if (hours <= 72) {
		return 'wp_time_medium'
	}
	return 'wp_time_slow'
}

function rate_fill_class(rate) {
	if (rate >= 70) {
		return 'wp_rate_high'
	}
	if (rate >= 40) {
		return 'wp_rate_mid'
	}
	return 'wp_rate_low'
}

function bar_fill_class(rate) {
	if (rate >= 70) {
		return 'wp_bar_fill_high'
	}
	if (rate >= 40) {
		return 'wp_bar_fill_mid'
	}
	return 'wp_bar_fill_low'
}

function avatar_class(rank, total) {
	if (rank === 0) {
		return 'wp_avatar_top'
	}
	if (rank >= total - 1) {
		return 'wp_avatar_low'
	}
	return 'wp_avatar_mid'
}

function row_class(rate, active) {
	if (rate >= 80 && active <= 2) {
		return 'wp_row_top'
	}
	if (rate < 30 || active > 10) {
		return 'wp_row_warn'
	}
	return ''
}

const SORT_OPTIONS = [
	{ value: 'completion_rate_desc', label: 'Completion Rate ↓' },
	{ value: 'completion_rate_asc', label: 'Completion Rate ↑' },
	{ value: 'total_assigned_desc', label: 'Total Assigned ↓' },
	{ value: 'active_tasks_desc', label: 'Active Tasks ↓' },
	{ value: 'avg_resolution_asc', label: 'Fastest Resolution' },
	{ value: 'name_asc', label: 'Name A–Z' },
]

function sort_workers(workers, sort_key) {
	const arr = [...workers]
	switch (sort_key) {
		case 'completion_rate_desc':
			return arr.sort((a, b) => b.completion_rate - a.completion_rate)
		case 'completion_rate_asc':
			return arr.sort((a, b) => a.completion_rate - b.completion_rate)
		case 'total_assigned_desc':
			return arr.sort((a, b) => b.total_assigned - a.total_assigned)
		case 'active_tasks_desc':
			return arr.sort((a, b) => b.active_tasks - a.active_tasks)
		case 'avg_resolution_asc':
			return arr.sort(
				(a, b) =>
					(a.avg_resolution_hours || Infinity) -
					(b.avg_resolution_hours || Infinity)
			)
		case 'name_asc':
			return arr.sort((a, b) =>
				(a.display_name || '').localeCompare(b.display_name || '')
			)
		default:
			return arr
	}
}

/* ── sub-components ── */

function SummaryCards({ workers }) {
	const total_workers = workers.length
	const total_assigned = workers.reduce((s, w) => s + w.total_assigned, 0)
	const total_resolved = workers.reduce((s, w) => s + w.total_resolved, 0)
	const total_active = workers.reduce((s, w) => s + w.active_tasks, 0)
	const avg_completion =
		total_workers > 0
			? Math.round(
					workers.reduce((s, w) => s + w.completion_rate, 0) /
						total_workers
				)
			: 0

	const cards = [
		{ label: 'Total Workers', value: total_workers, mod: 'wp_card_blue' },
		{
			label: 'Tasks Assigned',
			value: total_assigned,
			mod: 'wp_card_amber',
		},
		{
			label: 'Tasks Resolved',
			value: total_resolved,
			mod: 'wp_card_green',
		},
		{ label: 'Active Tasks', value: total_active, mod: 'wp_card_red' },
		{
			label: 'Avg Completion %',
			value: `${avg_completion}%`,
			mod: 'wp_card_green',
		},
	]

	return (
		<div className="wp_summary_grid">
			{cards.map((c) => (
				<div key={c.label} className={`wp_summary_card ${c.mod}`}>
					<span className="wp_summary_value">{c.value}</span>
					<span className="wp_summary_label">{c.label}</span>
				</div>
			))}
		</div>
	)
}

function PerformanceChart({ workers }) {
	// Show top 8 by completion rate for readability
	const chart_workers = [...workers]
		.sort((a, b) => b.completion_rate - a.completion_rate)
		.slice(0, 8)

	if (chart_workers.length === 0) {
		return null
	}

	return (
		<div className="wp_section">
			<h2 className="wp_section_heading">
				Completion Rate — Top Workers
			</h2>
			<div className="wp_bar_chart">
				{chart_workers.map((w) => {
					const name = w.display_name || w.email || w.worker_uid
					const short_name =
						name.length > 18 ? name.slice(0, 17) + '…' : name
					return (
						<div key={w.worker_uid} className="wp_bar_row">
							<span className="wp_bar_label" title={name}>
								{short_name}
							</span>
							<div className="wp_bar_track">
								<div
									className={`wp_bar_fill ${bar_fill_class(w.completion_rate)}`}
									style={{ width: `${w.completion_rate}%` }}
								/>
							</div>
							<span className="wp_bar_value">
								{w.completion_rate}%
							</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function WorkerTable({ workers, sort_key, on_sort }) {
	const COLS = [
		{ key: 'rank', label: '#', sortable: false },
		{ key: 'name', label: 'Worker', sortable: false },
		{ key: 'total_assigned_desc', label: 'Assigned', sortable: true },
		{ key: 'active_tasks_desc', label: 'Active', sortable: true },
		{ key: 'total_resolved', label: 'Resolved', sortable: false },
		{ key: 'avg_resolution_asc', label: 'Avg Resolution', sortable: true },
		{ key: 'completion_rate_desc', label: 'Completion', sortable: true },
	]

	return (
		<div className="wp_section">
			<h2 className="wp_section_heading">Worker Breakdown</h2>
			<div className="wp_table_wrapper">
				<table className="wp_table">
					<thead>
						<tr>
							{COLS.map((col) => (
								<th
									key={col.key}
									className={
										col.sortable ? 'th_sortable' : ''
									}
									onClick={
										col.sortable
											? () => on_sort(col.key)
											: undefined
									}
								>
									{col.label}
									{col.sortable && (
										<span className="wp_sort_indicator">
											{sort_key === col.key
												? '▲'
												: sort_key === col.key + '_asc'
													? '▼'
													: '⇅'}
										</span>
									)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{workers.length === 0 && (
							<tr>
								<td colSpan={7} className="wp_empty">
									No workers match your search.
								</td>
							</tr>
						)}
						{workers.map((w, idx) => {
							const name =
								w.display_name || w.email || w.worker_uid
							const email = w.email || '—'
							const initials = get_initials(
								w.display_name || email
							)
							const time_str = format_hours(
								w.avg_resolution_hours
							)
							const rank_cls =
								idx === 0
									? 'wp_rank_1'
									: idx === 1
										? 'wp_rank_2'
										: idx === 2
											? 'wp_rank_3'
											: ''

							return (
								<tr
									key={w.worker_uid}
									className={row_class(
										w.completion_rate,
										w.active_tasks
									)}
								>
									{/* Rank */}
									<td>
										<span
											className={`wp_rank_badge ${rank_cls}`}
										>
											{idx + 1}
										</span>
									</td>

									{/* Worker identity */}
									<td>
										<div className="wp_worker_cell">
											<div
												className={`wp_avatar ${avatar_class(idx, workers.length)}`}
											>
												{initials}
											</div>
											<div>
												<div className="wp_worker_name">
													{name}
												</div>
												<div className="wp_worker_email">
													{email}
												</div>
											</div>
										</div>
									</td>

									{/* Assigned */}
									<td className="wp_td_num wp_td_blue">
										{w.total_assigned}
									</td>

									{/* Active */}
									<td
										className={`wp_td_num ${w.active_tasks > 10 ? 'wp_td_red' : 'wp_td_amber'}`}
									>
										{w.active_tasks}
									</td>

									{/* Resolved */}
									<td className="wp_td_num wp_td_green">
										{w.total_resolved}
									</td>

									{/* Avg resolution time */}
									<td>
										{w.total_assigned === 0 ? (
											<span
												className={`wp_time_chip wp_time_none`}
											>
												—
											</span>
										) : (
											<span
												className={`wp_time_chip ${time_chip_class(w.avg_resolution_hours)}`}
											>
												{time_str || '—'}
											</span>
										)}
									</td>

									{/* Completion rate */}
									<td>
										{w.total_assigned === 0 ? (
											<span className="wp_rate_label">
												—
											</span>
										) : (
											<div className="wp_rate_wrap">
												<div className="wp_rate_track">
													<div
														className={`wp_rate_fill ${rate_fill_class(w.completion_rate)}`}
														style={{
															width: `${w.completion_rate}%`,
														}}
													/>
												</div>
												<span className="wp_rate_label">
													{w.completion_rate}%
												</span>
											</div>
										)}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
			<p className="wp_footnote">
				<span style={{ color: '#15803d', fontWeight: 600 }}>
					Green rows
				</span>{' '}
				— high performers (≥80% completion, ≤2 active
				tasks).&nbsp;&nbsp;
				<span style={{ color: '#d97706', fontWeight: 600 }}>
					Amber rows
				</span>{' '}
				— workers needing attention (&lt;30% completion or &gt;10 active
				tasks).
			</p>
		</div>
	)
}

/* ── Main page ── */

export default function AdminWorkerPerformance() {
	const [workers, set_workers] = useState([])
	const [loading, set_loading] = useState(true)
	const [error, set_error] = useState(null)
	const [search, set_search] = useState('')
	const [sort_key, set_sort_key] = useState('completion_rate_desc')

	const load_data = async () => {
		set_loading(true)
		set_error(null)
		try {
			const data = await fetch_aggregate_worker_performance()
			set_workers(data)
		} catch (err) {
			set_error(
				'Failed to load worker performance data. Please try again.'
			)
		} finally {
			set_loading(false)
		}
	}

	useEffect(() => {
		load_data()
	}, [])

	const filtered_sorted = useMemo(() => {
		const q = search.trim().toLowerCase()
		const filtered = q
			? workers.filter((w) => {
					const name = (w.display_name || '').toLowerCase()
					const email = (w.email || '').toLowerCase()
					return name.includes(q) || email.includes(q)
				})
			: workers
		return sort_workers(filtered, sort_key)
	}, [workers, search, sort_key])

	const handle_sort_toggle = (col_key) => {
		// Toggle between desc and asc variants of the same column
		if (sort_key === col_key) {
			const asc_key = col_key.replace('_desc', '_asc')
			set_sort_key(asc_key)
		} else {
			set_sort_key(col_key)
		}
	}

	const today = new Date().toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})

	/* ── Loading state ── */
	if (loading) {
		return (
			<div className="admin_page">
				<Sidebar />
				<div className="admin_main">
					<TopBar active_section="worker_performance" />
					<div className="admin_content">
						<div className="wp_state_wrapper">
							<div className="wp_spinner" />
							<p className="wp_state_text">
								Loading worker performance data…
							</p>
						</div>
					</div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="admin_page">
				<Sidebar />
				<div className="admin_main">
					<TopBar active_section="worker_performance" />
					<div className="admin_content">
						<div className="wp_state_wrapper">
							<p className="wp_error_text">{error}</p>
							<button
								className="wp_retry_btn"
								onClick={load_data}
							>
								Retry
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="admin_page">
			<Sidebar />
			<div className="admin_main">
				<TopBar active_section="worker_performance" />
				<div className="admin_content">
					<div className="wp_page">
						<div className="wp_header">
							<div className="wp_header_inner">
								<div className="wp_breadcrumb">
									<span>Admin</span>
									<span className="wp_breadcrumb_sep">›</span>
									<span className="wp_breadcrumb_current">
										Worker Performance
									</span>
								</div>
								<div className="wp_header_row">
									<div>
										<h1 className="wp_title">
											Worker Performance
										</h1>
										<p className="wp_subtitle">
											{workers.length} field
											workers&nbsp;·&nbsp;
											<span className="wp_subtitle_accent">
												Generated {today}
											</span>
										</p>
									</div>
								</div>
								<div className="wp_controls">
									<div className="wp_search_wrap">
										<svg
											className="wp_search_icon"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
												clipRule="evenodd"
											/>
										</svg>
										<input
											className="wp_search_input"
											type="text"
											placeholder="Search by name or email…"
											value={search}
											onChange={(e) =>
												set_search(e.target.value)
											}
										/>
									</div>
									<select
										className="wp_sort_select"
										value={sort_key}
										onChange={(e) =>
											set_sort_key(e.target.value)
										}
									>
										{SORT_OPTIONS.map((o) => (
											<option
												key={o.value}
												value={o.value}
											>
												{o.label}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
						<div className="wp_main">
							<SummaryCards workers={filtered_sorted} />
							<PerformanceChart workers={filtered_sorted} />
							<WorkerTable
								workers={filtered_sorted}
								sort_key={sort_key}
								on_sort={handle_sort_toggle}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
