import React, { useState, useEffect } from 'react'
import { Request } from '../../pages/request/js/request.js'
import { get_data_uri, image_validate } from '../../js/utility.js'
import { WARD_API } from '../../constants.js'
import CategorySelect from '../category_select/category_select.js'
import YellowBtn from '../buttons/yellow_btn.js'
import TransparentBtn from '../buttons/transparent_btn.js'
import './request_form.css'

function RequestForm({ onSubmit }) {
	const [category, set_category] = useState('')
	const [description, set_description] = useState('')
	const [file, set_file] = useState(null)
	const [preview, set_preview] = useState(null)

	function get_voting_district_info(longitude, latitude) {
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
				m_id: data.MunicipalityID ? Number(data.MunicipalityID) : 0,
				m_code: data.MunicipalityCode,
				m_name: data.Municipality,
				province: data.Province,
				ward: data.Ward ? Number(data.Ward) : null,
			}
		})
	}

	function get_location() {
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

	async function handle_submit(e) {
		e.preventDefault()
		if (!category || !description || !file) {
			console.error('Please provide complete information.')
			return
		}
		try {
			const [longitude, latitude] = await get_location()
			const loc_info = await get_voting_district_info(longitude, latitude)
			const req = new Request(
				category,
				description,
				file,
				longitude,
				latitude,
				loc_info
			)
			if (req.input_validate() && (await req.image_validate())) {
				await onSubmit(req)
			}
			console.log('Request: ', req)
		} catch (err) {
			console.error('Failed to handle submit of request form.')
			console.error(err)
		}
	}

	async function handle_image_change(e) {
		const f = e.target.files[0]
		if (f && (await image_validate(f))) {
			set_preview(await get_data_uri(f))
			set_file(f)
		} else {
			console.error('Please provide a valid image.')
			set_preview(null)
			set_file(null)
		}
	}

	return (
		<form className="request_form" onSubmit={handle_submit}>
			<CategorySelect value={category} onChange={set_category} />
			<textarea
				required
				cols="30"
				rows="10"
				value={description}
				onChange={(e) => set_description(e.target.value)}
			></textarea>
			{preview && (
				<img
					id="preview"
					src={preview}
					style={{ display: 'block', maxWidth: '300px' }}
				/>
			)}
			<label htmlFor="image">
				Choose an image to upload (PNG, JPEG, JPG)
			</label>
			<input
				id="image"
				required
				type="file"
				accept="image/png, image/jpeg, image/jpg"
				onChange={handle_image_change}
			/>
			<YellowBtn text="Submit" onClick={() => {}} />
		</form>
	)
}

export default RequestForm
