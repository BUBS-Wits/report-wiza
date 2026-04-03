class ResidentRequest {
	constructor(category, description, image) {
		this.category = category
		this.description = description
		this.image = image
	}

	image_validate() {
		if (!this.input_validate())
			return false
		const image_media_types_suffix = ["jpeg", "jpg", "png"]
		const image_data_uri_regex = new RegExp(
			`^data:image/(${image_media_types_suffix.join("|")})([^,]*)?,.*$`
		)
		return image_data_uri_regex.test(this.image)
	}

	input_validate() {
		return this.category.trim() &&
			this.description.trim() &&
			this.image
	}
}

module.exports = {ResidentRequest}
