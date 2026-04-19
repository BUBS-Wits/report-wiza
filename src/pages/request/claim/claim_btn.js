import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, setDoc, getDoc, doc } from 'firebase/firestore'
import { auth, db, storage } from '../../../firebase_config.js'
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
			const user_creq_ref = doc(db, 'claimed_requests', request_uid)
			if (!(await getDoc(user_creq_ref)).exists()) {
				throw new Error(
					`Service request "${request_uid}" already claimed.`
				)
			}
			const user_sreq_ref = doc(db, 'service_requests', request_uid)
			if (!(await getDoc(user_sreq_ref)).exists()) {
				throw new Error(
					`Service request "${request_uid}" does not exist.`
				)
			}
			setDoc(user_creq_ref, {
				request_uid,
				worker_uid: auth.currentUser.uid,
				status: 'pending',
			})
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
