/* global jest */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import ResidentDashboard from '../pages/resident_dashboard/resident_dashboard.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    fetch_resident_profile,
    fetch_resident_requests,
    subscribe_to_resident_unread_count
} from '../backend/resident_dashboard_service.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Mocks
───────────────────────────────────────────────────────────────────────────── */

jest.mock('../pages/resident_dashboard/resident_dashboard.css', () => ({}));
jest.mock('../firebase_config.js', () => ({ auth: {} }));

jest.mock('firebase/auth', () => ({
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn().mockResolvedValue(),
}));

jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    useLocation: () => ({ pathname: '/dashboard' }),
}));

jest.mock('../backend/resident_dashboard_service.js', () => ({
    fetch_resident_profile: jest.fn(),
    fetch_resident_requests: jest.fn(),
    subscribe_to_resident_unread_count: jest.fn(),
}));

// Mock Notification Bell & Message Thread to simplify DOM
jest.mock('../components/notification_bell/notification_bell.js', () => () => <div data-testid="notif-bell" />);
jest.mock('../components/message_thread/message_thread.js', () => () => <div data-testid="message-thread" />);

/* ─────────────────────────────────────────────────────────────────────────────
   Test Suite
───────────────────────────────────────────────────────────────────────────── */

describe('ResidentDashboard Component', () => {
    let mockUnsubscribe;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUnsubscribe = jest.fn();

        // Simulate authenticated resident
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback({ uid: 'res_1' });
            return jest.fn();
        });

        fetch_resident_profile.mockResolvedValue({
            uid: 'res_1',
            name: 'Sarah Connor',
            email: 'sarah@test.com'
        });

        fetch_resident_requests.mockResolvedValue([
            {
                id: 'req_1',
                category: 'Streetlight',
                status: 'Pending',
                description: 'Light is broken.',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: 'req_2',
                category: 'Pothole',
                status: 'Acknowledged',
                description: 'Huge crater in the road.',
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);

        subscribe_to_resident_unread_count.mockImplementation((uid, callback) => {
            callback(0);
            return mockUnsubscribe;
        });
    });

    test('renders loading screen initially and resolves cleanly', async () => {
        render(<ResidentDashboard />);
        
        // FIX: Match the exact text rendered by the component
        expect(screen.getByText('Loading your dashboard…')).toBeInTheDocument();
        
        // FIX: Await the data load to prevent act(...) state warnings leaking into the console
        await waitFor(() => {
            expect(screen.queryByText('Loading your dashboard…')).not.toBeInTheDocument();
        });
    });

    test('loads and displays resident profile and requests', async () => {
        render(<ResidentDashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
            expect(screen.getAllByText('Streetlight').length).toBeGreaterThan(0);
        });
        
        // Assert user initials logic
        expect(screen.getByText('SC')).toBeInTheDocument();
    });

    test('selects a request and shows detail view', async () => {
        render(<ResidentDashboard />);
        
        await waitFor(() => {
            expect(screen.getAllByText('Pothole').length).toBeGreaterThan(0);
        });

        // Click the second request card (Pothole) from the sidebar
        const requestCard = screen.getAllByText('Pothole')[0].closest('.rd-req-card');
        fireEvent.click(requestCard);

        // FIX: Handle multiple description elements by grabbing the first one
        expect(screen.getAllByText('Huge crater in the road.').length).toBeGreaterThan(0);
        expect(screen.getByText('Not yet assigned')).toBeInTheDocument();
    });

    test('displays empty state when resident has no requests', async () => {
        fetch_resident_requests.mockResolvedValue([]);

        render(<ResidentDashboard />);
        
        await waitFor(() => {
            expect(screen.getByText(/You haven't submitted any service requests yet/i)).toBeInTheDocument();
        });
    });

    test('handles user logout correctly', async () => {
        render(<ResidentDashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
        });

        const logoutBtn = screen.getByRole('button', { name: /Log out/i });
        fireEvent.click(logoutBtn);

        await waitFor(() => {
            expect(signOut).toHaveBeenCalledTimes(1);
        });
    });
});