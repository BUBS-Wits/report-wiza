import { hasUserLiked, addLike, removeLike } from '../backend/like_service'
import { getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(() => ({})),
	getDoc: jest.fn(),
	setDoc: jest.fn(),
	updateDoc: jest.fn(),
	deleteDoc: jest.fn(),
	increment: jest.fn((n) => n),
}))

jest.mock('../firebase_config', () => ({
	db: {},
}))

describe('like_service', () => {
	beforeEach(() => {
		jest.clearAllMocks()
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

			await addLike('req123', 'user456')

			expect(setDoc).toHaveBeenCalled()
			expect(updateDoc).toHaveBeenCalled()
		})
	})

	describe('removeLike', () => {
		it('deletes like document and decrements like_count', async () => {
			deleteDoc.mockResolvedValue()
			updateDoc.mockResolvedValue()

			await removeLike('req123', 'user456')

			expect(deleteDoc).toHaveBeenCalled()
			expect(updateDoc).toHaveBeenCalled()
		})
	})
})
