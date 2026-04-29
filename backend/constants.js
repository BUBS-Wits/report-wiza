export const REQUEST_CATEGORIES = ['water', 'sewage', 'electricity', 'road']
export const WARD_API = '/api/voting-district?'
export const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23e0e0e0'/><rect x='32' y='32' width='192' height='192' fill='none' stroke='%239e9e9e' stroke-width='4'/><line x1='32' y1='32' x2='224' y2='224' stroke='%239e9e9e' stroke-width='4'/><line x1='224' y1='32' x2='32' y2='224' stroke='%239e9e9e' stroke-width='4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23757575' font-family='Arial, sans-serif' font-size='20'>No Image</text></svg>`

export const STATUS = Object.freeze({
	SUBMITTED: 0,
	ASSIGNED: 1,
	IN_PROGRESS: 2,
	RESOLVED: 3,
	CLOSED: 4,
})

export const STATUSES = Object.freeze([
	STATUS.SUBMITTED,
	STATUS.ASSIGNED,
	STATUS.IN_PROGRESS,
	STATUS.RESOLVED,
	STATUS.CLOSED,
])

export const STATUS_KEY = Object.freeze({
	[STATUS.SUBMITTED]: 'SUBMITTED',
	[STATUS.ASSIGNED]: 'ASSIGNED',
	[STATUS.IN_PROGRESS]: 'IN_PROGRESS',
	[STATUS.RESOLVED]: 'RESOLVED',
	[STATUS.CLOSED]: 'CLOSED',
})

export const STATUS_DISPLAY = Object.freeze({
	[STATUS.SUBMITTED]: 'Submitted',
	[STATUS.ASSIGNED]: 'Assigned',
	[STATUS.IN_PROGRESS]: 'In Progress',
	[STATUS.RESOLVED]: 'Resolved',
	[STATUS.CLOSED]: 'Closed',
})
