import React, { useState } from 'react'
import { db } from './firebase_config.js'
import { collection, addDoc } from 'firebase/firestore'
import { storage } from './firebase_config.js'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import './app.css'

function App() {
    const [photo, setPhoto] = useState(null)
    const [description, setdescription] = useState('')
    const [photos, setPhotos] = useState([])
	const [success, setSuccess] = useState(false)
	const [loading, setLoading] = useState(false)
const handleUpload = async () => {
	setLoading(true)
    const storageRef = ref(storage, `photos/${photo.name}`)
    await uploadBytes(storageRef, photo)
    const url = await getDownloadURL(storageRef)
    await addDoc(collection(db, 'photos'), {
        description: description,
        imageUrl: url,
    })
	setLoading(false)
    setSuccess(true)
}




	return (  <main className="app_container">
      <nav className="navbar">
        <h1>WardWatch</h1>
		<h2>DOCUMENT UPLOAD</h2>
      </nav>
     <section className="content">
	   <section className="upload">
		<label className='fileLabel'>Choose Photo
		<input type="file" 
		 onChange={(e) => {
		setPhoto(e.target.files[0]) 
		  setSuccess(false)
		  e.target.value = ''}}/>
		  </label>
		<textarea placeholder='fill in description'onChange={(e) => setdescription(e.target.value)}/>
		<button className="button" onClick={handleUpload} disabled={loading} > {loading ? 'Uploading...' : 'Upload'} </button>
	    {success&&<p className= 'p'>upload successfull!!</p>}
	   </section>
	   <section className="picture">
		{photo &&  <img src={URL.createObjectURL(photo)} />}
	   </section>
	 </section>
    </main>
  )



	

}
 
export default App
