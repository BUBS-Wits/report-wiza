import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../../firebase_config.js'
import { get_date } from '../../../utility.js'
import { WARD_API, PLACEHOLDER_IMAGE } from '../../../constants.js'
import Navbar from '../../../components/nav_bar/nav_bar.js'
import RequestForm from '../../../components/request_form/request_form.js'
import './request_page.css'

function RequestPage() {
	const navigate = useNavigate()
	const [submitting, setSubmitting] = useState(false)

	async function valid_attempt(request) {
		if (
			!request.input_validate() ||
			!(await request.image_validate()) ||
			!auth ||
			!auth.currentUser ||
			!('geolocation' in window.navigator)
		) {
			if (!request.loc_validate()) {
				console.error(
					`Failed to get ward, province and/or municipality info from API: "${WARD_API}"`,
					request.loc_info
				)
			} else if (!auth || !auth.currentUser) {
				console.error('Please login...')
				navigate('/')
			} else if (!('geolocation' in window.navigator)) {
				console.error(
					'Geolocation API not found in `window.navigator`.'
				)
			} else {
				console.error('Information missing...')
			}
			return false
		}
		return true
	}

	async function on_submit(request) {
		if (!(await valid_attempt(request))) {
			return
		}

		setSubmitting(true)
		try {
			request.set_placeholder_image()
			const token = await auth.currentUser.getIdToken()
			const req = await fetch('/api/submit-request', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: request.to_string(),
			})
			if (!req.ok) {
				alert('Failed to submit request. Browse console logs.')
				console.error('Failed:\n', await req.json())
			} else {
				alert('Request successfully submitted.')
				console.log(await req.json())
			}
		} catch (e) {
			console.error('Error during upload:', e)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="service_request_page">
			<Navbar />

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