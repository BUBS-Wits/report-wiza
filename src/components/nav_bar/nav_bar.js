import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './nav_bar.css'

function Navbar() {
  const [scrolled, set_scrolled] = useState(false)

  useEffect(() => {
    const on_scroll = () => set_scrolled(window.scrollY > 20)
    window.addEventListener('scroll', on_scroll)
    return () => window.removeEventListener('scroll', on_scroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'navbar_scrolled' : ''}`}>
      <Link to="/" className="navbar_logo">
        <span className="logo_mark">W</span>
        <span className="logo_text">Report-wiza</span>
      </Link>
      <div className="navbar_links">
        <Link to="/" className="nav_link">Home</Link>
        <Link to="/about" className="nav_link">About Us</Link>
        <Link to="/contact" className="nav_link">Contact Us</Link>
        <Link to="/login" className="nav_cta">Login / Register</Link>
      </div>
    </nav>
  )
}

export default Navbar