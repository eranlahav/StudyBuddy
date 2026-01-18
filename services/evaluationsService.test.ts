/**
 * Tests for services/evaluationsService.ts
 *
 * Tests evaluation (school test) operations including:
 * - Subscription to evaluations changes
 * - Add, update, delete operations
 * - Filtering by child, subject, and date range
 * - Statistics calculation and trend data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Unsubscribe, QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { Evaluation } from '../types';

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

// Mock storage service
vi.mock('./storageService', () => ({
  deleteEvaluationFiles: vi.fn().mockResolvedValue(undefined)
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
  subscribeToEvaluations,
  subscribeToChildEvaluations,
  addEvaluation,
  updateEvaluation,
  deleteEvaluation,
  filterEvaluationsByChild,
  filterEvaluationsBySubject,
  filterEvaluationsByDateRange,
  calculateEvaluationStats,
  getEvaluationTrendData
} from './evaluationsService';
import { deleteEvaluationFiles } from './storageService';
import { DatabaseError } from '../lib';

// Test data
const now = Date.now();
const oneDay = 24 * 60 * 60 * 1000;

const mockEvaluation: Evaluation = {
  id: 'eval-1',
  familyId: 'family-1',
  childId: 'child-1',
  subject: 'math-1',
  subjectName: 'מתמטיקה',
  testName: 'מבחן שבועי',
  date: now,
  percentage: 85,
  score: '85',
  maxScore: '100',
  weakTopics: ['כפל'],
  strongTopics: ['חיבור', 'חיסור'],
  notes: 'צריך לתרגל כפל',
  fileUrls: [],
  createdAt: now,
  createdBy: 'parent-1'
};

const mockEvaluations: Evaluation[] = [
  mockEvaluation,
  {
    ...mockEvaluation,
    id: 'eval-2',
    childId: 'child-2',
    subject: 'hebrew-1',
    subjectName: 'עברית',
    testName: 'מבחן דקדוק',
    date: now - oneDay,
    percentage: 90,
    weakTopics: [],
    strongTopics: ['דקדוק', 'פועל']
  },
  {
    ...mockEvaluation,
    id: 'eval-3',
    childId: 'child-1',
    subject: 'math-1',
    subjectName: 'מתמטיקה',
    testName: 'מבחן חודשי',
    date: now - (2 * oneDay),
    percentage: 75,
    weakTopics: ['חילוק', 'שברים'],
    strongTopics: ['חיבור']
  }
];

describe('evaluationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToEvaluations', () => {
    it('subscribes to evaluations for a family', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, callback) => {
        const snapshot = {
          docs: mockEvaluations.map(e => ({ data: () => e }))
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      const unsubscribe = subscribeToEvaluations('family-1', onData);

      expect(firestore.where).toHaveBeenCalledWith('familyId', '==', 'family-1');
      expect(onData).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('sorts evaluations by date descending', () => {
      const onData = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, callback) => {
        const snapshot = {
          docs: mockEvaluations.map(e => ({ data: () => e }))
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToEvaluations('family-1', onData);

      const receivedEvaluations = onData.mock.calls[0][0] as Evaluation[];
      expect(receivedEvaluations[0].date).toBeGreaterThanOrEqual(receivedEvaluations[1].date);
    });

    it('calls onError callback when subscription fails', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        (errorCallback as any)(error);
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToEvaluations('family-1', onData, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(DatabaseError);
    });
  });

  describe('subscribeToChildEvaluations', () => {
    it('subscribes to evaluations for a specific child', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, callback) => {
        const snapshot = {
          docs: [{ data: () => mockEvaluation }]
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      const unsubscribe = subscribeToChildEvaluations('child-1', onData);

      expect(firestore.where).toHaveBeenCalledWith('childId', '==', 'child-1');
      expect(onData).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('calls onError callback when subscription fails', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        (errorCallback as any)(error);
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToChildEvaluations('child-1', onData, onError);

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('addEvaluation', () => {
    it('adds an evaluation document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      await addEvaluation(mockEvaluation);

      expect(firestore.doc).toHaveBeenCalledWith({}, 'evaluations', 'eval-1');
      expect(firestore.setDoc).toHaveBeenCalledWith('doc-ref', mockEvaluation);
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Write failed'));

      await expect(addEvaluation(mockEvaluation)).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateEvaluation', () => {
    it('updates an evaluation document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await updateEvaluation('eval-1', { percentage: 90 });

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', { percentage: 90 });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(updateEvaluation('eval-1', {})).rejects.toThrow(DatabaseError);
    });
  });

  describe('deleteEvaluation', () => {
    it('deletes evaluation without files', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);

      await deleteEvaluation('eval-1');

      expect(deleteEvaluationFiles).not.toHaveBeenCalled();
      expect(firestore.deleteDoc).toHaveBeenCalledWith('doc-ref');
    });

    it('deletes files before deleting document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);

      const fileUrls = ['https://storage.com/file1.pdf', 'https://storage.com/file2.pdf'];
      await deleteEvaluation('eval-1', fileUrls);

      expect(deleteEvaluationFiles).toHaveBeenCalledWith(fileUrls);
      expect(firestore.deleteDoc).toHaveBeenCalledWith('doc-ref');
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.deleteDoc).mockRejectedValue(new Error('Delete failed'));

      await expect(deleteEvaluation('eval-1')).rejects.toThrow(DatabaseError);
    });
  });

  describe('filterEvaluationsByChild', () => {
    it('returns evaluations for specified child', () => {
      const result = filterEvaluationsByChild(mockEvaluations, 'child-1');

      expect(result).toHaveLength(2);
      expect(result.every(e => e.childId === 'child-1')).toBe(true);
    });

    it('returns empty array when no evaluations match', () => {
      const result = filterEvaluationsByChild(mockEvaluations, 'child-999');

      expect(result).toHaveLength(0);
    });
  });

  describe('filterEvaluationsBySubject', () => {
    it('returns evaluations for specified subject', () => {
      const result = filterEvaluationsBySubject(mockEvaluations, 'math-1');

      expect(result).toHaveLength(2);
      expect(result.every(e => e.subject === 'math-1')).toBe(true);
    });

    it('returns empty array when no evaluations match', () => {
      const result = filterEvaluationsBySubject(mockEvaluations, 'english-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('filterEvaluationsByDateRange', () => {
    it('returns evaluations within date range', () => {
      const startDate = now - oneDay;
      const endDate = now;

      const result = filterEvaluationsByDateRange(mockEvaluations, startDate, endDate);

      expect(result).toHaveLength(2);
    });

    it('returns empty array when no evaluations in range', () => {
      const startDate = now + (10 * oneDay);
      const endDate = now + (20 * oneDay);

      const result = filterEvaluationsByDateRange(mockEvaluations, startDate, endDate);

      expect(result).toHaveLength(0);
    });
  });

  describe('calculateEvaluationStats', () => {
    it('calculates comprehensive statistics', () => {
      const result = calculateEvaluationStats(mockEvaluations);

      expect(result.totalEvaluations).toBe(3);
      expect(result.averageScore).toBe(83); // (85 + 90 + 75) / 3 = 83.33, rounded
      expect(result.weakTopicsCount).toBe(3); // 1 + 0 + 2
      expect(result.strongTopicsCount).toBe(5); // 2 + 2 + 1
      expect(result.bySubject['math-1'].count).toBe(2);
      expect(result.bySubject['hebrew-1'].count).toBe(1);
    });

    it('returns zeros for empty evaluations', () => {
      const result = calculateEvaluationStats([]);

      expect(result.totalEvaluations).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.weakTopicsCount).toBe(0);
      expect(result.strongTopicsCount).toBe(0);
      expect(result.bySubject).toEqual({});
    });

    it('handles evaluations without percentage', () => {
      const evalNoScore: Evaluation = {
        ...mockEvaluation,
        percentage: undefined
      };

      const result = calculateEvaluationStats([evalNoScore]);

      expect(result.totalEvaluations).toBe(1);
      expect(result.averageScore).toBe(0);
    });
  });

  describe('getEvaluationTrendData', () => {
    it('returns trend data sorted by date ascending', () => {
      const result = getEvaluationTrendData(mockEvaluations);

      expect(result).toHaveLength(3);
      // Should be sorted oldest first
      expect(result[0].date).toBeLessThan(result[1].date);
      expect(result[1].date).toBeLessThan(result[2].date);
    });

    it('filters out evaluations without percentage', () => {
      const evalNoScore: Evaluation = {
        ...mockEvaluation,
        id: 'eval-no-score',
        percentage: undefined
      };

      const result = getEvaluationTrendData([...mockEvaluations, evalNoScore]);

      expect(result).toHaveLength(3);
      expect(result.find(r => r.score === undefined)).toBeUndefined();
    });

    it('returns empty array for no evaluations', () => {
      const result = getEvaluationTrendData([]);

      expect(result).toHaveLength(0);
    });

    it('includes all required fields', () => {
      const result = getEvaluationTrendData([mockEvaluation]);

      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('subject');
      expect(result[0]).toHaveProperty('subjectName');
      expect(result[0]).toHaveProperty('testName');
    });
  });
});
