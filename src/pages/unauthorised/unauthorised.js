import React from 'react'

function Unauthorised() {
	return (
		<div style={{
			minHeight: '100vh',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			fontFamily: 'Arial, sans-serif',
			gap: '12px'
		}}>
			<h1 style={{ fontSize: '64px', fontWeight: '700', margin: 0 }}>403</h1>
			<h2 style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>
				Access Denied
			</h2>
			<p style={{ fontSize: '14px', color: '#888', textAlign: 'center', maxWidth: '360px' }}>
				You do not have permission to view this page.
			</p>
		</div>
	)
}

export default Unauthorised