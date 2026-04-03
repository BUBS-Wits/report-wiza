class ResidentRequest {
	constructor(category, description, image) {
		this.category = category ? category.trim() : null
		this.description = description ? description.trim() : null
		this.image = image ? image.trim() : null 
	}

	image_validate() {
		if (!this.input_validate())
			return false
		const image_media_types_suffix = ["jpeg", "jpg", "png"]
		const image_data_uri_regex = new RegExp(
			`^data:image/(${image_media_types_suffix.join("|")})(;[^,;]+)*,.*$`,
			"i"
		)
		return image_data_uri_regex.test(this.image)
	}

	input_validate() {
		return this.category.trim() &&
			this.description.trim() &&
			this.image
	}

	to_string() {
		return JSON.stringify(to_json)
	}

	to_json() {
		return {
			"category": this.category,
			"description": this.description,
			"image": this.image
		}
	}
}

module.exports = {ResidentRequest}
