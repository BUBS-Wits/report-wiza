import { image_validate } from '../../utility.js'

const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23e0e0e0'/><rect x='32' y='32' width='192' height='192' fill='none' stroke='%239e9e9e' stroke-width='4'/><line x1='32' y1='32' x2='224' y2='224' stroke='%239e9e9e' stroke-width='4'/><line x1='224' y1='32' x2='32' y2='224' stroke='%239e9e9e' stroke-width='4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23757575' font-family='Arial, sans-serif' font-size='20'>No Image</text></svg>`

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
				this.created_at = new Date()
				this.updated_at = new Date()
				this.category = category?.trim()
				this.description = description?.trim()
				this.image = image
				this.longitude = longitude
				this.latitude = latitude
				this.loc_info = location_info
			} else if (typeof category === 'object') {
				const json = category
				this.created_at = json.created_at
					? new Date(json.created_at)
					: new Date()
				this.updated_at = json.updated_at
					? new Date(json.updated_at)
					: new Date()
				this.category = json.category?.trim()
				this.description = json.description?.trim()
				this.image = json.image
				this.longitude = Number(json.longitude)
				this.latitude = Number(json.latitude)
				this.loc_info = json.loc_info
				this.loc_info.ward = Number(this.loc_info.ward)
				this.loc_info.m_id = Number(this.loc_info.m_id)
				if (typeof json.status === 'number') {
					this.status = Number(json.status)
				}
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
			typeof this.image === 'string' &&
			this.longitude !== undefined &&
			this.latitude !== undefined &&
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
			this.get_ward() === undefined ||
			!this.get_province() ||
			!municipality ||
			municipality.id === undefined ||
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
	to_firestore: function (user_uid, request, created, updated, ustatus) {
		const municipality = request.get_municipality()
		return {
			user_uid,
			created_at: created.toUTCString(),
			updated_at: updated.toUTCString(),
			location: `SRID=4326;POINT(${request.longitude} ${request.latitude})`,
			sa_ward: request.get_ward(),
			sa_province: request.get_province(),
			sa_m_id: municipality.id,
			sa_m_code: municipality.code,
			sa_m_name: municipality.name,
			status: ustatus,
			category: request.category,
			description: request.description,
		}
	},
	from_firestore: function (snapshot, options) {
		const data = snapshot.data(options)
		data['longitude'] = data.location.replace(
			/SRID=4326;POINT\((-?[0-9\.]*) (-?[0-9\.]*)\)/g,
			'$1'
		)
		data['latitude'] = data.location.replace(
			/SRID=4326;POINT\((-?[0-9\.]*) (-?[0-9\.]*)\)/g,
			'$2'
		)
		data['loc_info'] = {
			ward: data.sa_ward,
			province: data.sa_province,
			m_id: data.sa_m_id,
			m_code: data.sa_m_code,
			m_name: data.sa_m_name,
		}
		return new Request(data)
	},
	from_firestore_doc: function (doc, options) {
		const data = doc
		data['longitude'] = data.location.replace(
			/SRID=4326;POINT\((-?[0-9\.]*) (-?[0-9\.]*)\)/g,
			'$1'
		)
		data['latitude'] = data.location.replace(
			/SRID=4326;POINT\((-?[0-9\.]*) (-?[0-9\.]*)\)/g,
			'$2'
		)
		data['loc_info'] = {
			ward: data.sa_ward,
			province: data.sa_province,
			m_id: data.sa_m_id,
			m_code: data.sa_m_code,
			m_name: data.sa_m_name,
		}
		return new Request(data)
	},
}
