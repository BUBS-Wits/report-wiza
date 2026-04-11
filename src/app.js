<<<<<<< HEAD
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReportWiza from './auth/report_wiza';
import './app.css';

// Temporary placeholder pages
const Resident = () => <h1>Welcome, Resident!</h1>;
const Admin    = () => <h1>Welcome, Admin!</h1>;
const Worker   = () => <h1>Welcome, Worker!</h1>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<ReportWiza />} />
        <Route path="/resident" element={<Resident />} />
        <Route path="/admin"    element={<Admin />} />
        <Route path="/worker"   element={<Worker />} />
        <Route path="*"         element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
=======
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
		seed_and_read(cancelled_ref)
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
>>>>>>> main
