import { get_data_uri, image_validate } from '../../../js/utility.js'

export class Request {
	constructor(category, description, image) {
		this.category = category ? category.trim() : null
		this.description = description ? description.trim() : null
		this.image = image
	}

	async image_validate() {
		if (!this.input_validate()) {
			return false
		}
		return await image_validate(this.image)
	}

	input_validate() {
		if (this.category && this.description && this.image) {
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
}
