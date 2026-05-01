import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

console.log = () => {}
console.debug = () => {}
console.error = () => {}

jest.mock('../../../firebase_config.js', () => ({
	auth: {
		currentUser: {
			uid: 'worker-uid-1',
			getIdToken: jest.fn().mockResolvedValue('mock-token'),
		},
	},
	db: {},
	storage: {},
}))

jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	setDoc: jest.fn(),
	getDoc: jest.fn(),
	doc: jest.fn(),
}))

jest.mock(
	'../../../components/buttons/yellow_btn.js',
	() =>
		function MockYellowBtn({ text, onClick }) {
			return (
				<button data-testid="yellow-btn" onClick={onClick}>
					{text}
				</button>
			)
		}
)

const mock_navigate = jest.fn()
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mock_navigate,
}))

import ClaimBtn from './claim_btn.js'
import { auth } from '../../../firebase_config.js'

const mock_post_claim = jest.fn()

function render_claim_btn(
	request_uid = 'req-001',
	post_claim = mock_post_claim
) {
	return render(
		<ClaimBtn request_uid={request_uid} post_claim={post_claim} />
	)
}

function mock_fetch_ok(response = {}) {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: jest.fn().mockResolvedValue(response),
	})
}

function mock_fetch_fail(response = { error: 'Server error' }) {
	global.fetch = jest.fn().mockResolvedValue({
		ok: false,
		json: jest.fn().mockResolvedValue(response),
	})
}

beforeEach(() => {
	jest.clearAllMocks()
	global.alert = jest.fn()
	auth.currentUser = {
		uid: 'worker-uid-1',
		getIdToken: jest.fn().mockResolvedValue('mock-token'),
	}
})

describe('Render', () => {
	test('renders Claim button initially', () => {
		render_claim_btn()
		expect(screen.getByTestId('yellow-btn')).toHaveTextContent('Claim')
	})

	test('passes correct initial text to YellowBtn', () => {
		render_claim_btn()
		expect(screen.getByText('Claim')).toBeInTheDocument()
	})
})

describe('Auth guard', () => {
	test('does nothing when auth is null', async () => {
		auth.currentUser = null
		mock_fetch_ok()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() => expect(global.fetch).not.toHaveBeenCalled())
		expect(mock_post_claim).not.toHaveBeenCalled()
	})

	test('does nothing when currentUser is null', async () => {
		auth.currentUser = null
		mock_fetch_ok()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() => expect(global.fetch).not.toHaveBeenCalled())
	})

	test('does nothing when uid is missing', async () => {
		auth.currentUser = { uid: null, getIdToken: jest.fn() }
		mock_fetch_ok()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() => expect(global.fetch).not.toHaveBeenCalled())
	})

	test('does not change button text when auth guard blocks', async () => {
		auth.currentUser = null
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		// stays as Claim, never goes to Loading
		expect(screen.getByTestId('yellow-btn')).toHaveTextContent('Claim')
	})
})

describe('Loading state', () => {
	test('shows Loading while fetch is in flight', async () => {
		// Never resolves — keeps component in loading state
		global.fetch = jest.fn().mockReturnValue(new Promise(() => {}))
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(screen.getByTestId('yellow-btn')).toHaveTextContent(
				'Loading'
			)
		)
	})

	test('resets to Claim after successful claim', async () => {
		mock_fetch_ok()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(screen.getByTestId('yellow-btn')).toHaveTextContent('Claim')
		)
	})

	test('resets to Claim after failed fetch', async () => {
		mock_fetch_fail()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(screen.getByTestId('yellow-btn')).toHaveTextContent('Claim')
		)
	})

	test('resets to Claim after thrown error', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'))
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(screen.getByTestId('yellow-btn')).toHaveTextContent('Claim')
		)
	})
})

describe('Successful claim', () => {
	test('calls fetch with correct URL and headers', async () => {
		mock_fetch_ok()
		render_claim_btn('req-abc')
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() => expect(global.fetch).toHaveBeenCalled())
		expect(global.fetch).toHaveBeenCalledWith(
			'/api/claim-request?request_uid=req-abc',
			expect.objectContaining({
				method: 'GET',
				headers: expect.objectContaining({
					Authorization: 'Bearer mock-token',
					'Content-Type': 'application/json',
				}),
			})
		)
	})

	test('calls getIdToken to get auth token', async () => {
		mock_fetch_ok()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(auth.currentUser.getIdToken).toHaveBeenCalled()
		)
	})

	test('shows success alert on ok response', async () => {
		mock_fetch_ok()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(global.alert).toHaveBeenCalledWith(
				'Request successfully claimed.'
			)
		)
	})

	test('calls post_claim after successful claim', async () => {
		mock_fetch_ok()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() => expect(mock_post_claim).toHaveBeenCalledTimes(1))
	})

	test('passes request_uid correctly in fetch URL', async () => {
		mock_fetch_ok()
		render_claim_btn('unique-req-id-999')
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(global.fetch).toHaveBeenCalledWith(
				'/api/claim-request?request_uid=unique-req-id-999',
				expect.anything()
			)
		)
	})
})

describe('Failed fetch response', () => {
	test('shows failure alert when response is not ok', async () => {
		mock_fetch_fail()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(global.alert).toHaveBeenCalledWith(
				'Failed to claim request. Browse console logs.'
			)
		)
	})

	test('does not call post_claim when response is not ok', async () => {
		mock_fetch_fail()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(screen.getByTestId('yellow-btn')).toHaveTextContent('Claim')
		)
		expect(mock_post_claim).not.toHaveBeenCalled()
	})

	test('does not show success alert when response is not ok', async () => {
		mock_fetch_fail()
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(global.alert).not.toHaveBeenCalledWith(
				'Request successfully claimed.'
			)
		)
	})
})

describe('Thrown errors', () => {
	test('does not call post_claim when fetch throws', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'))
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(screen.getByTestId('yellow-btn')).toHaveTextContent('Claim')
		)
		expect(mock_post_claim).not.toHaveBeenCalled()
	})

	test('does not show any alert when fetch throws', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'))
		render_claim_btn()
		fireEvent.click(screen.getByTestId('yellow-btn'))
		await waitFor(() =>
			expect(screen.getByTestId('yellow-btn')).toHaveTextContent('Claim')
		)
		expect(global.alert).not.toHaveBeenCalled()
	})

	test('does not throw when getIdToken rejects', async () => {
		auth.currentUser.getIdToken = jest
			.fn()
			.mockRejectedValue(new Error('Token error'))
		render_claim_btn()
		expect(() =>
			fireEvent.click(screen.getByTestId('yellow-btn'))
		).not.toThrow()
		await waitFor(() =>
			expect(screen.getByTestId('yellow-btn')).toHaveTextContent('Claim')
		)
	})
})
