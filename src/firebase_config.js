import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebase_config = {
	apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'test-api-key',
	authDomain:
		process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'test-auth-domain',
	projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'test-project-id',
	storageBucket:
		process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'test-storage-bucket',
	messagingSenderId:
		process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || 'test-sender-id',
	appId: process.env.REACT_APP_FIREBASE_APP_ID || 'test-app-id',
}

const app = initializeApp(firebase_config)

const db_name = process.env.REACT_APP_FIREBASE_DB_NAME || '(default)'
export const db = getFirestore(app)
export const auth = getAuth(app)
