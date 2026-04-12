import React from 'react'
import './category_option.css'

function CategoryOption({ opt, set_value, set_expand }) {
	return (
		<li key={opt}>
			<button
				type='button'
				className='category_option'
				onClick={() => {
					set_value(opt)
					set_expand(false)
				}}
			>
				{opt.replaceAll(/((^[a-z])|( [a-z]|_[a-z]))/g, (match) =>
					match.replace('_', ' ').toUpperCase()
				)}
			</button>
		</li>
	)
}

export default CategoryOption
