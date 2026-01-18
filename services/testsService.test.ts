/**
 * Tests for services/testsService.ts
 *
 * Tests upcoming test operations including:
 * - Subscription to tests changes
 * - Add, update, delete operations
 * - Filtering by child, subject, and date range
 * - Getting next upcoming test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Unsubscribe, QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { UpcomingTest } from '../types';

// Mock Firestore functions
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
  subscribeToTests,
  addTest,
  updateTest,
  deleteTest,
  filterTestsByChild,
  filterTestsBySubject,
  filterTestsByDateRange,
  getUpcomingTests,
  getNextTest
} from './testsService';
import { DatabaseError } from '../lib';

// Test data
const now = Date.now();
const oneDay = 24 * 60 * 60 * 1000;

const mockTest: UpcomingTest = {
  id: 'test-1',
  familyId: 'family-1',
  childId: 'child-1',
  subjectId: 'math-1',
  date: now + oneDay, // Tomorrow
  topics: ['חיבור', 'חיסור'],
  numQuestions: 10,
  type: 'quiz'
};

const mockTests: UpcomingTest[] = [
  mockTest,
  {
    ...mockTest,
    id: 'test-2',
    childId: 'child-2',
    subjectId: 'hebrew-1',
    date: now + (2 * oneDay), // 2 days from now
    topics: ['קריאה'],
    type: 'dictation',
    dictationWords: ['שלום', 'בוקר'],
    dictationMode: 'recognition'
  },
  {
    ...mockTest,
    id: 'test-3',
    childId: 'child-1',
    subjectId: 'hebrew-1',
    date: now - oneDay, // Yesterday (past)
    topics: ['כתיבה']
  },
  {
    ...mockTest,
    id: 'test-4',
    childId: 'child-1',
    date: now + (3 * oneDay), // 3 days from now
    topics: ['כפל']
  }
];

describe('testsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToTests', () => {
    it('subscribes to all tests when no familyId provided', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, callback) => {
        const snapshot = {
          docs: mockTests.map(t => ({ data: () => t }))
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      const unsubscribe = subscribeToTests(onData);

      expect(firestore.collection).toHaveBeenCalledWith({}, 'upcomingTests');
      expect(onData).toHaveBeenCalledWith(mockTests);
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
          docs: [{ data: () => mockTest }]
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      subscribeToTests(onData, undefined, 'family-1');

      expect(firestore.where).toHaveBeenCalledWith('familyId', '==', 'family-1');
      expect(firestore.query).toHaveBeenCalled();
      expect(onData).toHaveBeenCalledWith([mockTest]);
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

      subscribeToTests(onData, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(DatabaseError);
    });

    it('handles missing onError gracefully', () => {
      const onData = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        expect(() => (errorCallback as any)(error)).not.toThrow();
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToTests(onData);
    });
  });

  describe('addTest', () => {
    it('adds a test document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      await addTest(mockTest);

      expect(firestore.doc).toHaveBeenCalledWith({}, 'upcomingTests', 'test-1');
      expect(firestore.setDoc).toHaveBeenCalledWith('doc-ref', mockTest);
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Write failed'));

      await expect(addTest(mockTest)).rejects.toThrow(DatabaseError);
      await expect(addTest(mockTest)).rejects.toThrow('Failed to add test');
    });
  });

  describe('updateTest', () => {
    it('updates a test document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await updateTest('test-1', { topics: ['חיבור', 'חיסור', 'כפל'] });

      expect(firestore.doc).toHaveBeenCalledWith({}, 'upcomingTests', 'test-1');
      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', { topics: ['חיבור', 'חיסור', 'כפל'] });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(updateTest('test-1', {})).rejects.toThrow(DatabaseError);
      await expect(updateTest('test-1', {})).rejects.toThrow('Failed to update test');
    });
  });

  describe('deleteTest', () => {
    it('deletes a test document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);

      await deleteTest('test-1');

      expect(firestore.doc).toHaveBeenCalledWith({}, 'upcomingTests', 'test-1');
      expect(firestore.deleteDoc).toHaveBeenCalledWith('doc-ref');
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.deleteDoc).mockRejectedValue(new Error('Delete failed'));

      await expect(deleteTest('test-1')).rejects.toThrow(DatabaseError);
      await expect(deleteTest('test-1')).rejects.toThrow('Failed to delete test');
    });
  });

  describe('filterTestsByChild', () => {
    it('returns only tests for the specified child', () => {
      const result = filterTestsByChild(mockTests, 'child-1');

      expect(result).toHaveLength(3); // test-1, test-3, test-4
      expect(result.every(t => t.childId === 'child-1')).toBe(true);
    });

    it('returns empty array when no tests match', () => {
      const result = filterTestsByChild(mockTests, 'child-999');

      expect(result).toHaveLength(0);
    });

    it('handles empty tests array', () => {
      const result = filterTestsByChild([], 'child-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('filterTestsBySubject', () => {
    it('returns only tests for the specified subject', () => {
      const result = filterTestsBySubject(mockTests, 'hebrew-1');

      expect(result).toHaveLength(2); // test-2, test-3
      expect(result.every(t => t.subjectId === 'hebrew-1')).toBe(true);
    });

    it('returns empty array when no tests match', () => {
      const result = filterTestsBySubject(mockTests, 'english-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('filterTestsByDateRange', () => {
    it('returns tests within the specified date range', () => {
      const startDate = now;
      const endDate = now + (2 * oneDay);

      const result = filterTestsByDateRange(mockTests, startDate, endDate);

      expect(result).toHaveLength(2); // test-1 (tomorrow), test-2 (2 days)
      expect(result.every(t => t.date >= startDate && t.date <= endDate)).toBe(true);
    });

    it('returns empty array when no tests in range', () => {
      const startDate = now + (10 * oneDay);
      const endDate = now + (20 * oneDay);

      const result = filterTestsByDateRange(mockTests, startDate, endDate);

      expect(result).toHaveLength(0);
    });

    it('includes tests exactly on boundaries', () => {
      const exactTest: UpcomingTest = { ...mockTest, date: now };
      const result = filterTestsByDateRange([exactTest], now, now);

      expect(result).toHaveLength(1);
    });
  });

  describe('getUpcomingTests', () => {
    it('returns only future tests sorted by date', () => {
      const result = getUpcomingTests(mockTests);

      // Should exclude test-3 (yesterday)
      expect(result).toHaveLength(3);
      expect(result.find(t => t.id === 'test-3')).toBeUndefined();

      // Should be sorted by date ascending
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date).toBeGreaterThanOrEqual(result[i - 1].date);
      }
    });

    it('returns empty array when all tests are in the past', () => {
      const pastTests: UpcomingTest[] = [
        { ...mockTest, date: now - oneDay },
        { ...mockTest, id: 'test-2', date: now - (2 * oneDay) }
      ];

      const result = getUpcomingTests(pastTests);

      expect(result).toHaveLength(0);
    });

    it('handles empty array', () => {
      const result = getUpcomingTests([]);

      expect(result).toHaveLength(0);
    });
  });

  describe('getNextTest', () => {
    it('returns the next upcoming test for a child', () => {
      const result = getNextTest(mockTests, 'child-1');

      // Should be test-1 (tomorrow), not test-3 (yesterday) or test-4 (3 days)
      expect(result).toBeDefined();
      expect(result!.id).toBe('test-1');
    });

    it('returns undefined when child has no upcoming tests', () => {
      const pastTests: UpcomingTest[] = [
        { ...mockTest, childId: 'child-1', date: now - oneDay }
      ];

      const result = getNextTest(pastTests, 'child-1');

      expect(result).toBeUndefined();
    });

    it('returns undefined when child has no tests', () => {
      const result = getNextTest(mockTests, 'child-999');

      expect(result).toBeUndefined();
    });

    it('returns undefined for empty tests array', () => {
      const result = getNextTest([], 'child-1');

      expect(result).toBeUndefined();
    });
  });
});
