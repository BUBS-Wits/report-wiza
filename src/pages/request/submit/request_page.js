import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, setDoc, getDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../../../firebase_config.js'
import Navbar from '../../../components/nav_bar/nav_bar.js'
import RequestForm from '../../../components/request_form/request_form.js'
import { get_data_uri, image_validate, get_date } from '../../../js/utility.js'
import './request_page.css'

function RequestPage() {
	const [scrolled, set_scrolled] = useState(false)
	const navigate = useNavigate()

	useEffect(() => {
		const on_scroll = () => set_scrolled(window.scrollY > 20)
		window.addEventListener('scroll', on_scroll)
		return () => window.removeEventListener('scroll', on_scroll)
	}, [])

	async function on_submit(request) {
		if (
			!request.input_validate() ||
			!(await image_validate(request.image)) ||
			!auth ||
			!auth.currentUser ||
			!('geolocation' in window.navigator)
		) {
			if (!auth || !auth.currentUser) {
				navigate('/')
			}
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
				image_url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23e0e0e0'/><rect x='32' y='32' width='192' height='192' fill='none' stroke='%239e9e9e' stroke-width='4'/><line x1='32' y1='32' x2='224' y2='224' stroke='%239e9e9e' stroke-width='4'/><line x1='224' y1='32' x2='32' y2='224' stroke='%239e9e9e' stroke-width='4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23757575' font-family='Arial, sans-serif' font-size='20'>No Image</text></svg>`,
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
