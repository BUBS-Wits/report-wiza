import {
  hasUserLiked,
  addLike,
  removeLike,
  computePriority,
} from '../backend/like_service'
import {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
  collection,
  query,
  where,
} from 'firebase/firestore'

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  increment: jest.fn((n) => n),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getCountFromServer: jest.fn(),
}))

jest.mock('../firebase_config', () => ({
  db: {},
}))

describe('like_service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('computePriority', () => {
    it('returns Low for 0 likes out of any total', () => {
      expect(computePriority(0, 100)).toBe('Low')
      expect(computePriority(0, 0)).toBe('Low')
    })

    it('returns Low when totalResidents is 0 (avoids division by zero)', () => {
      expect(computePriority(10, 0)).toBe('Low')
    })

    it('returns Low when percentage is less than 1%', () => {
      // 0.99% with 100 residents
      expect(computePriority(0, 100)).toBe('Low')
    })

    it('returns Medium when percentage >= 5% but < 10%', () => {
      expect(computePriority(5, 100)).toBe('Medium')
      expect(computePriority(9, 100)).toBe('Medium')
    })

    it('returns High when percentage >= 10% but < 20%', () => {
      expect(computePriority(10, 100)).toBe('High')
      expect(computePriority(19, 100)).toBe('High')
    })

    it('returns Critical when percentage >= 20%', () => {
      expect(computePriority(20, 100)).toBe('Critical')
      expect(computePriority(200, 1000)).toBe('Critical') // exactly 20%
      expect(computePriority(30, 100)).toBe('Critical')
    })
  })

  describe('hasUserLiked', () => {
    it('returns true if like document exists', async () => {
      getDoc.mockResolvedValue({ exists: () => true })
      const result = await hasUserLiked('req123', 'user456')
      expect(result).toBe(true)
      expect(getDoc).toHaveBeenCalled()
    })

    it('returns false if like document does not exist', async () => {
      getDoc.mockResolvedValue({ exists: () => false })
      const result = await hasUserLiked('req123', 'user456')
      expect(result).toBe(false)
    })
  })

  describe('addLike', () => {
    it('creates like document and increments like_count', async () => {
      setDoc.mockResolvedValue()
      updateDoc.mockResolvedValue()
      // mock getTotalResidentCount and getDoc for priority update
      getCountFromServer.mockResolvedValue({ data: () => ({ count: 100 }) })
      getDoc.mockResolvedValue({ data: () => ({ like_count: 1, priority: 'Low' }) })

      await addLike('req123', 'user456')

      expect(setDoc).toHaveBeenCalled()
      expect(updateDoc).toHaveBeenCalled()
    })
  })

  describe('removeLike', () => {
    it('deletes like document and decrements like_count', async () => {
      deleteDoc.mockResolvedValue()
      updateDoc.mockResolvedValue()
      // mock getTotalResidentCount and getDoc for priority update
      getCountFromServer.mockResolvedValue({ data: () => ({ count: 100 }) })
      getDoc.mockResolvedValue({ data: () => ({ like_count: 0, priority: 'Low' }) })

      await removeLike('req123', 'user456')

      expect(deleteDoc).toHaveBeenCalled()
      expect(updateDoc).toHaveBeenCalled()
    })
  })
})