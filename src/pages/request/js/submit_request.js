export async function send_request(uri, data) {
	if (!URL.canParse) {
		URL.canParse = function (url, base) {
			try {
				new URL(url, base)
				return true
			} catch {
				return false
			}
		}
	}
	if (!URL.canParse(uri)) {
		return null
	}
	let body
	try {
		body = JSON.stringify(data)
		if (typeof body === 'undefined') {
			return null
		}
	} catch {
		return null
	}
	return await fetch(uri, {
		mode: 'cors',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body,
	})
}
