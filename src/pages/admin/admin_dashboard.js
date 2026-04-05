// src/pages/admin/admin_dashboard.js
// Main admin dashboard page. Currently handles worker registration.
// Admin types an email, hits send, and Firebase emails the worker a sign-in link.

import React, { useState } from 'react'
import { register_worker_email } from '../../backend/admin_firebase.js'
import './admin_dashboard.css'

function AdminDashboard() {
	// The email address the admin wants to register as a worker
	const [email, set_email] = useState('')
	// True while the email is being sent
	const [loading, set_loading] = useState(false)
	// Success or error message to show after submission
	const [message, set_message] = useState(null)
	const [is_error, set_is_error] = useState(false)

	const handle_register = async (e) => {
		e.preventDefault()
		set_loading(true)
		set_message(null)

		try {
			await register_worker_email(email)
			set_message(`Registration email sent to ${email}`)
			set_is_error(false)
			set_email('') // Clear the input after success
		} catch (err) {
			set_message(err.message)
			set_is_error(true)
		} finally {
			set_loading(false)
		}
	}

	return (
		<div className="admin_page">
			<div className="admin_container">

				<header className="admin_header">
					<h1 className="admin_title">Admin Dashboard</h1>
					<p className="admin_sub">Manage worker registrations</p>
				</header>

				{/* Worker registration card */}
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

						{/* Success or error message */}
						{message && (
							<div className={`admin_message ${is_error ? 'admin_message_error' : 'admin_message_success'}`}>
								{message}
							</div>
						)}

						<button
							className="admin_btn"
							type="submit"
							disabled={loading || !email}
						>
							{loading ? 'Sending...' : 'Send Registration Email'}
						</button>
					</form>
				</div>

			</div>
		</div>
	)
}

export default AdminDashboard