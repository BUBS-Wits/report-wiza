// src/pages/admin/admin_dashboard.js
// Main admin dashboard. Handles worker registration and role revocation.

import React, { useState, useEffect } from 'react'
import {
	register_worker_email,
	fetch_workers,
	revoke_worker_role,
} from '../../backend/admin_firebase.js'
import './admin_dashboard.css'

function AdminDashboard() {
	const [email, set_email] = useState('')
	const [loading, set_loading] = useState(false)
	const [message, set_message] = useState(null)
	const [is_error, set_is_error] = useState(false)

	// List of current workers
	const [workers, set_workers] = useState([])
	const [workers_loading, set_workers_loading] = useState(true)

	// Track which worker is being revoked
	const [revoking_uid, set_revoking_uid] = useState(null)

	// Load workers when page loads
	useEffect(() => {
		load_workers()
	}, [])

	const load_workers = async () => {
		set_workers_loading(true)
		try {
			const result = await fetch_workers()
			set_workers(result)
		} catch (err) {
			console.error(err)
		} finally {
			set_workers_loading(false)
		}
	}

	const handle_register = async (e) => {
		e.preventDefault()
		set_loading(true)
		set_message(null)

		try {
			await register_worker_email(email)
			set_message(`Registration email sent to ${email}`)
			set_is_error(false)
			set_email('')
		} catch (err) {
			set_message(err.message)
			set_is_error(true)
		} finally {
			set_loading(false)
		}
	}

	const handle_revoke = async (uid, worker_email) => {
		set_revoking_uid(uid)
		try {
			await revoke_worker_role(uid)
			// Remove from list immediately without reloading
			set_workers((prev) => prev.filter((w) => w.id !== uid))
			set_message(`Worker role revoked for ${worker_email}`)
			set_is_error(false)
		} catch (err) {
			set_message(err.message)
			set_is_error(true)
		} finally {
			set_revoking_uid(null)
		}
	}

	return (
		<div className="admin_page">
			<div className="admin_container">

				<header className="admin_header">
					<h1 className="admin_title">Admin Dashboard</h1>
					<p className="admin_sub">Manage worker registrations</p>
				</header>

				{/* Success or error message */}
				{message && (
					<div className={`admin_message ${is_error ? 'admin_message_error' : 'admin_message_success'}`}>
						{message}
					</div>
				)}

				{/* Register worker card */}
				<div className="admin_card">
					<h2 className="admin_card_title">Register a Worker</h2>
					<p className="admin_card_desc">
						Enter the email address of the person you want to register
						as a municipal worker. They will receive a sign-in link.
					</p>

					<form className="admin_form" onSubmit={handle_register}>
						<div className="admin_field">
							<label className="admin_label">Email address</label>
							<input
								className="admin_input"
								type="email"
								placeholder="worker@municipality.gov.za"
								value={email}
								onChange={(e) => set_email(e.target.value)}
								required
								disabled={loading}
							/>
						</div>

						<button
							className="admin_btn"
							type="submit"
							disabled={loading || !email}
						>
							{loading ? 'Sending...' : 'Send Registration Email'}
						</button>
					</form>
				</div>

				{/* Workers list card */}
				<div className="admin_card" style={{ marginTop: '24px' }}>
					<h2 className="admin_card_title">Current Workers</h2>
					<p className="admin_card_desc">
						Revoke access for any worker to demote them back to resident.
					</p>

					{workers_loading ? (
						<p className="admin_empty">Loading workers...</p>
					) : workers.length === 0 ? (
						<p className="admin_empty">No workers registered yet.</p>
					) : (
						<div className="admin_workers_list">
							{workers.map((worker) => (
								<div className="admin_worker_row" key={worker.id}>
									<div className="admin_worker_info">
										<span className="admin_worker_email">
											{worker.email}
										</span>
										<span className="admin_worker_badge">Worker</span>
									</div>
									<button
										className="admin_revoke_btn"
										onClick={() => handle_revoke(worker.id, worker.email)}
										disabled={revoking_uid === worker.id}
									>
										{revoking_uid === worker.id ? 'Revoking...' : 'Revoke'}
									</button>
								</div>
							))}
						</div>
					)}
				</div>

			</div>
		</div>
	)
}

export default AdminDashboard