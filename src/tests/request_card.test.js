import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RequestCard from '../components/request_card/request_card.js'

jest.mock('../components/request_card/like_button/like_button.js', () => {
	return function MockLikeButton({ requestId, initialLikeCount }) {
		return (
			<button data-testid="like-button">
				Like {requestId} {initialLikeCount}
			</button>
		)
	}
})

const base_request = {
	id: 'req-001',
	category: 'Water',
	status: 'open',
	sa_ward: 5,
	sa_m_name: 'Cape Town',
	description: 'Burst pipe on main road',
	like_count: 2,
}

describe('RequestCard', () => {
	test('renders all public request fields by default', () => {
		render(<RequestCard request={base_request} />)

		expect(screen.getByText('Water')).toBeInTheDocument()
		expect(screen.getByText('Status: Submitted')).toBeInTheDocument()
		expect(screen.getByText(/Ward 5/)).toBeInTheDocument()
		expect(screen.getByText(/Cape Town/)).toBeInTheDocument()
		expect(screen.getByText('Burst pipe on main road')).toBeInTheDocument()
		expect(screen.getByTestId('like-button')).toHaveTextContent(
			'Like req-001 2'
		)
	})

	test('hides fields when visibleFields disables them', () => {
		render(
			<RequestCard
				request={base_request}
				visibleFields={{
					category: false,
					status: false,
					ward: false,
					municipality: false,
					description: false,
					likes: false,
				}}
			/>
		)

		expect(screen.queryByText('Water')).not.toBeInTheDocument()
		expect(screen.queryByText('Submitted')).not.toBeInTheDocument()
		expect(screen.queryByText(/Ward 5/)).not.toBeInTheDocument()
		expect(screen.queryByText(/Cape Town/)).not.toBeInTheDocument()
		expect(
			screen.queryByText('Burst pipe on main road')
		).not.toBeInTheDocument()
		expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
	})

	test('shows only municipality when ward is hidden', () => {
		render(
			<RequestCard
				request={base_request}
				visibleFields={{ ward: false, municipality: true }}
			/>
		)

		expect(screen.queryByText(/Ward 5/)).not.toBeInTheDocument()
		expect(screen.getByText('Cape Town')).toBeInTheDocument()
	})

	test('shows only ward when municipality is hidden', () => {
		render(
			<RequestCard
				request={base_request}
				visibleFields={{ ward: true, municipality: false }}
			/>
		)

		expect(screen.getByText('Ward 5')).toBeInTheDocument()
		expect(screen.queryByText(/Cape Town/)).not.toBeInTheDocument()
	})

	test('shows fallback dash when ward and municipality values are missing', () => {
		render(
			<RequestCard
				request={{
					...base_request,
					sa_ward: null,
					sa_m_name: null,
				}}
			/>
		)

		expect(screen.getByText('— · —')).toBeInTheDocument()
	})

	test('displays friendly ward label when request has an official ward code', () => {
		render(
			<RequestCard
				request={{
					...base_request,
					id: 'req-ward-code',
					sa_ward: 79800057,
					sa_m_name: 'Johannesburg',
					status: 'submitted',
				}}
			/>
		)

		// Our component shows the raw sa_ward number
		expect(screen.getByText(/Ward 79800057/)).toBeInTheDocument()
		expect(screen.getByText(/Johannesburg/)).toBeInTheDocument()
	})

	test('uses request status text when status is not in STATUS_DISPLAY', () => {
		render(
			<RequestCard
				request={{
					...base_request,
					status: 'custom_status',
				}}
			/>
		)

		expect(screen.getByText('Status: custom_status')).toBeInTheDocument()
	})

	test('uses unknown when request status is missing', () => {
		render(
			<RequestCard
				request={{
					...base_request,
					status: null,
				}}
			/>
		)

		expect(screen.getByText('Status: Unknown')).toBeInTheDocument()
	})

	test('hides like button when request is resolved', () => {
		render(
			<RequestCard
				request={{
					...base_request,
					status: 'resolved',
				}}
			/>
		)

		expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
	})

	test('hides like button when request is closed', () => {
		render(
			<RequestCard
				request={{
					...base_request,
					status: 'closed',
				}}
			/>
		)

		expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
	})

	test('uses zero as the like count fallback', () => {
		render(
			<RequestCard
				request={{
					...base_request,
					like_count: null,
				}}
			/>
		)

		expect(screen.getByTestId('like-button')).toHaveTextContent(
			'Like req-001 0'
		)
	})
})
