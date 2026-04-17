import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PublicDashboard from './pages/public_dashboard/public_dashboard.js'
import './app.css'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<PublicDashboard />} />
				<Route path="/dashboard" element={<PublicDashboard />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App