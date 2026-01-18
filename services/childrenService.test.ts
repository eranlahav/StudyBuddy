/**
 * Tests for services/childrenService.ts
 *
 * Tests child profile CRUD operations including:
 * - Subscription to children changes
 * - Add, update, delete operations
 * - Stats reset and point awarding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Unsubscribe, QuerySnapshot, DocumentData, Query } from 'firebase/firestore';
import type { ChildProfile, GradeLevel } from '../types';

// Mock Firestore functions
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();

vi.mock('firebase/firestore', async () => {
  const { vi } = await import('vitest');
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn(),
    where: vi.fn()
  };
});

vi.mock('../firebaseConfig', () => ({
  db: {}
}));

// Mock the logger
vi.mock('../lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib')>();
  return {
    ...actual,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Import after mocks
import * as firestore from 'firebase/firestore';
import {
  subscribeToChildren,
  addChild,
  updateChild,
  deleteChild,
  resetChildStats,
  awardPoints
} from './childrenService';
import { DatabaseError } from '../lib';

// Test data
const mockChild: ChildProfile = {
  id: 'child-1',
  familyId: 'family-1',
  name: 'דני',
  avatar: 'cat',
  grade: 'כיתה ג\'' as GradeLevel,
  stars: 10,
  streak: 2,
  subjects: ['math-1'],
  proficiency: { 'math-1': 'medium' },
  pinHash: 'hashed-pin',
  createdAt: Date.now()
};

describe('childrenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToChildren', () => {
    it('subscribes to all children when no familyId provided', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, callback) => {
        // Simulate snapshot callback
        const snapshot = {
          docs: [
            { data: () => mockChild },
            { data: () => ({ ...mockChild, id: 'child-2', name: 'רונן' }) }
          ]
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      const unsubscribe = subscribeToChildren(onData);

      expect(firestore.collection).toHaveBeenCalledWith({}, 'children');
      expect(onData).toHaveBeenCalledWith([
        mockChild,
        expect.objectContaining({ id: 'child-2' })
      ]);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('filters by familyId when provided', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('filtered-query' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, callback) => {
        const snapshot = {
          docs: [{ data: () => mockChild }]
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      subscribeToChildren(onData, undefined, 'family-1');

      expect(firestore.where).toHaveBeenCalledWith('familyId', '==', 'family-1');
      expect(firestore.query).toHaveBeenCalled();
      expect(onData).toHaveBeenCalledWith([mockChild]);
    });

    it('calls onError callback when subscription fails', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        (errorCallback as any)(error);
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToChildren(onData, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(DatabaseError);
    });

    it('handles missing onError gracefully', () => {
      const onData = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        // Should not throw even without onError
        expect(() => (errorCallback as any)(error)).not.toThrow();
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToChildren(onData);
    });
  });

  describe('addChild', () => {
    it('adds a child document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      await addChild(mockChild);

      expect(firestore.doc).toHaveBeenCalledWith({}, 'children', 'child-1');
      expect(firestore.setDoc).toHaveBeenCalledWith('doc-ref', mockChild);
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Write failed'));

      await expect(addChild(mockChild)).rejects.toThrow(DatabaseError);
      await expect(addChild(mockChild)).rejects.toThrow('Failed to add child');
    });
  });

  describe('updateChild', () => {
    it('updates a child document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await updateChild('child-1', { name: 'דניאל' });

      expect(firestore.doc).toHaveBeenCalledWith({}, 'children', 'child-1');
      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', { name: 'דניאל' });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(updateChild('child-1', {})).rejects.toThrow(DatabaseError);
      await expect(updateChild('child-1', {})).rejects.toThrow('Failed to update child');
    });
  });

  describe('deleteChild', () => {
    it('deletes a child document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);

      await deleteChild('child-1');

      expect(firestore.doc).toHaveBeenCalledWith({}, 'children', 'child-1');
      expect(firestore.deleteDoc).toHaveBeenCalledWith('doc-ref');
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.deleteDoc).mockRejectedValue(new Error('Delete failed'));

      await expect(deleteChild('child-1')).rejects.toThrow(DatabaseError);
      await expect(deleteChild('child-1')).rejects.toThrow('Failed to delete child');
    });
  });

  describe('resetChildStats', () => {
    it('resets stars and streak to zero', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await resetChildStats('child-1');

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', {
        stars: 0,
        streak: 0
      });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Reset failed'));

      await expect(resetChildStats('child-1')).rejects.toThrow(DatabaseError);
      await expect(resetChildStats('child-1')).rejects.toThrow('Failed to reset child stats');
    });
  });

  describe('awardPoints', () => {
    it('adds points and increments streak', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await awardPoints('child-1', 10, 2, 5);

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', {
        stars: 15, // 10 + 5
        streak: 3  // 2 + 1
      });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Award failed'));

      await expect(awardPoints('child-1', 10, 2, 5)).rejects.toThrow(DatabaseError);
      await expect(awardPoints('child-1', 10, 2, 5)).rejects.toThrow('Failed to award points');
    });
  });
});
