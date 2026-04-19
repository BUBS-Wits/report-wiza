import { db } from '../firebase_config.js'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'

export const get_claimed_requests = async (worker_uid) => {
  try {
    const q = query(
      collection(db, 'service_requests'),
      where('assigned_worker_uid', '==', worker_uid)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error fetching claimed requests:', error)
    throw new Error('Could not load your requests. Try again later.')
  }
}
export const update_request_status = async (request_id, new_status) => {
  try {
    const request_ref = doc(db, 'service_requests', request_id)
    await updateDoc(request_ref, {
      status: new_status,
      updated_at: serverTimestamp(),
    })
    return { success: true }
  } catch (error) {
    console.error('Error updating request status:', error)
    throw new Error('Could not update status. Try again.')
  }
}