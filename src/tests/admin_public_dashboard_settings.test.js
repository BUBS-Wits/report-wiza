import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminPublicDashboardSettings from '../components/admin_public_dashboard_settings/admin_public_dashboard_settings.js'
import {
	fetch_public_dashboard_visibility,
	update_public_dashboard_visibility,
} from '../backend/public_dashboard_settings_service.js'

jest.mock(
	'../components/admin_public_dashboard_settings/admin_public_dashboard_settings.css',
	() => ({})
)

jest.mock('../backend/public_dashboard_settings_service.js', () => ({
	fetch_public_dashboard_visibility: jest.fn(),
	update_public_dashboard_visibility: jest.fn(),
}))

describe('AdminPublicDashboardSettings', () => {
	const defaultSettings = {
		category: true,
		status: true,
		ward: true,
		municipality: true,
		description: true,
		likes: true,
	}

	beforeEach(() => {
		jest.clearAllMocks()
		fetch_public_dashboard_visibility.mockResolvedValue(defaultSettings)
		update_public_dashboard_visibility.mockResolvedValue(defaultSettings)
	})

	test('loads and displays public dashboard field visibility settings', async () => {
		render(<AdminPublicDashboardSettings />)

		expect(screen.getByText('Loading settings...')).toBeInTheDocument()

		expect(
			await screen.findByText('Public dashboard field visibility')
		).toBeInTheDocument()

		expect(screen.getByLabelText('Category')).toBeChecked()
		expect(screen.getByLabelText('Status')).toBeChecked()
		expect(screen.getByLabelText('Ward')).toBeChecked()
		expect(screen.getByLabelText('Municipality')).toBeChecked()
		expect(screen.getByLabelText('Description')).toBeChecked()
		expect(screen.getByLabelText('Like count')).toBeChecked()
	})

	test('allows admin to toggle a field and save settings', async () => {
		render(<AdminPublicDashboardSettings />)

		expect(await screen.findByLabelText('Description')).toBeChecked()

		fireEvent.click(screen.getByLabelText('Description'))
		fireEvent.click(screen.getByText('Save settings'))

		await waitFor(() => {
			expect(update_public_dashboard_visibility).toHaveBeenCalledWith({
				...defaultSettings,
				description: false,
			})
		})

		expect(
			await screen.findByText('Public dashboard settings saved.')
		).toBeInTheDocument()
	})

	test('shows an error message when settings fail to load', async () => {
		fetch_public_dashboard_visibility.mockRejectedValueOnce(
			new Error('Permission denied')
		)

		render(<AdminPublicDashboardSettings />)

		expect(await screen.findByText('Permission denied')).toBeInTheDocument()
	})

	test('shows an error message when saving fails', async () => {
		update_public_dashboard_visibility.mockRejectedValueOnce(
			new Error('Save failed')
		)

		render(<AdminPublicDashboardSettings />)

		expect(await screen.findByLabelText('Description')).toBeChecked()

		fireEvent.click(screen.getByLabelText('Description'))
		fireEvent.click(screen.getByText('Save settings'))

		expect(await screen.findByText('Save failed')).toBeInTheDocument()
	})
})
