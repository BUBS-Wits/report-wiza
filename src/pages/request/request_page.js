import React, { useState, useEffect } from 'react'
import { db } from '../../firebase_config.js'
import { collection, addDoc } from 'firebase/firestore'
import { storage } from '../../firebase_config.js'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import Navbar from '../../components/nav_bar/nav_bar.js'
import RequestForm from '../../components/request_form/request_form.js'
import { get_data_uri, image_validate } from '../../js/utility.js'
import './request_page.css'

function RequestPage() {
	const [scrolled, set_scrolled] = useState(false)

	useEffect(() => {
		const on_scroll = () => set_scrolled(window.scrollY > 20)
		window.addEventListener('scroll', on_scroll)
		return () => window.removeEventListener('scroll', on_scroll)
	}, [])

	async function on_submit(request) {
		if (
			!request.input_validate() ||
			!(await image_validate(request.image))
		) {
			return
		}
		try {
			const file_ref = ref(
				storage,
				`images/${Date.now()}_${request.image.name}`
			)
			const upload_result = await uploadBytes(file_ref, request.image)

			const download_url = await getDownloadURL(upload_result.ref)

			await addDoc(collection(db, 'photos'), {
				category: request.category,
				description: request.description,
				image_url: download_url,
				timestamp: new Date(),
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
