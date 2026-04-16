import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../firebase_config.js'
import { collection, addDoc, getDoc, doc } from 'firebase/firestore'
import { storage } from '../../firebase_config.js'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import Navbar from '../../components/nav_bar/nav_bar.js'
import RequestForm from '../../components/request_form/request_form.js'
import { get_data_uri, image_validate } from '../../js/utility.js'
import './request_page.css'

const WARD_API = '/api/voting-district?'

function RequestPage() {
	const [scrolled, set_scrolled] = useState(false)
	const navigate = useNavigate()

	useEffect(() => {
		const on_scroll = () => set_scrolled(window.scrollY > 20)
		window.addEventListener('scroll', on_scroll)
		return () => window.removeEventListener('scroll', on_scroll)
	}, [])

	async function get_voting_district_info(longitude, latitude) {
		return fetch(`${WARD_API}latitude=${latitude}&longitude=${longitude}`, {
			credentials: 'omit',
		}).then(async (res) => {
			const data = await res.json()
			if (
				!data.Municipality ||
				!data.MunicipalityID ||
				!data.MunicipalityCode ||
				!data.Ward ||
				!data.Province
			) {
				throw new Error(
					'Failed to get vote_district information from response body'
				)
			}
			return {
				municipality_id: data.MunicipalityID,
				municipality_code: data.MunicipalityCode,
				municipality: data.Municipality,
				province: data.Province,
				ward: data.Ward,
			}
		})
	}

	async function get_location() {
		return fetch(`https://ipapi.co/json/`).then(async (res) => {
			const data = await res.json()
			if (!data.longitude || !data.latitude) {
				throw new Error(
					'Failed to get longitude and latitude from response body'
				)
			}
			return [data.longitude, data.latitude]
		})
		/* Possible API Key Issue? (Source: https://stackoverflow.com/questions/61032115/unknown-error-acquiring-position-geolocationpositionerror-code-2-firefox-linux/61032116#61032116)
		return new Promise((resolve, reject) => {
			navigator.geolocation.getCurrentPosition(position => {
				resolve([position.coords.longitude, position.coords.latitude])
			}, err => {
				alert('Failed to get current location');
				reject(err)
			}, {timeout: 1 * 1000 * 1000, enableHighAccuracy: true})
		})
		*/
	}

	async function on_submit(request) {
		if (
			!request.input_validate() ||
			!(await image_validate(request.image)) ||
			!auth ||
			!auth.currentUser ||
			!('geolocation' in window.navigator)
		) {
			if (!auth || !auth.currentUser) {
				navigate('/')
			}
			return
		}
		try {
			// TODO: Add uploading of image to some storage bucket
			const user_doc_ref = doc(db, `users`, auth.currentUser.uid)
			if (!(await getDoc(user_doc_ref)).exists()) {
				navigate('/')
			}
			const [longitude, latitude] = await get_location()
			const sa_vote_district_info = await get_voting_district_info(
				longitude,
				latitude
			)
			await addDoc(collection(db, 'service_requests'), {
				user_id: auth.currentUser.uid,
				category: request.category,
				description: request.description,
				image_url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23e0e0e0'/><rect x='32' y='32' width='192' height='192' fill='none' stroke='%239e9e9e' stroke-width='4'/><line x1='32' y1='32' x2='224' y2='224' stroke='%239e9e9e' stroke-width='4'/><line x1='224' y1='32' x2='32' y2='224' stroke='%239e9e9e' stroke-width='4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23757575' font-family='Arial, sans-serif' font-size='20'>No Image</text></svg>`,
				location: `SRID=4326;POINT(${longitude} ${latitude})`,
				sa_ward: sa_vote_district_info.ward,
				status: 'pending',
				created_at: new Date(),
			})

			alert('Upload successful!')
		} catch (e) {
			console.error('Error during upload:', e)
		}
	}

	return (
		<div className="service_request_page">
			<Navbar />
			<header>
				<h1>Request Form</h1>
			</header>
			<main>
				<RequestForm onSubmit={on_submit} />
			</main>
		</div>
	)
}

export default RequestPage
