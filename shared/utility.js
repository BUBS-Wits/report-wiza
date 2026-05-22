/*
 * Gets the passed files data uri
 */
export async function get_data_uri(file) {
	if (typeof file !== 'object') {
		return null
	}
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

/*
 * Valideates whether the passed image is a jpeg, or png using its
 * data uri representation to check whether it matches the expected
 * pattern using regex
 */
export async function image_validate(image) {
	if (image === '') {
		return false
	}
	if (!image) {
		return false
	}
	let image_uri =
		typeof image === 'string' ? image : await get_data_uri(image)
	if (!image_uri) {
		return false
	}
	if (/^(https:\/\/|http:\/\/|ftp:\/\/)/.test(image)) {
		return true
	}
	image_uri = image_uri.trim()
	const image_media_types_suffix = ['jpeg', 'jpg', 'png']
	const image_data_uri_regex = new RegExp(
		`^data:image/(${image_media_types_suffix.join('|')})(;[^,;]+)*,.*$`,
		'i'
	)
	return image_data_uri_regex.test(image_uri)
}

/*
 * Given some natural number, return its bit array
 */
function get_bit_array(val) {
	const bits = []
	while (val !== 0) {
		const rem = val % 2
		val = Math.floor(val / 2)
		bits.push(rem)
	}
	while (bits.length < 6) {
		bits.push(0)
	}
	bits.reverse()
	return bits
}

/*
 * Given some bit array, calculate it's natural number representation
 */
function get_int(bits) {
	let val = 0
	for (let i = bits.length - 1; i >= 0; i--) {
		val += Math.pow(2, bits.length - 1 - i) * bits[i]
	}
	return val
}

/*
 * Get the UInt8Array of the base64 string
 */
export function get_uint8array(base64) {
	if (typeof base64 !== 'string' || base64.length % 4 > 0) {
		return null
	}
	const chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	const cbase64 = base64.replace(/=+$/, '')
	const decoded_bytes_len = Math.floor((cbase64.length * 6) / 8) // we want 8 bit chars/ints
	const bytes = new Uint8Array(decoded_bytes_len)
	let n = 0
	let bits = []
	for (let i = 0; i < cbase64.length; i++) {
		const tmp_index = chars.indexOf(cbase64[i])
		if (tmp_index === -1) {
			console.error('String is not base64: ', base64)
			return null
		}
		const tmp = get_bit_array(tmp_index)
		bits = bits.concat(tmp)
	}
	while (bits.length >= 8) {
		bytes[n++] = get_int(bits.splice(0, 8))
	}
	return bytes
}

export function get_date(now) {
	const year = now.getUTCFullYear()
	const month = String(now.getUTCMonth() + 1).padStart(2, '0')
	const day = String(now.getUTCDate()).padStart(2, '0')
	const hours = String(now.getUTCHours()).padStart(2, '0')
	const minutes = String(now.getUTCMinutes()).padStart(2, '0')
	const seconds = String(now.getUTCSeconds()).padStart(2, '0')
	return {
		year,
		month,
		day,
		hours,
		minutes,
		seconds,
	}
}

/*
 * Given longitude and latitude, it queries `gisapi.elections.org.za`
 * for the locations ward, municipal data, and more.
 */
async function gisapi(longitude, latitude) {
	try {
		const url = `https://gisapi.elections.org.za/IECGIS_VSFinder/api/VotingDistrict?latitude=${latitude}&longitude=${longitude}`

		const response = await fetch(url)

		if (!response.ok) {
			console.error({
				error: 'Failed to fetch from GIS API.',
				url,
			})
			return null
		}

		const data = await response.json()
		return data
	} catch (err) {
		console.error('api voting-district > proxy error:', err)
		return null
	}
}

export function get_voting_district_info(longitude, latitude) {
	return gisapi(longitude, latitude)
		.then(async (res) => {
			if (res === null) {
				return null
			}
			console.log(res)
			const data = res
			if (
				!data.Municipality ||
				!data.MunicipalityID ||
				!data.MunicipalityCode ||
				!data.Ward ||
				!data.Province
			) {
				console.error(
					'Failed to get vote_district information from response body'
				)
				return null
			}
			return {
				m_id: data.MunicipalityID ? Number(data.MunicipalityID) : 0,
				m_code: data.MunicipalityCode,
				m_name: data.Municipality,
				province: data.Province,
				ward: data.Ward ? Number(data.Ward) : null,
			}
		})
		.catch((err) => {
			console.error(err)
			return null
		})
}

/*
 * Requests the current users location using the Geolocation API
 */
export function get_location() {
	return new Promise((resolve, reject) => {
		if (!('geolocation' in navigator)) {
			console.error('Geolocation not supported by this browser.')
			resolve(null)
			return
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve([position.coords.longitude, position.coords.latitude])
			},
			(err) => {
				console.error('Geolocation error:', err.message)
				resolve(null)
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 60000,
			}
		)
	})
}
