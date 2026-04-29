// src/components/sidebar/sidebar.js
import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import './sidebar.css'

const nav_items = [
	{
		section: 'Management',
		items: [
			{
				id: 'workers',
				label: 'Workers',
				path: '/admin/workers',
				ready: true,
			},
			{
				id: 'requests',
				label: 'Requests',
				path: '/admin/requests',
				ready: true,
			},
			{
				id: 'messaging',
				label: 'Messaging',
				path: '/admin/messaging',
				ready: true,
			},
			{
				id: 'residents',
				label: 'Residents',
				path: '/admin/residents',
				ready: true,
			},
		],
	},
	{
		section: 'Insights',
		items: [
			{
				id: 'analytics',
				label: 'Analytics',
				// Removed 'path', added 'sub_items'
				sub_items: [
					{
						id: 'category_report',
						label: 'Category Report',
						path: '/admin/analytics/category-report',
						ready: true,
					},
					{
						id: 'worker_performance',
						label: 'Worker Performance',
						path: '/admin/analytics/performance',
						ready: false,
					},
					{
						id: 'satisfaction',
						label: 'Resident Satisfaction',
						path: '/admin/analytics/satisfaction',
						ready: false,
					},
					{
						id: 'custom_reports',
						label: 'Custom Reports',
						path: '/admin/analytics/custom',
						ready: false,
					},
				],
			},
			{
				id: 'settings',
				label: 'Settings',
				path: '/admin/settings',
				ready: true,
			},
		],
	},
]

function Sidebar() {
	// State to track which dropdowns are open (e.g., { analytics: true })
	const [expanded_menus, set_expanded_menus] = useState({})

	const toggle_menu = (id) => {
		set_expanded_menus((prev) => ({
			...prev,
			[id]: !prev[id],
		}))
	}

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
						{group.items.map((item) => {
							// 1. Render a Dropdown if the item has sub_items
							if (item.sub_items) {
								const is_open = expanded_menus[item.id]
								return (
									<div
										key={item.id}
										className="sidebar_dropdown_container"
									>
										<button
											className={`sidebar_item ${is_open ? 'expanded' : ''}`}
											onClick={() => toggle_menu(item.id)}
										>
											{item.label}
											<span className="sidebar_dropdown_arrow">
												{is_open ? '▼' : '▶'}
											</span>
										</button>

										{is_open && (
											<div className="sidebar_sub_menu">
												{item.sub_items.map((sub) =>
													sub.ready ? (
														<NavLink
															key={sub.id}
															to={sub.path}
															className={({
																isActive,
															}) =>
																`sidebar_sub_item ${isActive ? 'active' : ''}`
															}
														>
															{sub.label}
														</NavLink>
													) : (
														<button
															key={sub.id}
															className="sidebar_sub_item"
															disabled
														>
															{sub.label}
															<span className="sidebar_soon">
																soon
															</span>
														</button>
													)
												)}
											</div>
										)}
									</div>
								)
							}

							// 2. Render a standard link/button for flat items
							return item.ready ? (
								<NavLink
									key={item.id}
									to={item.path}
									className={({ isActive }) =>
										`sidebar_item ${isActive ? 'active' : ''}`
									}
								>
									{item.label}
								</NavLink>
							) : (
								<button
									key={item.id}
									className="sidebar_item"
									disabled
								>
									{item.label}
									<span className="sidebar_soon">soon</span>
								</button>
							)
						})}
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

export default Sidebar;
