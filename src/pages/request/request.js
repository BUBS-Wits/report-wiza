import { get_data_uri, image_validate } from '../../utility.js'
import { PLACEHOLDER_IMAGE } from '../../constants.js'

export class Request {
	constructor(
		category,
		description = undefined,
		image = undefined,
		longitude = undefined,
		latitude = undefined,
		location_info = undefined
	) {
		try {
			if (typeof category === 'string') {
				this.category = category?.trim()
				this.description = description?.trim()
				this.image = image
				this.longitude = longitude
				this.latitude = latitude
				this.loc_info = location_info
			} else if (typeof category === 'object') {
				const json = category
				this.category = json.category?.trim()
				this.description = json.description?.trim()
				this.image = json.image
				this.longitude = json.longitude
				this.latitude = json.latitude
				this.loc_info = json.loc_info
			}
		} catch (err) {}
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
			longitude: this.longitude,
			latitude: this.latitude,
			loc_info: this.loc_info,
		}
	}

	get_municipality() {
		return {
			id: this.loc_info?.m_id,
			code: this.loc_info?.m_code,
			name: this.loc_info?.m_name,
		}
	}

	get_ward() {
		return this.loc_info?.ward
	}

	get_province() {
		return this.loc_info?.province
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
			return false
		}
		return true
	}

	set_placeholder_image() {
		this.image = PLACEHOLDER_IMAGE
	}
}

export const request_converter = {
	to_firestore: function (user_uid, request, now) {
		const municipality = request.get_municipality()
		return {
			user_uid,
			created_at: now.toUTCString(),
			location: `SRID=4326;POINT(${request.longitude} ${request.latitude})`,
			sa_ward: request.get_ward(),
			sa_m_id: municipality.id,
			sa_m_code: municipality.code,
			sa_m_name: municipality.name,
			category: request.category,
			description: request.description,
			image: request.image,
		}
	},
	from_firestore: function (snapshot, options) {
		const data = snapshot.data(options)
		return new Request(data)
	},
}
