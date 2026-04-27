import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase_config.js'
import Unauthorised from '../../pages/unauthorised/unauthorised.js'

function ProtectedRoute({ children, allowed_roles }) {
	const [loading, set_loading] = useState(true)
	const [role, set_role] = useState(null)
	const [authenticated, set_authenticated] = useState(false)

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				set_authenticated(true)
				const user_doc = await getDoc(doc(db, 'users', user.uid))
				if (user_doc.exists()) {
					set_role(user_doc.data().role)
				} else {
					set_role(null)
				}
			} else {
				set_authenticated(false)
				set_role(null)
			}
			set_loading(false)
		})
		return () => unsubscribe()
	}, [])

	if (loading) {
		return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
	}

	// Not logged in at all → redirect to login
	if (!authenticated) {
		return <Navigate to="/login" />
	}

	// Logged in but wrong role → show 403 page
	if (!allowed_roles.includes(role)) {
		return <Unauthorised />
	}

	return children
}

export default ProtectedRoute