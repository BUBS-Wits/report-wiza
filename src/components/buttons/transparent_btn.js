import React from 'react'
import './button.css'

function TransparentBtn({ text, onClick }) {
	return (
		<button className="btn_components transparent_button" onClick={onClick}>
			{text}
		</button>
	)
}

export default TransparentBtn
