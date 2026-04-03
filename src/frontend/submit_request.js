const {ResidentRequest} = require("./submit_request.js")

async function send_request(uri, data) {
	if (!URL.canParse(uri))
		return null
	let body = JSON.stringify(data)
	body = body ? body : ""
	return await fetch(uri, {
		mode: "cors",
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body
	})
}

module.exports = {
	send_request
}
