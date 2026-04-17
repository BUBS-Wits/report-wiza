import React, { useState, useEffect } from 'react'
import {
	fetch_workers,
	revoke_worker_role,
} from '../../backend/admin_firebase.js'
import Sidebar from '../../components/sidebar/sidebar.js'
import TopBar from '../../components/top_bar/top_bar.js'
import StatCards from '../../components/stat_cards/stat_cards.js'
import RegisterWorker from '../../components/register_worker/register_worker.js'
import WorkersList from '../../components/workers_list/workers_list.js'
import './admin_dashboard.css'

function AdminDashboard() {
	const [active_section, set_active_section] = useState('workers')
	const [workers, set_workers] = useState([])
	const [workers_loading, set_workers_loading] = useState(true)
	const [revoking_uid, set_revoking_uid] = useState(null)
	const [message, set_message] = useState(null)
	const [is_error, set_is_error] = useState(false)

	useEffect(() => {
		load_workers()
	}, [])

	const load_workers = async () => {
		set_workers_loading(true)
		try {
			const result = await fetch_workers()
			set_workers(result)
		} catch (err) {
			console.error(err)
		} finally {
			set_workers_loading(false)
		}
	}

	const handle_revoke = async (uid, email) => {
		set_revoking_uid(uid)
		try {
			await revoke_worker_role(uid)
			set_workers((prev) => prev.filter((w) => w.id !== uid))
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
							pending={0}
							revoked={0}
						/>
						<RegisterWorker on_registered={load_workers} />
						<WorkersList
							workers={workers}
							loading={workers_loading}
							revoking_uid={revoking_uid}
							on_revoke={handle_revoke}
						/>
						{message && (
							<div
								className={`admin_message ${is_error ? 'error' : 'success'}`}
							>
								{message}
							</div>
						)}
					</>
				)
			case 'requests':
				return (
					<div className="admin_placeholder">
						<p>Requests section — coming soon</p>
						<span>US026, US027, US028, US029, US030</span>
					</div>
				)
			case 'messaging':
				return (
					<div className="admin_placeholder">
						<p>Messaging section — coming soon</p>
						<span>US033</span>
					</div>
				)
			case 'residents':
				return (
					<div className="admin_placeholder">
						<p>Residents section — coming soon</p>
						<span>US038, US039, US040</span>
					</div>
				)
			case 'analytics':
				return (
					<div className="admin_placeholder">
						<p>Analytics section — coming soon</p>
						<span>US045, US046, US047, US048, US050</span>
					</div>
				)
			case 'settings':
				return (
					<div className="admin_placeholder">
						<p>Settings section — coming soon</p>
						<span>US044</span>
					</div>
				)
			default:
				return null
		}
	}

	return (
		<div className="admin_page">
			<Sidebar active={active_section} on_change={set_active_section} />
			<div className="admin_main">
				<TopBar active_section={active_section} />
				<div className="admin_content">{render_section()}</div>
			</div>
		</div>
	)
}

export default AdminDashboard
