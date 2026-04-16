import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, getDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../../../firebase_config.js'
import YellowBtn from '../../../components/buttons/yellow_btn.js'

function ClaimBtn({ request_id }) {
	const [claiming, set_claiming] = useState(0)
	const navigate = useNavigate()

	function on_claim() {}

	return (
		<YellowBtn
			text={claiming ? 'Loading' : 'Claim'}
			onClick={{ on_claim }}
		/>
	)
}

export default ClaimBtn
