import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorkersList from '../components/workers_list/workers_list.js'

jest.mock('../components/workers_list/workers_list.css', () => ({}))

const mock_workers = [
  { id: 'w1', email: 'alice@test.com' },
  { id: 'w2', email: 'bob@test.com' },
]

describe('WorkersList component', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('Given the component is loading', () => {
    it('Then it should show loading text', () => {
      render(<WorkersList workers={[]} loading={true} revoking_uid={null} on_revoke={jest.fn()} />)
      expect(screen.getByText(/loading workers/i)).toBeInTheDocument()
    })
  })

  describe('Given there are no workers', () => {
    it('Then it should show the empty message', () => {
      render(<WorkersList workers={[]} loading={false} revoking_uid={null} on_revoke={jest.fn()} />)
      expect(screen.getByText(/no workers registered/i)).toBeInTheDocument()
    })
  })

  describe('Given there are workers', () => {
    it('Then it should display all worker emails', () => {
      render(<WorkersList workers={mock_workers} loading={false} revoking_uid={null} on_revoke={jest.fn()} />)
      expect(screen.getByText('alice@test.com')).toBeInTheDocument()
      expect(screen.getByText('bob@test.com')).toBeInTheDocument()
    })

    it('Then it should show a revoke button for each worker', () => {
      render(<WorkersList workers={mock_workers} loading={false} revoking_uid={null} on_revoke={jest.fn()} />)
      const buttons = screen.getAllByRole('button', { name: /revoke/i })
      expect(buttons).toHaveLength(2)
    })

    it('Then clicking revoke should call on_revoke with the correct worker', () => {
      const mock_revoke = jest.fn()
      render(<WorkersList workers={mock_workers} loading={false} revoking_uid={null} on_revoke={mock_revoke} />)
      fireEvent.click(screen.getAllByRole('button', { name: /revoke/i })[0])
      expect(mock_revoke).toHaveBeenCalledWith('w1', 'alice@test.com')
    })

    it('Then the revoking button should show revoking text and be disabled', () => {
      render(<WorkersList workers={mock_workers} loading={false} revoking_uid="w1" on_revoke={jest.fn()} />)
      expect(screen.getByText(/revoking/i)).toBeDisabled()
    })
  })
})