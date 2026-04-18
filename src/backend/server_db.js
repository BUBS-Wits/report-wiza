import admin from 'firebase-admin'
import fs from 'fs'

let serviceAccount

// 1. Check where the app is running
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // If deployed, read the key from the environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
} else {
    // If local, read it from your hidden JSON file
    serviceAccount = JSON.parse(
        fs.readFileSync('./serviceAccountKey.json', 'utf-8')
    )
}

// 2. Initialize the backend app safely
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    })
}

// 3. Export the secure backend database
export const db = admin.firestore()