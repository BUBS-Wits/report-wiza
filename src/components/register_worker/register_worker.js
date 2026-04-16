// src/pages/admin/components/register_worker.js
import React, { useState } from 'react'
import { register_worker_email } from '../../backend/admin_firebase.js'
import './register_worker.css'

function RegisterWorker({ on_registered }) {
	const [email, set_email] = useState('')
	const [loading, set_loading] = useState(false)
	const [message, set_message] = useState(null)
	const [is_error, set_is_error] = useState(false)

	const handle_submit = async (e) => {
		e.preventDefault()
		set_loading(true)
		set_message(null)

		try {
			await register_worker_email(email)
			set_message(`Registration email sent to ${email}`)
			set_is_error(false)
			set_email('')
			if (on_registered) {
				on_registered()
			}
		} catch (err) {
			set_message(err.message)
			set_is_error(true)
		} finally {
			set_loading(false)
		}
	}

	return (
		<div className="register_worker_card">
			<h2 className="register_worker_title">Register a worker</h2>
			<p className="register_worker_desc">
				Send a sign-in link to register a new municipal worker.
			</p>

			<form className="register_worker_form" onSubmit={handle_submit}>
				<div className="register_worker_row">
					<input
						className="register_worker_input"
						type="email"
						placeholder="worker@municipality.gov.za"
						value={email}
						onChange={(e) => set_email(e.target.value)}
						required
						disabled={loading}
					/>
					<button
						className="register_worker_btn"
						type="submit"
						disabled={loading || !email}
					>
						{loading ? 'Sending...' : 'Send email'}
					</button>
				</div>

				{message && (
					<div
						className={`register_worker_msg ${is_error ? 'error' : 'success'}`}
					>
						{message}
					</div>
				)}
			</form>
		</div>
	)
}

export default RegisterWorker
