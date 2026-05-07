import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/login_page/login.js'
import LandingPage from './pages/landing_page/landing_page.js'
import About from './pages/about_page/about.js'
import Contact from './pages/contact_page/contact.js'
import PublicDashboard from './pages/public_dashboard/public_dashboard.js'
import RequestPage from './pages/request/submit/request_page.js'
import AdminDashboard from './pages/admin_dashboard/admin_dashboard.js'
import WorkerVerify from './pages/worker_verify/worker_verify.js'
import WorkerDashboard from './pages/worker_dashboard/worker_dashboard.js'
import CategoryReport from './pages/category_report/category_report.js'
import WorkerMessages from './pages/worker_messages/worker_messages.js'
import ResidentDashboard from './pages/resident_dashboard/resident_dashboard.js'
import './app.css'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/about" element={<About />} />
				<Route path="/contact" element={<Contact />} />
				<Route path="/dashboard" element={<PublicDashboard />} />
				<Route path="/request" element={<RequestPage />} />
				<Route path="/login" element={<Login />} />
				<Route path="/worker-verify" element={<WorkerVerify />} />
				<Route path="/worker-dashboard" element={<WorkerDashboard />} />
				<Route
					path="/worker-dashboard/messages"
					element={<WorkerMessages />}
				/>
<<<<<<< HEAD
				<Route path="/worker-dashboard" element={<WorkerDashboard />} />
=======
>>>>>>> main
				<Route
					path="/resident-dashboard"
					element={<ResidentDashboard />}
				/>
				<Route
					path="/admin"
					element={<AdminDashboard section="workers" />}
				/>
				<Route
					path="/admin/workers"
					element={<AdminDashboard section="workers" />}
				/>
				<Route
					path="/admin/requests"
					element={<AdminDashboard section="requests" />}
				/>
				<Route
					path="/admin/residents"
					element={<AdminDashboard section="residents" />}
				/>
				<Route
					path="/admin/messaging"
					element={<AdminDashboard section="messaging" />}
				/>
				<Route
					path="/admin/settings"
					element={<AdminDashboard section="settings" />}
				/>
				<Route
					path="/admin/analytics/category-report"
					element={<CategoryReport />}
				/>
			</Routes>
		</BrowserRouter>
	)
}
export default App
