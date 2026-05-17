import React, { useEffect, useState } from 'react'
import {
	fetch_public_dashboard_visibility,
	update_public_dashboard_visibility,
} from '../../backend/public_dashboard_settings_service.js'
import './admin_public_dashboard_settings.css'

const FIELD_LABELS = {
	category: 'Category',
	status: 'Status',
	ward: 'Ward',
	municipality: 'Municipality',
	description: 'Description',
	likes: 'Like count',
}

function AdminPublicDashboardSettings() {
	const [fields, set_fields] = useState(null)
	const [loading, set_loading] = useState(true)
	const [saving, set_saving] = useState(false)
	const [message, set_message] = useState(null)
	const [error, set_error] = useState(null)

	useEffect(() => {
		const load = async () => {
			try {
				const settings = await fetch_public_dashboard_visibility()
				set_fields(settings)
			} catch (err) {
				set_error(
					err.message || 'Failed to load public dashboard settings.'
				)
			} finally {
				set_loading(false)
			}
		}

		load()
	}, [])

	const handle_toggle = (field) => {
		set_fields((prev) => ({
			...prev,
			[field]: !prev[field],
		}))
	}

	const handle_save = async () => {
		set_saving(true)
		set_message(null)
		set_error(null)

		try {
			await update_public_dashboard_visibility(fields)
			set_message('Public dashboard settings saved.')
		} catch (err) {
			set_error(err.message || 'Failed to save settings.')
		} finally {
			set_saving(false)
		}
	}

	if (loading) {
		return (
			<div className="apds_card">
				<p className="apds_muted">Loading settings...</p>
			</div>
		)
	}

	if (error && !fields) {
		return (
			<div className="apds_card">
				<div className="apds_message apds_error">{error}</div>
			</div>
		)
	}

	if (!fields) {
		return null
	}

	return (
		<div className="apds_card">
			<div className="apds_header">
				<h2>Public dashboard field visibility</h2>
				<p>
					Choose which request fields are visible to unauthenticated
					public users.
				</p>
			</div>

			{error && <div className="apds_message apds_error">{error}</div>}
			{message && (
				<div className="apds_message apds_success">{message}</div>
			)}

			<div className="apds_fields">
				{Object.keys(FIELD_LABELS).map((field) => (
					<label className="apds_field" key={field}>
						<input
							type="checkbox"
							checked={Boolean(fields[field])}
							onChange={() => handle_toggle(field)}
						/>
						<span>{FIELD_LABELS[field]}</span>
					</label>
				))}
			</div>

			<button
				className="apds_save_btn"
				onClick={handle_save}
				disabled={saving}
			>
				{saving ? 'Saving...' : 'Save settings'}
			</button>
		</div>
	)
}

export default AdminPublicDashboardSettings
