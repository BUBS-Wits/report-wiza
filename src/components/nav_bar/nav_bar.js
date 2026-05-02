import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './nav_bar.css'

function Navbar() {
	const [scrolled, set_scrolled] = useState(false)
	const [mobile_menu_open, set_mobile_menu_open] = useState(false)

	useEffect(() => {
		const on_scroll = () => set_scrolled(window.scrollY > 20)
		window.addEventListener('scroll', on_scroll)
		return () => window.removeEventListener('scroll', on_scroll)
	}, [])

	// Toggles the mobile menu open and closed
	const toggle_menu = () => {
		set_mobile_menu_open(!mobile_menu_open)
	}

	// Closes the menu when a link is clicked
	const close_menu = () => {
		set_mobile_menu_open(false)
	}

	return (
		<nav className={`navbar ${scrolled ? 'navbar_scrolled' : ''}`}>
			<Link to="/" className="navbar_logo" onClick={close_menu}>
				<span className="logo_mark">W</span>
				<span className="logo_text">Report-wiza</span>
			</Link>

			{/* Hamburger Icon - Only visible on mobile */}
			<div className="mobile_menu_icon" onClick={toggle_menu}>
				{mobile_menu_open ? '✖' : '☰'}
			</div>

			{/* Nav Links - Toggles the 'active' class on mobile */}
			<div className={`navbar_links ${mobile_menu_open ? 'active' : ''}`}>
				<Link to="/" className="nav_link" onClick={close_menu}>
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
