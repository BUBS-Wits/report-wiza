import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, setDoc, getDoc, doc } from 'firebase/firestore'
import { auth, db, storage } from '../../../firebase_config.js'
import { get_date } from '../../../js/utility.js'
import { PLACEHOLDER_IMAGE } from '../../../constants.js'
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
			const now = new Date(Date.now())
			const d = get_date(now)
			const new_doc_ref = doc(collection(db, 'service_requests'))
			const timestamp = `${d.year}${d.month}${d.day}${d.hours}${d.minutes}${d.seconds}`
			const my_new_id = `${timestamp}_${new_doc_ref.id}`
			await setDoc(doc(db, 'service_requests', my_new_id), {
				user_id: auth.currentUser.uid,
				category: request.category,
				description: request.description,
				image_url: PLACEHOLDER_IMAGE,
				location: `SRID=4326;POINT(${request.longitude} ${request.latitude})`,
				sa_ward: request.get_ward(),
				status: 'pending',
				created_at: now.toUTCString(),
			})

			alert('Upload successful!')
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
