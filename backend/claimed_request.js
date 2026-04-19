export class ClaimedRequest {
	constructor(request_uid, worker_uid, tmp_status) {
		this.request_uid = request_uid
		this.worker_uid = worker_uid
		this.status = tmp_status
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
			request_uid: this.request_uid,
			worker_uid: this.worker_uid,
			status: this.status,
		}
	}
}

export const claimed_request_converter = {
	to_firestore: function (claimed_request) {
		return {
			request_uid: claimed_request.request_uid,
			worker_uid: claimed_request.worker_uid,
			status: claimed_request.status,
		}
	},
	from_firestore: function (snapshot, options) {
		const data = snapshot.data(options)
		return new ClaimedRequest(
			data.request_uid,
			data.worker_uid,
			data.status
		)
	},
}
