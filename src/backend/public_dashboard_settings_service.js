import { db } from '../firebase_config.js'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const DEFAULT_PUBLIC_DASHBOARD_FIELDS = {
	category: true,
	status: true,
	ward: true,
	municipality: true,
	description: true,
	likes: true,
}

const settings_ref = doc(db, 'settings', 'public_dashboard_visibility')

export const fetch_public_dashboard_visibility = async () => {
	const snapshot = await getDoc(settings_ref)

	if (!snapshot.exists()) {
		await setDoc(settings_ref, DEFAULT_PUBLIC_DASHBOARD_FIELDS)
		return DEFAULT_PUBLIC_DASHBOARD_FIELDS
	}

	return {
		...DEFAULT_PUBLIC_DASHBOARD_FIELDS,
		...snapshot.data(),
	}
}

export const update_public_dashboard_visibility = async (settings) => {
	await setDoc(settings_ref, settings, { merge: true })
	return settings
}
