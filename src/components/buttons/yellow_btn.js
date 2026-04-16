import React from 'react'
import './button.css'

function YellowBtn({ text, onClick }) {
	return (
		<button
			className={
				'btn_components yellow_button' +
				(text === 'Loading' ? ' loading' : '')
			}
			onClick={onClick}
		>
			{text}
		</button>
	)
}

export default YellowBtn
