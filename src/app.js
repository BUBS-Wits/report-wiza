import React, { useEffect, useState } from 'react'
import { db } from './firebase_config.js'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import './app.css'

function App() {
	const [message, set_message] = useState('Connecting to Firebase...')
	const [db_status, set_db_status] = useState('')

	const seed_and_read = async (cancelled_ref) => {
		try {
			const collection_ref = collection(db, 'hello_world')
			const snapshot = await getDocs(collection_ref)

			if (snapshot.empty) {
				await addDoc(collection_ref, {
					text: 'Hello World from Firestore!',
				})
				if (cancelled_ref.current) {
					return
				}
				set_db_status('First run — document created in Firestore.')
			}

			const updated_snapshot = await getDocs(collection_ref)
			const first_doc = updated_snapshot.docs[0]
			if (cancelled_ref.current) {
				return
			}
			set_message(first_doc.data().text)
			set_db_status(
				(prev) => prev || 'Document read from Firestore successfully.'
			)
		} catch (error) {
			if (cancelled_ref.current) {
				return
			}
			set_message('Firebase connection failed.')
			set_db_status(error.message)
		}
	}

	useEffect(() => {
		const cancelled_ref = { current: false }
		// eslint-disable-next-line react-hooks/set-state-in-effect
		seed_and_read()
		return () => {
			cancelled_ref.current = true
		}
	}, [])

	return (
		<div className="app_container">
			<h1>{message}</h1>
			<p className="db_status">{db_status}</p>
			<p className="stack_info">
				React · Firebase Firestore · Deployed on Azure
			</p>
		</div>
	)
}

export default App
