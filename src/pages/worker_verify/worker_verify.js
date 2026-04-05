// src/pages/worker_verify/worker_verify.js
// Worker lands here after clicking the email link.
// Automatically verifies the link, sets role to worker,
// then redirects to the worker dashboard. No form needed.

import React, { useState, useEffect } from 'react'
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { auth } from '../../firebase_config.js'
import { confirm_worker_role } from '../../backend/admin_firebase.js'
import { useNavigate } from 'react-router-dom'
import './worker_verify.css'

function WorkerVerify() {
	const navigate = useNavigate()
	const [status, set_status] = useState('verifying') // 'verifying' | 'success' | 'error'
	const [error_msg, set_error_msg] = useState('')

	useEffect(() => {
		const verify = async () => {
			// Check if this is a valid email sign-in link
			if (!isSignInWithEmailLink(auth, window.location.href)) {
				set_status('error')
				set_error_msg('Invalid or expired link. Please contact your admin.')
				return
			}

			try {
				// Get email saved when admin sent the link
				let email = window.localStorage.getItem('worker_email_for_sign_in')

				// If on a different device, prompt for email
				if (!email) {
					email = window.prompt('Please enter your email to confirm:')
				}

				// Sign in with the email link
				const result = await signInWithEmailLink(auth, email, window.location.href)

				// Clear email from localStorage
				window.localStorage.removeItem('worker_email_for_sign_in')

				// Set role to worker in Firestore
				await confirm_worker_role(result.user.uid, email, {})

				set_status('success')

				// Redirect to worker dashboard after short delay
				setTimeout(() => navigate('/worker'), 1500)

			} catch (err) {
				console.error(err)
				set_status('error')
				set_error_msg('Verification failed. Please contact your admin.')
			}
		}

		verify()
	}, [navigate])

	return (
		<div className="verify_page">
			<div className="verify_container">

				{/* Shield icon — changes color based on state */}
				{status === 'verifying' && (
					<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
						<path
							d="M24 4L8 10V22C8 31.9 15.1 41.2 24 44C32.9 41.2 40 31.9 40 22V10L24 4Z"
							fill="#E6F1FB"
							stroke="#185FA5"
							strokeWidth="1.5"
						/>
					</svg>
				)}

				{status === 'success' && (
					<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
						<path
							d="M24 4L8 10V22C8 31.9 15.1 41.2 24 44C32.9 41.2 40 31.9 40 22V10L24 4Z"
							fill="#EAF3DE"
							stroke="#3B6D11"
							strokeWidth="1.5"
						/>
						<polyline
							points="17,24 22,29 31,19"
							stroke="#3B6D11"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				)}

				{status === 'error' && (
					<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
						<path
							d="M24 4L8 10V22C8 31.9 15.1 41.2 24 44C32.9 41.2 40 31.9 40 22V10L24 4Z"
							fill="#FCEBEB"
							stroke="#A32D2D"
							strokeWidth="1.5"
						/>
						<line
							x1="19" y1="19" x2="29" y2="29"
							stroke="#A32D2D"
							strokeWidth="2.5"
							strokeLinecap="round"
						/>
						<line
							x1="29" y1="19" x2="19" y2="29"
							stroke="#A32D2D"
							strokeWidth="2.5"
							strokeLinecap="round"
						/>
					</svg>
				)}

				{status === 'verifying' && (
					<>
						<div className="verify_spinner" />
						<h1 className="verify_title">Verifying your account...</h1>
						<p className="verify_sub">Please wait while we confirm your registration.</p>
					</>
				)}

				{status === 'success' && (
					<>
						<div className="verify_success_icon">&#10003;</div>
						<h1 className="verify_title">You are all set!</h1>
						<p className="verify_sub">Your worker account has been confirmed. Redirecting you now...</p>
					</>
				)}

				{status === 'error' && (
					<>
						<div className="verify_error_icon">&#10005;</div>
						<h1 className="verify_title">Verification failed</h1>
						<p className="verify_sub">{error_msg}</p>
					</>
				)}

			</div>
		</div>
	)
}

export default WorkerVerify