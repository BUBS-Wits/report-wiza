import React, { useState, useEffect } from 'react'
import Navbar from '../../components/nav_bar/nav_bar.js'
import RequestForm from '../../components/request_form/request_form.js'
import './request_page.css'

function RequestPage() {
	const [scrolled, set_scrolled] = useState(false)

	useEffect(() => {
		const on_scroll = () => set_scrolled(window.scrollY > 20)
		window.addEventListener('scroll', on_scroll)
		return () => window.removeEventListener('scroll', on_scroll)
	}, [])

	function on_submit(request) {
		console.log('hi')
		console.log(request)
	}

	return (
		<div className="service_request_page">
			<Navbar />
			<main>
				<RequestForm onSubmit={on_submit} />
			</main>
		</div>
	)
}

export default RequestPage
