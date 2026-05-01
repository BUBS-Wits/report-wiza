import React, { useState, useEffect } from 'react'
import {
	fetch_categories,
	add_category,
	remove_category,
} from '../../backend/admin_requests_service.js'
import './admin_categories.css'

const S = {
	wrap: {
		padding: '32px',
		maxWidth: '680px',
	},
	addRow: {
		display: 'flex',
		alignItems: 'center',
		gap: '10px',
		marginBottom: '24px',
	},
	input: {
		flex: 1,
		maxWidth: '260px',
		height: '38px',
		padding: '0 12px',
		border: '1.5px solid #d1d5db',
		borderRadius: '6px',
		fontSize: '14px',
		color: '#1f2937',
		outline: 'none',
	},
	addBtn: {
		height: '38px',
		padding: '0 18px',
		background: '#f59e0b',
		color: '#fff',
		fontSize: '14px',
		fontWeight: '600',
		border: 'none',
		borderRadius: '6px',
		cursor: 'pointer',
		whiteSpace: 'nowrap',
	},
	addBtnDisabled: {
		opacity: 0.55,
		cursor: 'not-allowed',
	},
	error: {
		marginBottom: '14px',
		padding: '10px 14px',
		background: '#fef2f2',
		border: '1px solid #fca5a5',
		borderRadius: '6px',
		fontSize: '13px',
		color: '#dc2626',
	},
	success: {
		marginBottom: '14px',
		padding: '10px 14px',
		background: '#f0fdf4',
		border: '1px solid #86efac',
		borderRadius: '6px',
		fontSize: '13px',
		color: '#16a34a',
	},
	table: {
		width: '100%',
		borderCollapse: 'collapse',
		background: '#fff',
		border: '1px solid #e5e7eb',
		borderRadius: '10px',
		overflow: 'hidden',
		boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
	},
	th: {
		padding: '11px 16px',
		textAlign: 'left',
		fontSize: '11px',
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: '0.06em',
		color: '#6b7280',
		borderBottom: '1px solid #e5e7eb',
		background: '#f9fafb',
	},
	td: {
		padding: '13px 16px',
		fontSize: '14px',
		color: '#1f2937',
		borderBottom: '1px solid #f3f4f6',
		verticalAlign: 'middle',
	},
	tdLast: {
		padding: '13px 16px',
		fontSize: '14px',
		color: '#1f2937',
		verticalAlign: 'middle',
	},
	nameTd: {
		padding: '13px 16px',
		fontSize: '14px',
		fontWeight: '500',
		color: '#1f2937',
		borderBottom: '1px solid #f3f4f6',
		textTransform: 'capitalize',
		verticalAlign: 'middle',
	},
	badgeActive: {
		display: 'inline-block',
		padding: '3px 10px',
		borderRadius: '999px',
		fontSize: '12px',
		fontWeight: '600',
		background: '#dcfce7',
		color: '#15803d',
	},
	badgeInactive: {
		display: 'inline-block',
		padding: '3px 10px',
		borderRadius: '999px',
		fontSize: '12px',
		fontWeight: '600',
		background: '#f3f4f6',
		color: '#6b7280',
	},
	deactivateBtn: {
		height: '32px',
		padding: '0 14px',
		borderRadius: '6px',
		fontSize: '13px',
		fontWeight: '600',
		cursor: 'pointer',
		border: '1.5px solid #fca5a5',
		background: '#fff',
		color: '#dc2626',
	},
	activateBtn: {
		height: '32px',
		padding: '0 14px',
		borderRadius: '6px',
		fontSize: '13px',
		fontWeight: '600',
		cursor: 'pointer',
		border: '1.5px solid #86efac',
		background: '#fff',
		color: '#16a34a',
	},
	muted: {
		padding: '40px 0',
		textAlign: 'center',
		fontSize: '14px',
		color: '#9ca3af',
	},
}

function AdminCategories() {
	const [categories, set_categories] = useState([])
	const [loading, set_loading] = useState(true)
	const [new_name, set_new_name] = useState('')
	const [adding, set_adding] = useState(false)
	const [updating_id, set_updating_id] = useState(null)
	const [message, set_message] = useState(null)
	const [error, set_error] = useState('')

	const show_feedback = (text, is_error = false) => {
		if (is_error) {
			set_error(text)
			set_message(null)
		} else {
			set_message(text)
			set_error('')
		}
		setTimeout(() => {
			set_message(null)
			set_error('')
		}, 3000)
	}

	const load = async () => {
		set_loading(true)
		try {
			const cats = await fetch_categories()
			set_categories(cats)
		} catch (err) {
			console.error(err)
		} finally {
			set_loading(false)
		}
	}

	useEffect(() => {
		load()
	}, [])

	const handle_add = async () => {
		const trimmed = new_name.trim()
		if (!trimmed) {
			set_error('Please enter a category name.')
			return
		}
		const duplicate = categories.find(
			(c) => c.name.toLowerCase() === trimmed.toLowerCase()
		)
		if (duplicate) {
			set_error('A category with that name already exists.')
			return
		}
		set_adding(true)
		try {
			await add_category(trimmed)
			set_new_name('')
			show_feedback('Category added successfully.')
			await load()
		} catch (err) {
			show_feedback(err.message, true)
		} finally {
			set_adding(false)
		}
	}

	const handle_toggle = async (cat) => {
		set_updating_id(cat.id)
		try {
			await remove_category(cat.id, !cat.active)
			set_categories((prev) =>
				prev.map((c) =>
					c.id === cat.id ? { ...c, active: !c.active } : c
				)
			)
			show_feedback(
				`"${cat.name}" ${!cat.active ? 'activated' : 'deactivated'}.`
			)
		} catch (err) {
			show_feedback(err.message, true)
		} finally {
			set_updating_id(null)
		}
	}

	return (
		<div style={S.wrap}>
			{/* Add row */}
			<div style={S.addRow}>
				<input
					style={S.input}
					type="text"
					placeholder="New category name..."
					value={new_name}
					onChange={(e) => set_new_name(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && handle_add()}
					disabled={adding}
				/>
				<button
					style={{ ...S.addBtn, ...(adding ? S.addBtnDisabled : {}) }}
					onClick={handle_add}
					disabled={adding}
				>
					{adding ? 'Adding...' : 'Add category'}
				</button>
			</div>

			{/* Feedback */}
			{error && <p style={S.error}>{error}</p>}
			{message && <p style={S.success}>{message}</p>}

			{/* Table */}
			{loading ? (
				<p style={S.muted}>Loading categories…</p>
			) : categories.length === 0 ? (
				<p style={S.muted}>No categories found.</p>
			) : (
				<table style={S.table}>
					<thead>
						<tr>
							<th style={S.th}>Category</th>
							<th style={S.th}>Status</th>
							<th style={S.th}>Action</th>
						</tr>
					</thead>
					<tbody>
						{categories.map((cat, idx) => {
							const is_last = idx === categories.length - 1
							const td = is_last ? S.tdLast : S.td
							const nameTd = is_last
								? { ...S.nameTd, borderBottom: 'none' }
								: S.nameTd
							return (
								<tr key={cat.id}>
									<td style={nameTd}>{cat.name}</td>
									<td style={td}>
										<span
											style={
												cat.active
													? S.badgeActive
													: S.badgeInactive
											}
										>
											{cat.active ? 'Active' : 'Inactive'}
										</span>
									</td>
									<td style={td}>
										<button
											style={
												cat.active
													? S.deactivateBtn
													: S.activateBtn
											}
											onClick={() => handle_toggle(cat)}
											disabled={updating_id === cat.id}
										>
											{updating_id === cat.id
												? '...'
												: cat.active
												? 'Deactivate'
												: 'Activate'}
										</button>
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			)}
		</div>
	)
}

export default AdminCategories