import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/login_page/login.js'
import LandingPage from './pages/landing_page/landing_page.js'
import About from './pages/about_page/about.js'
import Contact from './pages/contact_page/contact.js'
import './app.css'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/about" element={<About />} />
				<Route path="/contact" element={<Contact />} />
				<Route path="/login" element={<Login />} />
				<Route
					path="/resident"
					element={<div>Resident Dashboard</div>}
				/>
			</Routes>
		</BrowserRouter>
	)
}
export default App
