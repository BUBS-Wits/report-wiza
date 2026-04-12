import React from 'react'
import './button.css'

function YellowBtn({ text, onClick }) {
	return (
		<button className="btn_components yellow_button" onClick={onClick}>
			{text}
		</button>
	)
}

export default YellowBtn
