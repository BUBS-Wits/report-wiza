import React, { useState, useEffect } from 'react'
import { fetch_categories } from '../../backend/admin_requests_service.js'
import CategoryOption from '../category_option/category_option.js'
import './category_select.css'

function CategorySelect({ value, onChange }) {
	const [expand, set_expand] = useState(false)
	const [categories, set_categories] = useState([])
	const [loading, set_loading] = useState(true)

	useEffect(() => {
		const load = async () => {
			try {
				const all = await fetch_categories()
				// Only show active categories to residents
				const active = all.filter((c) => c.active).map((c) => c.name)
				set_categories(active)
			} catch (err) {
				console.error('Failed to load categories:', err)
			} finally {
				set_loading(false)
			}
		}
		load()
	}, [])

	return (
		<section className="category_select">
			<button
				type="button"
				className="dropdown_trigger"
				onClick={() => set_expand(true)}
				disabled={loading}
			>
				{loading
					? 'Loading categories...'
					: value
						? value.replaceAll(
								/((^[a-z])|( [a-z]|_[a-z]))/g,
								(match) => match.replace('_', ' ').toUpperCase()
							)
						: '--Please choose a category--'}
			</button>
			<ul className={`category_dropdown_list ${expand ? 'open' : ''}`}>
				{categories.map((opt) => (
					<CategoryOption
						opt={opt}
						key={opt}
						set_value={onChange}
						set_expand={set_expand}
					/>
				))}
			</ul>
		</section>
	)
}

export default CategorySelect
