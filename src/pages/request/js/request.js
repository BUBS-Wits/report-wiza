import { WARD_API } from '../../../constants.js'
import { get_data_uri, image_validate } from '../../../js/utility.js'

export class Request {
	constructor(
		category,
		description,
		image,
		longitude,
		latitude,
		location_info
	) {
		this.category = category ? category.trim() : null
		this.description = description ? description.trim() : null
		this.image = image
		this.longitude = longitude
		this.latitude = latitude
		this.loc_info = location_info
	}

	async image_validate() {
		if (!this.input_validate()) {
			return false
		}
		return image_validate(this.image)
	}

	input_validate() {
		if (
			this.category &&
			this.description &&
			this.image &&
			this.longitude &&
			this.latitude &&
			this.loc_info &&
			this.loc_validate()
		) {
			return true
		}
		return false
	}

	to_string() {
		return JSON.stringify(this.to_json())
	}

	to_json() {
		return {
			category: this.category,
			description: this.description,
			image: this.image,
		}
	}

	get_municipality() {
		return {
			id: this.loc_info.m_id,
			code: this.loc_info.m_code,
			name: this.loc_info.m_name,
		}
	}

	get_ward() {
		return this.loc_info.ward
	}

	get_province() {
		return this.loc_info.province
	}

	loc_validate() {
		const municipality = this.get_municipality()
		if (
			!this.get_ward() ||
			!this.get_province() ||
			!municipality ||
			!municipality.id ||
			!municipality.code ||
			!municipality.name
		) {
			console.error(
				`Failed to get ward, province and/or municipality info from API: "${WARD_API}"`,
				this.loc_info
			)
			return false
		}
		return true
	}
}
