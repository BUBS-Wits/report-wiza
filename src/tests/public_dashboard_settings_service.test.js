import {
	DEFAULT_PUBLIC_DASHBOARD_FIELDS,
	fetch_public_dashboard_visibility,
	update_public_dashboard_visibility,
} from '../backend/public_dashboard_settings_service.js'
import { doc, getDoc, setDoc } from 'firebase/firestore'

jest.mock('../firebase_config.js', () => ({
	db: {},
}))

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(() => 'settings-ref'),
	getDoc: jest.fn(),
	setDoc: jest.fn(),
}))

describe('public dashboard settings service', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('creates and returns default settings when no settings document exists', async () => {
		getDoc.mockResolvedValueOnce({
			exists: () => false,
		})

		const result = await fetch_public_dashboard_visibility()

		expect(setDoc).toHaveBeenCalledWith(
			'settings-ref',
			DEFAULT_PUBLIC_DASHBOARD_FIELDS
		)
		expect(result).toEqual(DEFAULT_PUBLIC_DASHBOARD_FIELDS)
	})

	test('returns saved settings merged with defaults when document exists', async () => {
		getDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({
				description: false,
				likes: false,
			}),
		})

		const result = await fetch_public_dashboard_visibility()

		expect(result).toEqual({
			...DEFAULT_PUBLIC_DASHBOARD_FIELDS,
			description: false,
			likes: false,
		})
	})

	test('updates public dashboard visibility settings with merge enabled', async () => {
		const settings = {
			category: true,
			status: true,
			ward: true,
			municipality: false,
			description: false,
			likes: true,
		}

		const result = await update_public_dashboard_visibility(settings)

		expect(setDoc).toHaveBeenCalledWith('settings-ref', settings, {
			merge: true,
		})
		expect(result).toEqual(settings)
	})
})
