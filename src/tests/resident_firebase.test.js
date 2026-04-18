import { fetchResidentRequests } from '../backend/resident_firebase';
import { getDocs } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
}));

jest.mock('../firebase_config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

describe('fetchResidentRequests', () => {
  it('returns formatted requests on success', async () => {
    const mockSnapshot = {
      docs: [
        { id: '1', data: () => ({ category: 'Pothole', status: 'open' }) },
      ],
    };
    getDocs.mockResolvedValue(mockSnapshot);

    const result = await fetchResidentRequests('user123');
    expect(result).toEqual([{ id: '1', category: 'Pothole', status: 'open' }]);
  });

  it('throws error on Firestore failure', async () => {
    getDocs.mockRejectedValue(new Error('fail'));
    await expect(fetchResidentRequests('user123')).rejects.toThrow(
      'Could not load your requests. Try again later.'
    );
  });
});