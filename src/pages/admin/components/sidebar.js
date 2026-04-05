// src/pages/admin/components/sidebar.js
import React from 'react'
import './sidebar.css'

const nav_items = [
	{
		section: 'Management',
		items: [
			{ id: 'workers', label: 'Workers', ready: true },
			{ id: 'requests', label: 'Requests', ready: true },
			{ id: 'messaging', label: 'Messaging', ready: true },
			{ id: 'residents', label: 'Residents', ready: true },
		],
	},
	{
		section: 'Insights',
		items: [
			{ id: 'analytics', label: 'Analytics', ready: true },
			{ id: 'settings', label: 'Settings', ready: true },
		],
	},
]

function Sidebar({ active, on_change }) {
	return (
		<aside className="sidebar">
			<div className="sidebar_logo">
				<div className="sidebar_logo_text">
					REPORT-<span>WIZA</span>
				</div>
				<div className="sidebar_role">Admin Portal</div>
			</div>

			<nav className="sidebar_nav">
				{nav_items.map((group) => (
					<div key={group.section}>
						<div className="sidebar_section">{group.section}</div>
						{group.items.map((item) => (
							<button
								key={item.id}
								className={`sidebar_item ${active === item.id ? 'active' : ''}`}
								onClick={() => item.ready && on_change(item.id)}
								disabled={!item.ready}
							>
								{item.label}
								{!item.ready && (
									<span className="sidebar_soon">soon</span>
								)}
							</button>
						))}
					</div>
				))}
			</nav>

			<div className="sidebar_bottom">
				<div className="sidebar_avatar">AD</div>
				<div className="sidebar_user_info">
					<div className="sidebar_user_name">Admin</div>
					<div className="sidebar_user_role">Administrator</div>
				</div>
			</div>
		</aside>
	)
}

export default Sidebar