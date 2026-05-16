import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase_config.js'

function ProtectedRoute({ children, allowed_roles }) {
	const [status, set_status] = useState('loading')

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				set_status('unauthenticated')
				return
			}
			try {
				const snap = await getDoc(doc(db, 'users', user.uid))
				if (!snap.exists()) {
					set_status('unauthorized')
					return
				}
				const role = snap.data().role
				if (allowed_roles.includes(role)) {
					set_status('authorized')
				} else {
					set_status('unauthorized')
				}
			} catch {
				set_status('authorized')
			}
		})
		return () => unsub()
	}, [allowed_roles])

	if (status === 'loading') {
		return null
	}

	if (status === 'unauthenticated') {
		return <Navigate to="/login" replace />
	}

	if (status === 'unauthorized') {
		return <Navigate to="/" replace />
	}

	return children
}

export default ProtectedRoute
