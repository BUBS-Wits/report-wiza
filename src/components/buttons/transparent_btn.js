import React from 'react'
import './button.css'

function TransparentBtn({ text, onClick }) {
	return (
		<button
			className={
				'btn_components transparent_button' +
				(text === 'Loading' ? ' loading' : '')
			}
			onClick={onClick}
		>
			{text}
		</button>
	)
}

export default TransparentBtn
