import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('../firebase_config.js', () => ({ auth: {}, db: {} }))

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	updateDoc: jest.fn(),
	collection: jest.fn(),
	getDocs: jest.fn(),
	addDoc: jest.fn(),
	serverTimestamp: jest.fn(),
}))

jest.mock('../components/admin_categories/admin_categories.css', () => ({}))

jest.mock('../backend/admin_requests_service.js', () => ({
	fetch_categories: jest.fn(),
	add_category: jest.fn(),
	remove_category: jest.fn(),
}))

import AdminCategories from '../components/admin_categories/admin_categories.js'
import {
	fetch_categories,
	add_category,
	remove_category,
} from '../backend/admin_requests_service.js'

const mock_categories = [
	{ id: 'cat-1', name: 'water', active: true },
	{ id: 'cat-2', name: 'sewage', active: false },
]

// ── Render ────────────────────────────────────────────────────────────────

describe('AdminCategories — US029', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.useFakeTimers()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	// ── Loading state ──────────────────────────────────────────────────────

	describe('Given the component is loading', () => {
		it('Then it should show a loading message', async () => {
			fetch_categories.mockReturnValue(new Promise(() => {}))
			render(<AdminCategories />)
			expect(screen.getByText(/loading categories/i)).toBeInTheDocument()
		})
	})

	// ── Empty state ────────────────────────────────────────────────────────

	describe('Given there are no categories', () => {
		it('Then it should show an empty state message', async () => {
			fetch_categories.mockResolvedValueOnce([])
			render(<AdminCategories />)
			await waitFor(() =>
				expect(
					screen.getByText(/no categories found/i)
				).toBeInTheDocument()
			)
		})
	})

	// ── Category list ──────────────────────────────────────────────────────

	describe('Given categories exist', () => {
		it('Then it should render the category table', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('water')).toBeInTheDocument()
			)
			expect(screen.getByText('sewage')).toBeInTheDocument()
		})

		it('Then it should show Active badge for active categories', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('water')).toBeInTheDocument()
			)
			const badges = screen.getAllByText('Active')
			expect(badges.length).toBeGreaterThan(0)
		})

		it('Then it should show Inactive badge for inactive categories', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('sewage')).toBeInTheDocument()
			)
			expect(screen.getByText('Inactive')).toBeInTheDocument()
		})

		it('Then it should show Deactivate button for active categories', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('water')).toBeInTheDocument()
			)
			expect(screen.getByText('Deactivate')).toBeInTheDocument()
		})

		it('Then it should show Activate button for inactive categories', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('sewage')).toBeInTheDocument()
			)
			expect(screen.getByText('Activate')).toBeInTheDocument()
		})
	})

	// ── Add category ───────────────────────────────────────────────────────

	describe('Given the admin adds a new category', () => {
		it('Then it should show an error if the input is empty', async () => {
			fetch_categories.mockResolvedValueOnce([])
			render(<AdminCategories />)
			await waitFor(() =>
				expect(
					screen.getByText(/no categories found/i)
				).toBeInTheDocument()
			)
			fireEvent.click(screen.getByText('Add category'))
			expect(
				screen.getByText('Please enter a category name.')
			).toBeInTheDocument()
		})

		it('Then it should show an error if the category already exists', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('water')).toBeInTheDocument()
			)
			const input = screen.getByPlaceholderText('New category name...')
			fireEvent.change(input, { target: { value: 'water' } })
			fireEvent.click(screen.getByText('Add category'))
			expect(
				screen.getByText(/already exists/i)
			).toBeInTheDocument()
		})

		it('Then it should call add_category and reload on success', async () => {
			fetch_categories
				.mockResolvedValueOnce(mock_categories)
				.mockResolvedValueOnce([
					...mock_categories,
					{ id: 'cat-3', name: 'roads', active: true },
				])
			add_category.mockResolvedValueOnce({ success: true, id: 'cat-3' })

			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('water')).toBeInTheDocument()
			)

			const input = screen.getByPlaceholderText('New category name...')
			fireEvent.change(input, { target: { value: 'roads' } })
			fireEvent.click(screen.getByText('Add category'))

			await waitFor(() => expect(add_category).toHaveBeenCalledWith('roads'))
		})

		it('Then it should trigger add on Enter key press', async () => {
			fetch_categories.mockResolvedValueOnce([])
			add_category.mockResolvedValueOnce({ success: true, id: 'cat-new' })
			fetch_categories.mockResolvedValueOnce([])

			render(<AdminCategories />)
			await waitFor(() =>
				expect(
					screen.getByText(/no categories found/i)
				).toBeInTheDocument()
			)
			const input = screen.getByPlaceholderText('New category name...')
			fireEvent.change(input, { target: { value: 'parks' } })
			fireEvent.keyDown(input, { key: 'Enter' })

			await waitFor(() => expect(add_category).toHaveBeenCalledWith('parks'))
		})

		it('Then it should show an error message if add_category fails', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			add_category.mockRejectedValueOnce(new Error('Could not add category. Try again.'))

			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('water')).toBeInTheDocument()
			)

			const input = screen.getByPlaceholderText('New category name...')
			fireEvent.change(input, { target: { value: 'parks' } })
			fireEvent.click(screen.getByText('Add category'))

			await waitFor(() =>
				expect(
					screen.getByText('Could not add category. Try again.')
				).toBeInTheDocument()
			)
		})
	})

	// ── Toggle category ────────────────────────────────────────────────────

	describe('Given the admin toggles a category', () => {
		it('Then it should call remove_category when Deactivate is clicked', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			remove_category.mockResolvedValueOnce({ success: true })

			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('water')).toBeInTheDocument()
			)

			fireEvent.click(screen.getByText('Deactivate'))
			await waitFor(() => expect(remove_category).toHaveBeenCalled())
		})

		it('Then it should call remove_category when Activate is clicked', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			remove_category.mockResolvedValueOnce({ success: true })

			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('sewage')).toBeInTheDocument()
			)

			fireEvent.click(screen.getByText('Activate'))
			await waitFor(() => expect(remove_category).toHaveBeenCalled())
		})

		it('Then it should show a success message after toggling', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			remove_category.mockResolvedValueOnce({ success: true })

			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('water')).toBeInTheDocument()
			)

			fireEvent.click(screen.getByText('Deactivate'))
			await waitFor(() =>
				expect(screen.getByText(/deactivated/i)).toBeInTheDocument()
			)
		})

		it('Then it should show an error message if toggle fails', async () => {
			fetch_categories.mockResolvedValueOnce(mock_categories)
			remove_category.mockRejectedValueOnce(
				new Error('Could not update category. Try again.')
			)

			render(<AdminCategories />)
			await waitFor(() =>
				expect(screen.getByText('water')).toBeInTheDocument()
			)

			fireEvent.click(screen.getByText('Deactivate'))
			await waitFor(() =>
				expect(
					screen.getByText('Could not update category. Try again.')
				).toBeInTheDocument()
			)
		})
	})
})