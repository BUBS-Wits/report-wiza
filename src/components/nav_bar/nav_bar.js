import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase_config.js'
import './nav_bar.css'

const ROLE_ROUTES = {
	worker: '/worker-dashboard',
	resident: '/resident-dashboard',
	admin: '/admin',
}

function Navbar() {
	const [scrolled, set_scrolled] = useState(false)
	const [mobile_menu_open, set_mobile_menu_open] = useState(false)
	const [homeRoute, set_homeRoute] = useState('/')

	useEffect(() => {
		const on_scroll = () => set_scrolled(window.scrollY > 20)
		window.addEventListener('scroll', on_scroll)
		return () => window.removeEventListener('scroll', on_scroll)
	}, [])

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				set_homeRoute('/')
				return
			}
			try {
				const snap = await getDoc(doc(db, 'users', user.uid))
				const role = snap.data()?.role
				set_homeRoute(ROLE_ROUTES[role] ?? '/')
			} catch {
				set_homeRoute('/')
			}
		})
		return () => unsub()
	}, [])

	const toggle_menu = () => set_mobile_menu_open(!mobile_menu_open)
	const close_menu = () => set_mobile_menu_open(false)

	return (
		<nav className={`navbar ${scrolled ? 'navbar_scrolled' : ''}`}>
			<Link to={homeRoute} className="navbar_logo" onClick={close_menu}>
				<span className="logo_mark">W</span>
				<span className="logo_text">Report-wiza</span>
			</Link>

			<div className="mobile_menu_icon" onClick={toggle_menu}>
				{mobile_menu_open ? '✖' : '☰'}
			</div>

			<div className={`navbar_links ${mobile_menu_open ? 'active' : ''}`}>
				<Link to={homeRoute} className="nav_link" onClick={close_menu}>
					Home
				</Link>
				<Link to="/about" className="nav_link" onClick={close_menu}>
					About Us
				</Link>
				<Link to="/contact" className="nav_link" onClick={close_menu}>
					Contact Us
				</Link>
				<Link to="/login" className="nav_cta" onClick={close_menu}>
					Login / Register
				</Link>
			</div>
		</nav>
	)
}

export default Navbar
