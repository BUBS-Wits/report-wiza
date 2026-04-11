import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/nav_bar/nav_bar.js'
function About() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#fff', fontFamily: 'DM Sans, sans-serif', padding: '120px 60px 60px' }}>
      <Navbar />
      <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '3rem', marginTop: '32px' }}>About Report-wiza</h1>
      <p style={{ color: '#94a3b8', maxWidth: '600px', lineHeight: '1.8' }}>
        Report-wiza is a municipal service delivery portal built by students at Wits University
        as part of COMS3009A — Software Design 2026. Our mission is to connect residents
        with their municipalities to improve service delivery across South African wards.
      </p>
    </div>
  )
}

export default About