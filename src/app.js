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
import ProtectedRoute from './components/protected_route/protected_route.js'
import './app.css'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				{/* Public routes */}
				<Route path="/" element={<LandingPage />} />
				<Route path="/about" element={<About />} />
				<Route path="/contact" element={<Contact />} />
				<Route path="/dashboard" element={<PublicDashboard />} />
				<Route path="/request" element={<RequestPage />} />
				<Route path="/login" element={<Login />} />
				<Route path="/worker-verify" element={<WorkerVerify />} />

				{/* Worker protected routes */}
				<Route
					path="/worker-dashboard"
					element={
						<ProtectedRoute allowed_roles={['worker']}>
							<WorkerDashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/worker-dashboard/messages"
					element={
						<ProtectedRoute allowed_roles={['worker']}>
							<WorkerMessages />
						</ProtectedRoute>
					}
				/>

				{/* Resident protected routes */}
				<Route
					path="/resident-dashboard"
					element={
						<ProtectedRoute allowed_roles={['resident']}>
							<ResidentDashboard />
						</ProtectedRoute>
					}
				/>

				{/* Admin protected routes */}
				<Route
					path="/admin"
					element={
						<ProtectedRoute allowed_roles={['admin']}>
							<AdminDashboard section="workers" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/admin/workers"
					element={
						<ProtectedRoute allowed_roles={['admin']}>
							<AdminDashboard section="workers" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/admin/requests"
					element={
						<ProtectedRoute allowed_roles={['admin']}>
							<AdminDashboard section="requests" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/admin/residents"
					element={
						<ProtectedRoute allowed_roles={['admin']}>
							<AdminDashboard section="residents" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/admin/messaging"
					element={
						<ProtectedRoute allowed_roles={['admin']}>
							<AdminDashboard section="messaging" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/admin/settings"
					element={
						<ProtectedRoute allowed_roles={['admin']}>
							<AdminDashboard section="settings" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/admin/analytics/category-report"
					element={
						<ProtectedRoute allowed_roles={['admin']}>
							<CategoryReport />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</BrowserRouter>
	)
}
export default App