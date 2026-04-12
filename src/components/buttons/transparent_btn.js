import React from 'react'
import './button.css'

function TransparentBtn({ text, onClick }) {
	return (
		<button className="transparent_button" onClick={onClick}>
			{text}
		</button>
	)
}

export default TransparentBtn
