import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, setDoc, getDoc, doc } from 'firebase/firestore'
import { auth, db, storage } from '../../../firebase_config.js'
import { get_date } from '../../../utility.js'
import { WARD_API, PLACEHOLDER_IMAGE } from '../../../constants.js'
import Navbar from '../../../components/nav_bar/nav_bar.js'
import RequestForm from '../../../components/request_form/request_form.js'
import './request_page.css'

function RequestPage() {
	const navigate = useNavigate()

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
					this.loc_info
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
		try {
			// TODO: Add uploading of image to some storage bucket
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
			}
			alert('Request successfully submitted.')
			console.log(await req.json())
		} catch (e) {
			console.error('Error during upload:', e)
		}
	}

	return (
		<div className="service_request_page">
			<Navbar />
			<header>
				<h1>Request Form</h1>
			</header>
			<main>
				<RequestForm onSubmit={on_submit} />
			</main>
		</div>
	)
}

export default RequestPage
