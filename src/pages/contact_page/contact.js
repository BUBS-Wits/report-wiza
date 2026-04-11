import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/nav_bar/nav_bar.js'

function Contact() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#fff', fontFamily: 'DM Sans, sans-serif', padding: '120px 60px 60px' }}>
      <Navbar />
      <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '3rem', marginTop: '32px' }}>Contact Us</h1>
      <p style={{ color: '#94a3b8', maxWidth: '600px', lineHeight: '1.8' }}>
        For queries about Report-wiza, reach out to the development team at Wits University.
        For actual municipal service requests, please use the reporting portal after logging in.
      </p>
    </div>
  )
}

export default Contact