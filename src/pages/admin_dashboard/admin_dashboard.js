import React, { useState, useEffect } from 'react'
import {
	subscribe_to_workers, // <-- UPDATED
	revoke_worker_role,
} from '../../backend/admin_firebase.js'
import Sidebar from '../../components/admin_sidebar/admin_sidebar.js'
import TopBar from '../../components/top_bar/top_bar.js'
import StatCards from '../../components/stat_cards/stat_cards.js'
import RegisterWorker from '../../components/register_worker/register_worker.js'
import WorkersList from '../../components/workers_list/workers_list.js'
import AdminRequests from '../../components/admin_requests/admin_requests.js'
import AdminPublicDashboardSettings from '../../components/admin_public_dashboard_settings/admin_public_dashboard_settings.js'
import AdminMessagingReview from '../../components/admin_review_messages/admin_review_messages.js'
import AdminWorkerPerformance from '../../components/admin_worker_performance/admin_worker_performance.js'
import AdminCustomReport from '../../components/admin_custom_report/admin_custom_report.js'
import './admin_dashboard.css'

function AdminDashboard({ section = 'workers' }) {
	const [active_section, set_active_section] = useState(section)
	const [workers, set_workers] = useState([])
	const [workers_loading, set_workers_loading] = useState(true)
	const [revoking_uid, set_revoking_uid] = useState(null)
	const [message, set_message] = useState(null)
	const [is_error, set_is_error] = useState(false)

	useEffect(() => {
		set_active_section(section)
	}, [section])

	/* ── Live Load Workers ────────────────────────────────────────────── */
	useEffect(() => {
		set_workers_loading(true)

		const unsubscribe = subscribe_to_workers(
			(live_workers) => {
				set_workers(live_workers)
				set_workers_loading(false)
			},
			(err) => {
				set_message(err.message)
				set_is_error(true)
				set_workers_loading(false)
			}
		)

		// Cleanup listener when component unmounts
		return () => unsubscribe()
	}, [])

	const handle_revoke = async (uid, email) => {
		if (
			!window.confirm(
				`Are you sure you want to revoke worker access for ${email}?`
			)
		) {
			return
		}
		set_revoking_uid(uid)
		try {
			await revoke_worker_role(uid)
			// Note: We no longer need to manually filter the array here!
			// The live listener will instantly detect the role change and update the UI.
			set_message(`Worker role revoked for ${email}`)
			set_is_error(false)
		} catch (err) {
			set_message(err.message)
			set_is_error(true)
		} finally {
			set_revoking_uid(null)
		}
	}

	const render_section = () => {
		switch (active_section) {
			case 'workers':
				return (
					<>
						<StatCards
							total={workers.length}
							pending={
								workers.filter((w) => !w.is_verified).length
							}
							revoked={0}
						/>
						{/* We no longer need a manual on_registered callback because the live listener handles it! */}
						<RegisterWorker />
						<WorkersList
							workers={workers}
							loading={workers_loading}
							revoking_uid={revoking_uid}
							on_revoke={handle_revoke}
						/>
					</>
				)
			case 'requests':
				return <AdminRequests />

			case 'messaging':
				return <AdminMessagingReview />

			case 'worker_performance':
				return <AdminWorkerPerformance />

			case 'custom_report':
				return <AdminCustomReport />

			case 'residents':
				return (
					<div className="admin_placeholder">
						<p>Residents Management</p>
						<span>US038, US039, US040 — Next feature on list.</span>
					</div>
				)
			case 'analytics':
				return (
					<div className="admin_placeholder">
						<p>Analytics Overview</p>
						<span>
							Navigate to Category Report in the sidebar for full
							data.
						</span>
					</div>
				)
			case 'settings':
				return <AdminPublicDashboardSettings />
			default:
				return null
		}
	}

	return (
		<div className="admin_page">
			<Sidebar active={active_section} on_change={set_active_section} />
			<div className="admin_main">
				<TopBar active_section={active_section} />
				<div className="admin_content">
					{message && (
						<div
							className={`admin_toast ${is_error ? 'error' : 'success'}`}
						>
							{message}
							<button onClick={() => set_message(null)}>✕</button>
						</div>
					)}
					{render_section()}
				</div>
			</div>
		</div>
	)
}

export default AdminDashboard
