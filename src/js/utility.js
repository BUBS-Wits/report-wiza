export async function image_validate(image) {
	if (!image) {
		return false
	}
	let image_uri =
		typeof image === 'string' ? image : await get_data_uri(image)
	image_uri = image_uri.trim()
	const image_media_types_suffix = ['jpeg', 'jpg', 'png']
	const image_data_uri_regex = new RegExp(
		`^data:image/(${image_media_types_suffix.join('|')})(;[^,;]+)*,.*$`,
		'i'
	)
	return image_data_uri_regex.test(image_uri)
}

export async function get_data_uri(file) {
	if (typeof window !== 'undefined') {
		// native browser
		return new Promise((resolve) => {
			const reader = new FileReader()
			reader.onload = (e) => {
				const data_uri = e.target.result
				resolve(data_uri)
			}
			reader.readAsDataURL(file)
		})
	} else {
		// nodejs
		const buffer = Buffer.from(await file.arrayBuffer())
		const data_uri = `data:${file.type};base64,${buffer.toString('base64')}`
		return data_uri
	}
}
