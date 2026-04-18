import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResidentRequests from '../pages/resident/resident_requests';
import { auth } from '../firebase_config';
import { fetchResidentRequests } from '../backend/resident_firebase';

jest.mock('../firebase_config', () => ({
  auth: { currentUser: null },
}));
jest.mock('../backend/resident_firebase');

describe('ResidentRequests Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows login message when not authenticated', async () => {
    auth.currentUser = null;
    render(<ResidentRequests />);
    expect(await screen.findByText(/Please log in to view your requests./i)).toBeInTheDocument();
  });

  it('shows loading then list of requests', async () => {
    auth.currentUser = { uid: '123' };
    const mockRequests = [
      { id: '1', category: 'Pothole', status: 'open', description: 'Deep hole', created_at: { toDate: () => new Date() } },
    ];
    fetchResidentRequests.mockResolvedValue(mockRequests);

    render(<ResidentRequests />);
    expect(screen.getByText(/Loading your requests.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/My Service Requests/i)).toBeInTheDocument();
      expect(screen.getByText(/Pothole/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no requests', async () => {
    auth.currentUser = { uid: '123' };
    fetchResidentRequests.mockResolvedValue([]);

    render(<ResidentRequests />);
    expect(await screen.findByText(/You haven’t submitted any service requests yet./i)).toBeInTheDocument();
  });
});