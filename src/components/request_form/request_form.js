import React, { useState, useEffect } from 'react'
import { Request } from '../../pages/request/request.js'
import {
	get_data_uri,
	image_validate,
	get_location,
	get_voting_district_info,
} from '../../js/utility.js'
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
	const [submitting, set_submitting] = useState(0)

	async function handle_submit(e) {
		e.preventDefault()
		if (!category || !description || !file) {
			console.error('Please provide complete information.')
			return
		}
		set_submitting(1)
		try {
			const loc = await get_location()
			if (!loc) {
				throw new Error()
			}
			const [longitude, latitude] = loc
			const loc_info = await get_voting_district_info(longitude, latitude)
			if (!loc_info) {
				throw new Error()
			}
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
		} finally {
			set_submitting(0)
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
			<YellowBtn
				text={submitting ? 'Loading' : 'Submit'}
				onClick={() => {}}
			/>
		</form>
	)
}

export default RequestForm
