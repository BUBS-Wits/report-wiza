export class ClaimedRequest {
	constructor(request_uid, worker_uid) {
		this.worker_uid = worker_uid
		this.request_uid = request_uid
	}

	validate() {
		if (this.request_uid && this.worker_uid && this.status) {
			return true
		}
		return false
	}

	to_string() {
		return JSON.stringify(this.to_json())
	}

	to_json() {
		return {
			worker_uid: this.worker_uid,
			request_uid: this.request_uid,
		}
	}
}

export const claimed_request_converter = {
	to_firestore: function (claimed_request) {
		return {
			worker_uid: claimed_request.worker_uid,
			request_uid: claimed_request.request_uid,
		}
	},
	from_firestore: function (snapshot, options) {
		const data = snapshot.data(options)
		return new ClaimedRequest(data.request_uid, data.worker_uid)
	},
}
