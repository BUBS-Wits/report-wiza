import React from 'react'
import { Link } from 'react-router-dom'
import './landing_page.css'
import Navbar from '../../components/nav_bar/nav_bar.js'

function LandingPage() {
	return (
		<div className="landing_root">
			<Navbar />

			{/* HERO */}
			<section className="landing_hero">
				<div className="hero_grid_overlay" />
				<div className="hero_content">
					<div className="hero_badge">
						Municipal Service Delivery Portal
					</div>
					<h1 className="hero_heading">
						Your Ward.
						<br />
						<span className="hero_heading_accent">Your Voice.</span>
						<br />
						Your City.
					</h1>
					<p className="hero_subtext">
						Report potholes, water outages, electricity faults and
						more — directly to your municipality. Track every
						request in real time.
					</p>
					<div className="hero_actions">
						<Link to="/request" className="btn_primary">
							Report an Issue
						</Link>
						<Link to="/dashboard" className="btn_secondary">
							View Public Dashboard
						</Link>
					</div>
				</div>
				<div className="hero_stat_row">
					<div className="hero_stat">
						<span className="stat_number">2,400+</span>
						<span className="stat_label">Requests Submitted</span>
					</div>
					<div className="hero_stat_divider" />
					<div className="hero_stat">
						<span className="stat_number">87%</span>
						<span className="stat_label">Resolution Rate</span>
					</div>
					<div className="hero_stat_divider" />
					<div className="hero_stat">
						<span className="stat_number">14</span>
						<span className="stat_label">Wards Covered</span>
					</div>
				</div>
			</section>

			{/* FEATURES */}
			<section className="landing_features">
				<h2 className="section_heading">How It Works</h2>
				<div className="features_grid">
					<div className="feature_card">
						<div className="feature_icon">📍</div>
						<h3>Submit a Request</h3>
						<p>
							Pin your location, choose a category, and describe
							the issue. Attach a photo for faster resolution.
						</p>
					</div>
					<div className="feature_card">
						<div className="feature_icon">🔔</div>
						<h3>Get Notified</h3>
						<p>
							Receive real-time updates as your request moves from
							open to in progress to resolved.
						</p>
					</div>
					<div className="feature_card">
						<div className="feature_icon">🗺️</div>
						<h3>Track on the Map</h3>
						<p>
							View all requests in your ward on a live map with
							official South African ward boundaries.
						</p>
					</div>
					<div className="feature_card">
						<div className="feature_icon">⭐</div>
						<h3>Rate the Service</h3>
						<p>
							Once resolved, rate your experience and help your
							municipality improve service delivery.
						</p>
					</div>
				</div>
			</section>

			{/* FOOTER */}
			<footer className="landing_footer">
				<span>© 2026 Report-wiza · COMS3009A · Wits University</span>
				<div className="footer_links">
					<Link to="/about">About</Link>
					<Link to="/contact">Contact</Link>
					<Link to="/login">Login</Link>
				</div>
			</footer>
		</div>
	)
}

export default LandingPage
