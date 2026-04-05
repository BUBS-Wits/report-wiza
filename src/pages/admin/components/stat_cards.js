// src/pages/admin/components/stat_cards.js
import React from 'react'
import './stat_cards.css'

function StatCards({ total, pending, revoked }) {
	return (
		<div className="stat_cards">
			<div className="stat_card">
				<p className="stat_label">Total workers</p>
				<p className="stat_val">{total}</p>
			</div>
			<div className="stat_card">
				<p className="stat_label">Pending verification</p>
				<p className="stat_val">{pending}</p>
			</div>
			<div className="stat_card">
				<p className="stat_label">Revoked this month</p>
				<p className="stat_val">{revoked}</p>
			</div>
		</div>
	)
}

export default StatCards