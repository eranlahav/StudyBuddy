/**
 * Tests for services/subjectsService.ts
 *
 * Tests subject operations including:
 * - Subscription to subjects changes
 * - Add/delete subjects
 * - Batch seeding
 * - Utility functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Unsubscribe, QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { Subject } from '../types';

// Mock Firestore functions
vi.mock('firebase/firestore', async () => {
  const { vi } = await import('vitest');

  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined)
  };

  return {
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    onSnapshot: vi.fn(),
    writeBatch: vi.fn(() => mockBatch)
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
  subscribeToSubjects,
  addSubject,
  deleteSubject,
  seedSubjects,
  findSubjectById,
  getSubjectTopics
} from './subjectsService';
import { DatabaseError } from '../lib';

// Test data
const mockSubject: Subject = {
  id: 'math-1',
  name: 'מתמטיקה',
  icon: '➕',
  color: '#4CAF50',
  topics: ['חיבור', 'חיסור', 'כפל', 'חילוק']
};

const mockSubjects: Subject[] = [
  mockSubject,
  {
    id: 'hebrew-1',
    name: 'עברית',
    icon: '📖',
    color: '#2196F3',
    topics: ['קריאה', 'כתיבה', 'דקדוק']
  }
];

describe('subjectsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToSubjects', () => {
    it('subscribes to subjects collection', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, callback) => {
        const snapshot = {
          docs: mockSubjects.map(s => ({ data: () => s }))
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      const unsubscribe = subscribeToSubjects(onData);

      expect(firestore.collection).toHaveBeenCalledWith({}, 'subjects');
      expect(onData).toHaveBeenCalledWith(mockSubjects);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('calls onError callback when subscription fails', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        (errorCallback as any)(error);
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToSubjects(onData, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(DatabaseError);
    });

    it('handles missing onError gracefully', () => {
      const onData = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        expect(() => (errorCallback as any)(error)).not.toThrow();
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToSubjects(onData);
    });
  });

  describe('addSubject', () => {
    it('adds a subject document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      await addSubject(mockSubject);

      expect(firestore.doc).toHaveBeenCalledWith({}, 'subjects', 'math-1');
      expect(firestore.setDoc).toHaveBeenCalledWith('doc-ref', mockSubject);
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Write failed'));

      await expect(addSubject(mockSubject)).rejects.toThrow(DatabaseError);
      await expect(addSubject(mockSubject)).rejects.toThrow('Failed to add subject');
    });
  });

  describe('deleteSubject', () => {
    it('deletes a subject document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);

      await deleteSubject('math-1');

      expect(firestore.doc).toHaveBeenCalledWith({}, 'subjects', 'math-1');
      expect(firestore.deleteDoc).toHaveBeenCalledWith('doc-ref');
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.deleteDoc).mockRejectedValue(new Error('Delete failed'));

      await expect(deleteSubject('math-1')).rejects.toThrow(DatabaseError);
      await expect(deleteSubject('math-1')).rejects.toThrow('Failed to delete subject');
    });
  });

  describe('seedSubjects', () => {
    it('seeds multiple subjects in a batch', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };
      vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any);
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);

      await seedSubjects(mockSubjects);

      expect(firestore.writeBatch).toHaveBeenCalledWith({});
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('throws DatabaseError on failure', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Batch failed'))
      };
      vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any);
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);

      await expect(seedSubjects(mockSubjects)).rejects.toThrow(DatabaseError);
      await expect(seedSubjects(mockSubjects)).rejects.toThrow('Failed to seed subjects');
    });
  });

  describe('findSubjectById', () => {
    it('returns subject when found', () => {
      const result = findSubjectById(mockSubjects, 'math-1');

      expect(result).toEqual(mockSubject);
    });

    it('returns undefined when not found', () => {
      const result = findSubjectById(mockSubjects, 'nonexistent');

      expect(result).toBeUndefined();
    });

    it('handles empty array', () => {
      const result = findSubjectById([], 'math-1');

      expect(result).toBeUndefined();
    });
  });

  describe('getSubjectTopics', () => {
    it('returns topics for a subject', () => {
      const result = getSubjectTopics(mockSubjects, 'math-1');

      expect(result).toEqual(['חיבור', 'חיסור', 'כפל', 'חילוק']);
    });

    it('returns empty array when subject not found', () => {
      const result = getSubjectTopics(mockSubjects, 'nonexistent');

      expect(result).toEqual([]);
    });

    it('returns empty array when subject has no topics', () => {
      const subjectNoTopics = { ...mockSubject, topics: undefined } as any;
      const result = getSubjectTopics([subjectNoTopics], 'math-1');

      expect(result).toEqual([]);
    });
  });
});
