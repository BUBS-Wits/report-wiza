import React from 'react'
import { render } from '@testing-library/react'
import ResidentDashboard from '../pages/resident_dashboard/resident_dashboard'

// Mock all external dependencies
jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
	signOut: jest.fn(),
}))
jest.mock('../firebase_config', () => ({ auth: {}, db: {} }))
jest.mock('../backend/resident_dashboard_service', () => ({
	fetch_resident_profile: jest.fn(),
	fetch_resident_requests: jest.fn(),
	subscribe_to_resident_unread_count: jest.fn(),
}))
jest.mock('react-router-dom', () => ({
	Link: ({ children, to }) => <a href={to}>{children}</a>,
	useLocation: () => ({ pathname: '/' }),
	useNavigate: () => jest.fn(),
}))
jest.mock('../components/message_thread/message_thread', () => () => null)
jest.mock(
	'../components/request_card/like_button/like_button',
	() => () => null
)
jest.mock('../pages/resident_dashboard/resident_dashboard.css', () => ({}))

describe('ResidentDashboard', () => {
	it('renders without crashing', () => {
		render(<ResidentDashboard />)
	})
})
