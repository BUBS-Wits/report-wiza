// src/pages/admin/components/workers_list.js
import React from 'react'
import './workers_list.css'

function WorkersList({ workers, loading, revoking_uid, on_revoke }) {
	return (
		<div className="workers_list_card">
			<h2 className="workers_list_title">Current workers</h2>
			<p className="workers_list_desc">
				Revoke access to demote a worker back to resident.
			</p>

			{loading ? (
				<p className="workers_list_empty">Loading workers...</p>
			) : workers.length === 0 ? (
				<p className="workers_list_empty">No workers registered yet.</p>
			) : (
				<div className="workers_list">
					{workers.map((worker) => (
						<div className="workers_list_row" key={worker.id}>
							<div className="workers_list_info">
								<span className="workers_list_email">
									{worker.email}
								</span>
								<span className="workers_list_badge">
									Worker
								</span>
							</div>
							<button
								className="workers_list_revoke"
								onClick={() =>
									on_revoke(worker.id, worker.email)
								}
								disabled={revoking_uid === worker.id}
							>
								{revoking_uid === worker.id
									? 'Revoking...'
									: 'Revoke'}
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default WorkersList
