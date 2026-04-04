import {
	render,
	screen
} from '@testing-library/react'
import app from './app.js'

test('renders learn react link', () => {
	render( < app / > )
	const linkElement = screen.getByText(/learn react/i)
	expect(linkElement).toBeInTheDocument()
})
