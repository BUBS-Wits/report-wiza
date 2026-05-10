import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../../firebase_config.js'
import { WARD_API } from '../../../constants.js'
import Navbar from '../../../components/nav_bar/nav_bar.js'
import RequestForm from '../../../components/request_form/request_form.js'
import SubmitPromptModal from '../../../components/submit_prompt_modal/submit_prompt_modal.js'
import './request_page.css'

function RequestPage() {
	const navigate = useNavigate()

	// undefined  = Firebase hasn't resolved yet (brief loading state)
	// null       = confirmed not logged in (anonymous user — allowed)
	// object     = confirmed logged-in user
	const [current_user, set_current_user] = useState(undefined)
	const [submitting, set_submitting] = useState(false)
	const [show_modal, set_show_modal] = useState(false)
	const [pending_req, set_pending_req] = useState(null)

	// Resolve auth state ONCE on mount — never redirect, just observe
	useEffect(() => {
		const unsub = onAuthStateChanged(auth, (user) => {
			set_current_user(user ?? null)
		})
		return unsub
	}, [])

	/* ── Validation (no auth check — auth is optional) ────────────── */
	async function valid_attempt(request) {
		if (!request.loc_validate()) {
			console.error('Location/ward info missing:', request.loc_info)
			return false
		}
		if (!('geolocation' in window.navigator)) {
			console.error('Geolocation not available.')
			return false
		}
		if (!request.input_validate()) {
			console.error('Form fields incomplete.')
			return false
		}
		if (!(await request.image_validate())) {
			console.error('Image invalid or missing.')
			return false
		}
		return true
	}

	/* ── Send to backend ──────────────────────────────────────────── */
	async function submit_request(request) {
		set_submitting(true)
		try {
			// Build headers — token only if logged in
			const headers = { 'Content-Type': 'application/json' }
			if (current_user) {
				const token = await current_user.getIdToken()
				headers['Authorization'] = `Bearer ${token}`
			}

			const res = await fetch('/api/submit-request', {
				method: 'POST',
				headers,
				body: request.to_string(),
			})

			if (!res.ok) {
				alert('Failed to submit request. Check console for details.')

				// --- NEW SAFE PARSING ---
				const error_text = await res.text()
				try {
					// Try to parse it as JSON if the server sent a nice error
					console.error(
						'Server Error (JSON):',
						JSON.parse(error_text)
					)
				} catch (parse_error) {
					// Fallback to logging the raw text/HTML if the server crashed hard
					console.error('Server Error (HTML/Text):', error_text)
				}
			} else {
				alert('Request successfully submitted.')
				console.log(await res.json())
			}
		} catch (e) {
			console.error('Error during upload:', e)
		} finally {
			set_submitting(false)
		}
	}

	/* ── Form submit handler ──────────────────────────────────────── */
	async function on_submit(request) {
		if (!(await valid_attempt(request))) {
			return
		}

		if (!current_user) {
			// Not logged in — pause and show the account prompt
			set_pending_req(request)
			set_show_modal(true)
			return
		}

		// Logged in — go straight to submit
		await submit_request(request)
	}

	/* ── Modal: chose anonymous ───────────────────────────────────── */
	async function on_continue_anonymous() {
		set_show_modal(false)
		if (pending_req) {
			await submit_request(pending_req)
			set_pending_req(null)
		}
	}

	/* ── Modal: cancelled ─────────────────────────────────────────── */
	function on_modal_close() {
		set_show_modal(false)
		set_pending_req(null)
	}

	// Brief loading state while Firebase resolves — prevents flash of form
	// for logged-in users and avoids any premature auth decisions
	if (current_user === undefined) {
		return (
			<div className="service_request_page">
				<Navbar />
				<div className="request_page_loading">Loading…</div>
			</div>
		)
	}

	return (
		<div className="service_request_page">
			<Navbar />

			<SubmitPromptModal
				is_open={show_modal}
				on_close={on_modal_close}
				on_continue={on_continue_anonymous}
			/>

			<header className="request_page_header">
				<p className="request_page_eyebrow">Municipal Service Portal</p>
				<h1>
					Submit a <span>Service Request</span>
				</h1>
				<p className="request_page_subtitle">
					Report infrastructure issues in your ward. Your report is
					tagged to your location and routed to the correct municipal
					team automatically.
				</p>
			</header>

			<div className="request_page_divider" />

			<nav className="request_page_steps">
				<div className="step_item active">
					<span className="step_number">1</span>
					<span className="step_label">Your Details</span>
				</div>
				<div className="step_item active">
					<span className="step_number">2</span>
					<span className="step_label">Issue Info</span>
				</div>
				<div className="step_item">
					<span className="step_number">3</span>
					<span className="step_label">Location</span>
				</div>
				<div className="step_item">
					<span className="step_number">4</span>
					<span className="step_label">Review</span>
				</div>
			</nav>

			<main className="request_page_main">
				<div className="request_form_card">
					<RequestForm onSubmit={on_submit} submitting={submitting} />
				</div>
			</main>
		</div>
	)
}

export default RequestPage
