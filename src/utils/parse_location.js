// src/utils/parse_location.js

/**
 * Parses a Firestore WKT location string into { latitude, longitude }.
 * Expected format: "SRID=4326;POINT(28.0583 -26.2309)"
 * Returns null if the string is missing or malformed.
 */
export const parseLocation = (locationStr) => {
	if (!locationStr || typeof locationStr !== 'string') {
		return null
	}
	const match = locationStr.match(/POINT\(([^ ]+) ([^ )]+)\)/)
	if (!match) {
		return null
	}
	return {
		longitude: parseFloat(match[1]),
		latitude: parseFloat(match[2]),
	}
}
