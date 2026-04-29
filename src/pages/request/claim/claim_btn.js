import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, setDoc, getDoc, doc } from 'firebase/firestore'
import { auth, db, storage } from '../../../firebase_config.js'
import YellowBtn from '../../../components/buttons/yellow_btn.js'

function ClaimBtn({ request_id }) {
	const [claiming, set_claiming] = useState(0)
	const navigate = useNavigate()

	async function on_claim() {
		if (!auth || !auth.currentUser || !auth.currentUser.uid) {
			return
		}
		set_claiming(1)
		try {
			const token = await auth.currentUser.getIdToken()
			const req = await fetch(
				`/api/claim-request?request_uid=${request_id}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				}
			)
			if (!req.ok) {
				alert('Failed to claim request. Browse console logs.')
				console.error('Failed:\n', await req.json())
				return
			}
			alert('Request successfully claimed.')
			console.log(await req.json())
		} catch (err) {
			console.error(`Failed to claim request "${request_id}"`)
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
