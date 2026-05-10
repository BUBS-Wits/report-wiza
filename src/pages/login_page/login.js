import React, { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase_config.js'
import { useNavigate } from 'react-router-dom'
import './login.css'
import Navbar from '../../components/nav_bar/nav_bar.js'

// Tells Firebase to use Google as the login provider
const google_provider = new GoogleAuthProvider()

function Login() {
	// True while the Google popup/sign-in is in progress
	const [loading, set_loading] = useState(false)
	// Holds any error message to display
	const [error, set_error] = useState(null)
	// Lets us redirect the user after login
	const navigate = useNavigate()

	const handle_google_sign_in = async () => {
		set_loading(true)
		set_error(null)

		try {
			// Opens the Google popup
			const result = await signInWithPopup(auth, google_provider)
			const user = result.user

			// Check if this user already exists in Firestore
			const user_ref = doc(db, 'users', user.uid)
			const user_snap = await getDoc(user_ref)

			// If they are new, create their profile
			if (!user_snap.exists()) {
				await setDoc(user_ref, {
					display_name: user.displayName,
					email: user.email,
					role: 'resident',
					is_blocked: false,
					created_at: serverTimestamp(),
				})
			}

			// Route based on role
			const role = user_snap.exists() ? user_snap.data().role : 'resident'

			if (role === 'admin') {
				navigate('/admin')
			} else if (role === 'worker') {
				navigate('/worker-dashboard')
			} else {
				navigate('/resident-dashboard')
			}
		} catch (err) {
			if (err.code !== 'auth/popup-closed-by-user') {
				set_error('Sign-in failed. Please try again.')
				console.error(err)
			}
		} finally {
			set_loading(false)
		}
	}

	return (
		<main className="login_page">
			<Navbar />
			{/* Left navy panel — branding and stats */}
			<section className="login_left">
				<div className="login_left_inner">
					<div className="login_logo">
						REPORT-<span>WIZA</span>
					</div>

					<h2 className="login_tagline">
						Municipal Service
						<br />
						Delivery Portal
					</h2>

					<p className="login_desc">
						Report issues in your ward. Track progress.
						<br />
						Hold your municipality accountable.
					</p>

					<div className="login_stats">
						<div className="login_stat">
							<span className="login_stat_val">2,841</span>
							<span className="login_stat_label">
								Requests resolved
							</span>
						</div>
						<div className="login_stat_divider" />
						<div className="login_stat">
							<span className="login_stat_val">48</span>
							<span className="login_stat_label">
								Wards covered
							</span>
						</div>
						<div className="login_stat_divider" />
						<div className="login_stat">
							<span className="login_stat_val">4.1h</span>
							<span className="login_stat_label">
								Avg. response
							</span>
						</div>
					</div>
				</div>

				{/* Decorative animated map pins */}
				<div className="login_map_overlay">
					<div className="login_map_pin pin_1" />
					<div className="login_map_pin pin_2" />
					<div className="login_map_pin pin_3" />
					<div className="login_map_pin pin_4" />
				</div>
			</section>

			{/* Right panel — sign in card */}
			<section className="login_right">
				<article className="login_card">
					<header className="login_card_top">
						<div className="login_card_logo">RW</div>
						<div>
							<h1 className="login_card_title">Sign in</h1>
							<p className="login_card_sub">
								Use your Google account to continue
							</p>
						</div>
					</header>

					{error && (
						<div className="login_error">
							<span className="login_error_icon">⚠</span>
							{error}
						</div>
					)}

					{/* Google sign in button */}
					<button
						className="login_btn login_btn_google"
						onClick={handle_google_sign_in}
						disabled={loading}
					>
						{loading ? (
							<span className="login_spinner" />
						) : (
							<svg className="login_btn_icon" viewBox="0 0 24 24">
								<path
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									fill="#4285F4"
								/>
								<path
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									fill="#34A853"
								/>
								<path
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									fill="#FBBC05"
								/>
								<path
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									fill="#EA4335"
								/>
							</svg>
						)}
						Sign in with Google
					</button>

					<div className="login_divider">
						<span>Powered by Google sign-in</span>
					</div>

					<p className="login_notice">
						By signing in you agree to Report-Wiza&apos;s terms of
						use. Workers must be registered by an Admin before
						accessing the worker dashboard.
					</p>
				</article>

				<footer className="login_footer">
					Report-Wiza · South Africa · 2026
				</footer>
			</section>
		</main>
	)
}

export default Login
