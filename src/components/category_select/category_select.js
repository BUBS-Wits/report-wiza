import React, { useState, useEffect } from 'react'
import { REQUEST_CATEGORIES } from '../../constants.js'

function CategorySelect({ value, onChange }) {
	return (
		<select
			required
			onChange={(e) => onChange(e.target.value)}
			value={value}
		>
			<option value="">--Please choose a category--</option>
			{REQUEST_CATEGORIES.map((opt) => (
				<option value={opt} key={opt}>
					{opt.replaceAll(/((^[a-z])|( [a-z]|_[a-z]))/g, (match) =>
						match.replace('_', ' ').toUpperCase()
					)}
				</option>
			))}
		</select>
	)
}

export default CategorySelect
