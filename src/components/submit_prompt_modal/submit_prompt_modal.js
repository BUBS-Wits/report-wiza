import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './submit_prompt_modal.css'

function SubmitPromptModal({ is_open, on_close, on_continue }) {
	const navigate = useNavigate()

	// Lock body scroll while modal is open
	useEffect(() => {
		if (is_open) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => {
			document.body.style.overflow = ''
		}
	}, [is_open])

	// Close on Escape key
	useEffect(() => {
		if (!is_open) {
			return
		}
		const handle_key = (e) => {
			if (e.key === 'Escape') {
				on_close()
			}
		}
		document.addEventListener('keydown', handle_key)
		return () => document.removeEventListener('keydown', handle_key)
	}, [is_open, on_close])

	function on_create_account() {
		on_close()
		navigate('/login')
	}

	// Stop click inside card from closing via overlay click
	function on_card_click(e) {
		e.stopPropagation()
	}

	if (!is_open) {
		return null
	}

	return (
		<div
			className="spm_overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="spm_title"
			onClick={on_close}
		>
			<div className="spm_card" onClick={on_card_click}>
				{/* ── Header stripe ── */}
				<div className="spm_header">
					<div className="spm_header_icon" aria-hidden="true">
						<svg
							width="28"
							height="28"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
								fill="currentColor"
							/>
						</svg>
					</div>
					<h2 id="spm_title" className="spm_title">
						Save Your Report
					</h2>
					<button
						className="spm_close_btn"
						onClick={on_close}
						aria-label="Close"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M18 6L6 18M6 6l12 12"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
							/>
						</svg>
					</button>
				</div>

				{/* ── Body ── */}
				<div className="spm_body">
					<p className="spm_lead">
						Create a free account to track your request and receive
						status updates as your issue gets resolved.
					</p>

					<ul className="spm_benefits">
						<li className="spm_benefit_item">
							<span
								className="spm_benefit_icon"
								aria-hidden="true"
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</span>
							Track your request status in real time
						</li>
						<li className="spm_benefit_item">
							<span
								className="spm_benefit_icon"
								aria-hidden="true"
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</span>
							Receive notifications when a worker is assigned
						</li>
						<li className="spm_benefit_item">
							<span
								className="spm_benefit_icon"
								aria-hidden="true"
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</span>
							Message the worker assigned to your issue
						</li>
						<li className="spm_benefit_item">
							<span
								className="spm_benefit_icon"
								aria-hidden="true"
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</span>
							Confirm resolution and leave satisfaction feedback
						</li>
					</ul>

					<div className="spm_divider">
						<span>Sign in via</span>
					</div>

					<div className="spm_provider_row">
						<div className="spm_provider_badge">
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
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
							Google
						</div>
						<div className="spm_provider_badge">
							<svg
								width="18"
								height="18"
								viewBox="0 0 23 23"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path fill="#f3f3f3" d="M0 0h23v23H0z" />
								<path fill="#f35325" d="M1 1h10v10H1z" />
								<path fill="#81bc06" d="M12 1h10v10H12z" />
								<path fill="#05a6f0" d="M1 12h10v10H1z" />
								<path fill="#ffba08" d="M12 12h10v10H12z" />
							</svg>
							Microsoft
						</div>
					</div>
				</div>

				{/* ── Actions ── */}
				<div className="spm_actions">
					<button
						className="spm_btn_primary"
						onClick={on_create_account}
					>
						Create Account / Sign In
					</button>
					<button className="spm_btn_ghost" onClick={on_continue}>
						Continue without an account
					</button>
				</div>

				{/* ── Fine print ── */}
				<p className="spm_footnote">
					Anonymous submissions are accepted but cannot be tracked or
					updated after submission.
				</p>
			</div>
		</div>
	)
}

export default SubmitPromptModal
