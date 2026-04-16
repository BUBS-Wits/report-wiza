// src/pages/admin/components/top_bar.js
import React from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase_config.js'
import { useNavigate } from 'react-router-dom'
import './top_bar.css'

const section_titles = {
	workers: {
		title: 'Workers',
		sub: 'Manage worker registrations and access',
	},
	requests: {
		title: 'Requests',
		sub: 'Assign, prioritise and close requests',
	},
	messaging: {
		title: 'Messaging',
		sub: 'View all resident and worker conversations',
	},
	residents: {
		title: 'Residents',
		sub: 'Manage resident access and feedback',
	},
	analytics: { title: 'Analytics', sub: 'Reports and performance insights' },
	settings: { title: 'Settings', sub: 'Configure platform settings' },
}

function TopBar({ active_section }) {
	const navigate = useNavigate()
	const { title, sub } = section_titles[active_section] || {}

	const handle_signout = async () => {
		await signOut(auth)
		navigate('/login')
	}

	return (
		<div className="top_bar">
			<div>
				<h1 className="top_bar_title">{title}</h1>
				<p className="top_bar_sub">{sub}</p>
			</div>
			<button className="top_bar_signout" onClick={handle_signout}>
				Sign out
			</button>
		</div>
	)
}

export default TopBar
