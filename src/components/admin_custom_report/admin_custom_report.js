import React, { useState, useMemo, useCallback } from 'react'
import './admin_custom_report.css'
import { generate_custom_report } from '../../backend/admin_custom_report_service.js'

// Import the layout components
import Sidebar from '../admin_sidebar/admin_sidebar.js'
import TopBar from '../top_bar/top_bar.js'

/* ══════════════════════════════════════
   CONSTANTS
══════════════════════════════════════ */

const DIMENSION_OPTIONS = [
	{ value: 'category', label: 'Category', icon: '🏷' },
	{ value: 'status', label: 'Status', icon: '📌' },
	{ value: 'priority', label: 'Priority', icon: '⚡' },
	{ value: 'ward_info.ward_name', label: 'Ward', icon: '📍' },
	{ value: 'ward_info.ward_number', label: 'Ward No.', icon: '#' },
	{ value: 'assigned_worker_uid', label: 'Worker UID', icon: '👷' },
]

const STATUS_OPTIONS = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const PRIORITY_OPTIONS = ['', 'High', 'Medium', 'Low']
const CATEGORY_OPTIONS = ['', 'water', 'sewage', 'electricity', 'road', 'other']

// Default date range: last 30 days
function default_dates() {
	const end = new Date()
	const start = new Date()
	start.setDate(end.getDate() - 30)
	return {
		start: start.toISOString().slice(0, 10),
		end: end.toISOString().slice(0, 10),
	}
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */

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
	return `${(hours / 24).toFixed(1)}d`
}

function time_chip_class(hours) {
	if (!hours) {
		return 'cr_time_none'
	}
	if (hours <= 24) {
		return 'cr_time_fast'
	}
	if (hours <= 72) {
		return 'cr_time_medium'
	}
	return 'cr_time_slow'
}

function rate_fill_class(rate) {
	if (rate >= 70) {
		return 'cr_rate_high'
	}
	if (rate >= 40) {
		return 'cr_rate_mid'
	}
	return 'cr_rate_low'
}

// Derive a CSS modifier from a string value for pill colouring
function pill_class(value = '') {
	const v = value.toLowerCase().replace(/[^a-z]/g, '')
	const known = [
		'water',
		'sewage',
		'electricity',
		'road',
		'resolved',
		'open',
		'closed',
		'high',
		'medium',
		'low',
	]
	return known.includes(v) ? `cr_pill_${v}` : ''
}

// Given the selected dimensions, infer which clean column keys will appear
function infer_col_keys(dimensions) {
	return dimensions.map((dim) =>
		dim.includes('.') ? dim.split('.').pop() : dim
	)
}

function export_csv(rows, col_keys, dim_labels) {
	if (!rows.length) {
		return
	}

	const fixed_headers = [
		'group_id',
		...col_keys,
		'count',
		'resolved_count',
		'resolution_rate',
		'avg_resolution_hours',
	]
	const header_row = fixed_headers.join(',')

	const data_rows = rows.map((row) =>
		fixed_headers
			.map((k) => {
				const v = row[k] ?? ''
				const s = String(v)
				return s.includes(',') ? `"${s}"` : s
			})
			.join(',')
	)

	const csv = [header_row, ...data_rows].join('\n')
	const blob = new Blob([csv], { type: 'text/csv' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `wardwatch_report_${Date.now()}.csv`
	a.click()
	URL.revokeObjectURL(url)
}

function friendly_date(iso) {
	return new Date(iso).toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

/* ══════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════ */

/* ── Dimension chip picker ── */
function DimensionPicker({ selected, on_toggle }) {
	return (
		<div className="cr_dim_grid">
			{DIMENSION_OPTIONS.map((opt) => {
				const active = selected.includes(opt.value)
				return (
					<button
						key={opt.value}
						type="button"
						className={`cr_dim_chip ${active ? 'cr_dim_chip_active' : ''}`}
						onClick={() => on_toggle(opt.value)}
						title={opt.value}
					>
						<span>{opt.icon}</span>
						{opt.label}
					</button>
				)
			})}
		</div>
	)
}

/* ── Summary cards ── */
function SummaryCards({ rows }) {
	const total_groups = rows.length
	const total_requests = rows.reduce((s, r) => s + r.count, 0)
	const total_resolved = rows.reduce((s, r) => s + r.resolved_count, 0)
	const avg_rate =
		total_groups > 0
			? Math.round(
					rows.reduce((s, r) => s + r.resolution_rate, 0) /
						total_groups
				)
			: 0

	const cards = [
		{ label: 'Groups Found', value: total_groups, mod: 'cr_card_blue' },
		{
			label: 'Total Requests',
			value: total_requests,
			mod: 'cr_card_amber',
		},
		{
			label: 'Total Resolved',
			value: total_resolved,
			mod: 'cr_card_green',
		},
		{
			label: 'Avg Resolution %',
			value: `${avg_rate}%`,
			mod: 'cr_card_green',
		},
	]

	return (
		<div className="cr_summary_grid">
			{cards.map((c) => (
				<div key={c.label} className={`cr_summary_card ${c.mod}`}>
					<span className="cr_summary_value">{c.value}</span>
					<span className="cr_summary_label">{c.label}</span>
				</div>
			))}
		</div>
	)
}

/* ── Results table ── */
function ResultsTable({ rows, dimensions }) {
	const col_keys = infer_col_keys(dimensions)

	// Build human-readable column headers from dimension keys
	const dim_headers = dimensions.map((dim) => {
		const opt = DIMENSION_OPTIONS.find((o) => o.value === dim)
		return opt ? opt.label : dim
	})

	if (rows.length === 0) {
		return (
			<div className="cr_empty">
				<svg
					className="cr_empty_icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				No data matched the selected filters and date range.
			</div>
		)
	}

	return (
		<div className="cr_table_wrapper">
			<table className="cr_table">
				<thead>
					<tr>
						{/* Dimension columns */}
						{dim_headers.map((h) => (
							<th key={h}>{h}</th>
						))}
						{/* No-dimension fallback */}
						{dimensions.length === 0 && <th>Period</th>}

						<th className="th_right">Requests</th>
						<th className="th_right">Resolved</th>
						<th className="th_right">Resolution %</th>
						<th className="th_right">Avg Time</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, idx) => {
						const time_str = format_hours(row.avg_resolution_hours)

						return (
							<tr key={row.group_id ?? idx}>
								{/* Dimension value cells */}
								{col_keys.map((key) => {
									const val = row[key] ?? row.group_id ?? '—'
									return (
										<td key={key}>
											<span
												className={`cr_dim_pill ${pill_class(val)}`}
											>
												{val}
											</span>
										</td>
									)
								})}

								{/* No-dimension fallback */}
								{dimensions.length === 0 && (
									<td>
										<span className="cr_dim_pill">
											{row.group_id}
										</span>
									</td>
								)}

								{/* Requests */}
								<td
									className="cr_td_num"
									style={{ color: 'var(--blue)' }}
								>
									{row.count}
								</td>

								{/* Resolved */}
								<td
									className="cr_td_num"
									style={{ color: 'var(--green)' }}
								>
									{row.resolved_count}
								</td>

								{/* Resolution rate bar */}
								<td>
									<div className="cr_rate_wrap">
										<div className="cr_rate_track">
											<div
												className={`cr_rate_fill ${rate_fill_class(row.resolution_rate)}`}
												style={{
													width: `${row.resolution_rate}%`,
												}}
											/>
										</div>
										<span className="cr_rate_label">
											{row.resolution_rate}%
										</span>
									</div>
								</td>

								{/* Avg resolution time */}
								<td style={{ textAlign: 'right' }}>
									<span
										className={`cr_time_chip ${time_chip_class(row.avg_resolution_hours)}`}
									>
										{time_str ?? '—'}
									</span>
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */

export default function AdminCustomReport() {
	const dates = default_dates()

	/* ── Builder state ── */
	const [start_date, set_start_date] = useState(dates.start)
	const [end_date, set_end_date] = useState(dates.end)
	const [dimensions, set_dimensions] = useState(['category'])
	const [filter_status, set_filter_status] = useState('')
	const [filter_priority, set_filter_priority] = useState('')
	const [filter_category, set_filter_category] = useState('')

	/* ── Report state ── */
	const [report_rows, set_report_rows] = useState(null) // null = never run
	const [loading, set_loading] = useState(false)
	const [error, set_error] = useState(null)
	const [last_config, set_last_config] = useState(null) // snapshot of params when last run

	/* ── Dimension toggle ── */
	const toggle_dimension = useCallback((val) => {
		set_dimensions((prev) =>
			prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
		)
	}, [])

	/* ── Reset ── */
	const handle_reset = () => {
		const d = default_dates()
		set_start_date(d.start)
		set_end_date(d.end)
		set_dimensions(['category'])
		set_filter_status('')
		set_filter_priority('')
		set_filter_category('')
		set_report_rows(null)
		set_error(null)
		set_last_config(null)
	}

	/* ── Run report ── */
	const handle_run = async () => {
		set_loading(true)
		set_error(null)

		// Build the filters object — only include non-empty values
		const filters = {}
		if (filter_status) {
			filters.status = filter_status
		}
		if (filter_priority) {
			filters.priority = filter_priority
		}
		if (filter_category) {
			filters.category = filter_category
		}

		const config = {
			start_date,
			end_date,
			dimensions: [...dimensions],
			filters,
		}

		try {
			const result = await generate_custom_report(
				new Date(start_date),
				new Date(end_date + 'T23:59:59'), // inclusive end
				dimensions,
				filters
			)
			set_report_rows(result)
			set_last_config(config)
		} catch (err) {
			set_error(
				'Report generation failed. Please check your configuration and try again.'
			)
		} finally {
			set_loading(false)
		}
	}

	/* ── Config summary text ── */
	const config_summary = useMemo(() => {
		const dim_labels = dimensions.map(
			(d) => DIMENSION_OPTIONS.find((o) => o.value === d)?.label ?? d
		)
		const active_filters = [
			filter_status && `Status: ${filter_status}`,
			filter_priority && `Priority: ${filter_priority}`,
			filter_category && `Category: ${filter_category}`,
		].filter(Boolean)

		return {
			range: `${friendly_date(start_date)} — ${friendly_date(end_date)}`,
			group_by: dim_labels.length
				? dim_labels.join(', ')
				: 'None (global totals)',
			filters: active_filters.length
				? active_filters.join(' · ')
				: 'None',
		}
	}, [
		start_date,
		end_date,
		dimensions,
		filter_status,
		filter_priority,
		filter_category,
	])

	const col_keys = infer_col_keys(last_config?.dimensions ?? [])

	/* ── Helper to render inner content ── */
	const render_content = () => (
		<div className="cr_page">
			{/* ── Header ── */}
			<div className="cr_header">
				<div className="cr_header_inner">
					<div className="cr_breadcrumb">
						<span>Admin</span>
						<span className="cr_breadcrumb_sep">›</span>
						<span className="cr_breadcrumb_current">
							Custom Report
						</span>
					</div>
					<div className="cr_header_row">
						<div>
							<h1 className="cr_title">Custom Report Builder</h1>
							<p className="cr_subtitle">
								Filter, group, and aggregate service requests
								—&nbsp;
								<span className="cr_subtitle_accent">
									any dimension, any period
								</span>
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* ── Main ── */}
			<div className="cr_main">
				{/* ════════════ BUILDER PANEL ════════════ */}
				<div className="cr_builder">
					<div className="cr_builder_header">
						<h2 className="cr_builder_title">
							Report Configuration
						</h2>
					</div>

					<div className="cr_builder_body">
						{/* Date range */}
						<div>
							<div
								className="cr_field_label"
								style={{ marginBottom: '.45rem' }}
							>
								Date Range
							</div>
							<div className="cr_field_row">
								<div className="cr_field_group">
									<label className="cr_field_label">
										From
									</label>
									<input
										type="date"
										className="cr_input"
										value={start_date}
										max={end_date}
										onChange={(e) =>
											set_start_date(e.target.value)
										}
									/>
								</div>
								<div className="cr_field_group">
									<label className="cr_field_label">To</label>
									<input
										type="date"
										className="cr_input"
										value={end_date}
										min={start_date}
										onChange={(e) =>
											set_end_date(e.target.value)
										}
									/>
								</div>
							</div>
						</div>

						{/* Dimensions */}
						<div>
							<div
								className="cr_field_label"
								style={{ marginBottom: '.45rem' }}
							>
								Group By — Dimensions
								<span
									style={{
										fontWeight: 400,
										textTransform: 'none',
										marginLeft: '.5rem',
										color: '#94a3b8',
									}}
								>
									(select one or more)
								</span>
							</div>
							<DimensionPicker
								selected={dimensions}
								on_toggle={toggle_dimension}
							/>
						</div>

						{/* Filters */}
						<div>
							<div
								className="cr_field_label"
								style={{ marginBottom: '.45rem' }}
							>
								Filters
								<span
									style={{
										fontWeight: 400,
										textTransform: 'none',
										marginLeft: '.5rem',
										color: '#94a3b8',
									}}
								>
									(leave blank to include all)
								</span>
							</div>
							<div className="cr_filter_grid">
								<div className="cr_field_group">
									<label className="cr_field_label">
										Status
									</label>
									<select
										className="cr_select"
										value={filter_status}
										onChange={(e) =>
											set_filter_status(e.target.value)
										}
									>
										{STATUS_OPTIONS.map((s) => (
											<option key={s} value={s}>
												{s || 'All statuses'}
											</option>
										))}
									</select>
								</div>
								<div className="cr_field_group">
									<label className="cr_field_label">
										Priority
									</label>
									<select
										className="cr_select"
										value={filter_priority}
										onChange={(e) =>
											set_filter_priority(e.target.value)
										}
									>
										{PRIORITY_OPTIONS.map((p) => (
											<option key={p} value={p}>
												{p || 'All priorities'}
											</option>
										))}
									</select>
								</div>
								<div className="cr_field_group">
									<label className="cr_field_label">
										Category
									</label>
									<select
										className="cr_select"
										value={filter_category}
										onChange={(e) =>
											set_filter_category(e.target.value)
										}
									>
										{CATEGORY_OPTIONS.map((c) => (
											<option key={c} value={c}>
												{c || 'All categories'}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					</div>

					{/* Builder footer */}
					<div className="cr_builder_footer">
						<div className="cr_config_summary">
							<strong>Period:</strong> {config_summary.range}
							&emsp;
							<strong>Group by:</strong> {config_summary.group_by}
							&emsp;
							<strong>Filters:</strong> {config_summary.filters}
						</div>
						<button
							className="cr_reset_btn"
							onClick={handle_reset}
							disabled={loading}
						>
							Reset
						</button>
						<button
							className="cr_run_btn"
							onClick={handle_run}
							disabled={loading || !start_date || !end_date}
						>
							{loading ? (
								<>
									<div
										className="cr_spinner"
										style={{
											width: 15,
											height: 15,
											borderWidth: 2,
										}}
									/>
									Running…
								</>
							) : (
								<>
									<svg
										className="cr_run_btn_icon"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
											clipRule="evenodd"
										/>
									</svg>
									Run Report
								</>
							)}
						</button>
					</div>
				</div>

				{/* ════════════ RESULTS ════════════ */}

				{/* Loading overlay (inline, not full-page) */}
				{loading && (
					<div className="cr_state_wrapper">
						<div className="cr_spinner" />
						<p className="cr_state_text">
							Querying Firestore and aggregating results…
						</p>
					</div>
				)}

				{/* Error */}
				{!loading && error && (
					<div className="cr_state_wrapper">
						<p className="cr_error_text">{error}</p>
						<button className="cr_retry_btn" onClick={handle_run}>
							Retry
						</button>
					</div>
				)}

				{/* Results */}
				{!loading && !error && report_rows !== null && (
					<>
						{/* Summary cards */}
						<SummaryCards rows={report_rows} />

						{/* Results table */}
						<div className="cr_results_section">
							<div className="cr_results_header">
								<div>
									<h2 className="cr_section_heading">
										Results
									</h2>
									<p className="cr_result_meta">
										<strong>{report_rows.length}</strong>{' '}
										group
										{report_rows.length !== 1
											? 's'
											: ''} ·{' '}
										{friendly_date(last_config.start_date)}{' '}
										— {friendly_date(last_config.end_date)}
										{Object.keys(last_config.filters)
											.length > 0 && <> · filtered</>}
									</p>
								</div>
								<button
									className="cr_export_btn"
									onClick={() =>
										export_csv(report_rows, col_keys)
									}
									disabled={report_rows.length === 0}
								>
									<svg
										width="14"
										height="14"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
									Export CSV
								</button>
							</div>

							<ResultsTable
								rows={report_rows}
								dimensions={last_config.dimensions}
							/>

							{report_rows.length > 0 && (
								<p
									className="cr_result_meta"
									style={{ marginTop: '1rem' }}
								>
									Sorted by highest request volume ·
									Resolution time is averaged across resolved
									& closed requests only.
								</p>
							)}
						</div>
					</>
				)}

				{/* Prompt to run when fresh */}
				{!loading && !error && report_rows === null && (
					<div
						className="cr_state_wrapper"
						style={{ minHeight: 180 }}
					>
						<p className="cr_state_text">
							Configure your report above, then click{' '}
							<strong>Run Report</strong>.
						</p>
					</div>
				)}
			</div>
		</div>
	)

	// Wrap the rendered content in the global Admin layout
	return (
		<div className="admin_page">
			<Sidebar />
			<div className="admin_main">
				<TopBar active_section="custom_report" />
				<div className="admin_content">{render_content()}</div>
			</div>
		</div>
	)
}
