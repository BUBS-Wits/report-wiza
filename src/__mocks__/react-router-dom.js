/* global jest */
const React = require('react')

module.exports = {
	Link: ({ children, to }) =>
		React.createElement('a', { href: to }, children),
	NavLink: ({ children, to }) =>
		React.createElement('a', { href: to }, children),
	useNavigate: () => jest.fn(),
	useLocation: () => ({ pathname: '/' }),
	useParams: () => ({}),
	useSearchParams: () => [new URLSearchParams(), jest.fn()],
	Outlet: () => null,
	Navigate: () => null,
	BrowserRouter: ({ children }) => children,
	Routes: ({ children }) => children,
	Route: () => null,
}
