import React, { useState, useEffect } from 'react'
import { REQUEST_CATEGORIES } from '../../constants.js'
import CategoryOption from '../category_option/category_option.js'
import './category_select.css'

function CategorySelect({ value, onChange }) {
	const [expand, set_expand] = useState(false)

	return (
		<section className="category_select">
			<button
				type="button"
				className="dropdown_trigger"
				onClick={() => set_expand(true)}
			>
				{value
					? value.replaceAll(/((^[a-z])|( [a-z]|_[a-z]))/g, (match) =>
							match.replace('_', ' ').toUpperCase()
						)
					: '--Please choose a category--'}
			</button>
			<ul className={`category_dropdown_list ${expand ? 'open' : ''}`}>
				{REQUEST_CATEGORIES.map((opt) => (
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
