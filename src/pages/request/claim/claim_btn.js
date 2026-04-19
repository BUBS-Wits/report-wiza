import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, setDoc, getDoc, doc } from 'firebase/firestore'
import { auth, db, storage } from '../../../firebase_config.js'
import { ClaimedRequest } from '../claimed_request.js'
import YellowBtn from '../../../components/buttons/yellow_btn.js'

function ClaimBtn({ request_uid }) {
	const [claiming, set_claiming] = useState(0)
	const navigate = useNavigate()

	async function on_claim() {
		if (!auth || !auth.currentUser || !auth.currentUser.uid) {
			return
		}
		set_claiming(1)
		try {
			const claimed_request = new ClaimedRequest(
				request_uid,
				auth.currentUser.uid,
				'pending'
			)
			const token = await auth.currentUser.getIdToken()
			const req = await fetch('/api/claim-request', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: claimed_request.to_string(),
			})
			if (!req.ok) {
				alert('Failed to claim request. Browse console logs.')
				console.error('Failed:\n', (await req.json()).error)
				return
			}
			alert('Request successfully claimed.')
			console.log(await req.json())
		} catch (err) {
			console.error(`Failed to claim request "${request_uid}"`)
			console.error(err)
		} finally {
			set_claiming(0)
		}
	}

	return (
		<YellowBtn
			text={claiming ? 'Loading' : 'Claim'}
			onClick={{ on_claim }}
		/>
	)
}

export default ClaimBtn
