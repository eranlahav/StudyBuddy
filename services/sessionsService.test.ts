/**
 * Tests for services/sessionsService.ts
 *
 * Tests study session operations including:
 * - Subscription to sessions changes
 * - Adding new sessions
 * - Filtering by child and subject
 * - Statistics calculation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Unsubscribe, QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { StudySession } from '../types';

// Mock Firestore functions
vi.mock('firebase/firestore', async () => {
  const { vi } = await import('vitest');
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
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
  subscribeToSessions,
  addSession,
  filterSessionsByChild,
  filterSessionsBySubject,
  calculateStats
} from './sessionsService';
import { DatabaseError } from '../lib';

// Test data
const mockSession: StudySession = {
  id: 'session-1',
  familyId: 'family-1',
  childId: 'child-1',
  subjectId: 'math-1',
  topic: 'חיבור',
  date: Date.now(),
  score: 8,
  totalQuestions: 10,
  questions: [],
  userAnswers: []
};

const mockSessions: StudySession[] = [
  mockSession,
  {
    ...mockSession,
    id: 'session-2',
    childId: 'child-2',
    subjectId: 'hebrew-1',
    topic: 'קריאה',
    date: Date.now() - 1000,
    score: 7,
    totalQuestions: 10
  },
  {
    ...mockSession,
    id: 'session-3',
    childId: 'child-1',
    subjectId: 'hebrew-1',
    topic: 'כתיבה',
    date: Date.now() - 2000,
    score: 9,
    totalQuestions: 10
  }
];

describe('sessionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToSessions', () => {
    it('subscribes to all sessions when no familyId provided', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, callback) => {
        const snapshot = {
          docs: mockSessions.map(s => ({ data: () => s }))
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      const unsubscribe = subscribeToSessions(onData);

      expect(firestore.collection).toHaveBeenCalledWith({}, 'sessions');
      expect(onData).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('sorts sessions by date descending', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, callback) => {
        const snapshot = {
          docs: mockSessions.map(s => ({ data: () => s }))
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      subscribeToSessions(onData);

      const receivedSessions = onData.mock.calls[0][0] as StudySession[];
      // First session should have the highest (most recent) date
      expect(receivedSessions[0].date).toBeGreaterThanOrEqual(receivedSessions[1].date);
      expect(receivedSessions[1].date).toBeGreaterThanOrEqual(receivedSessions[2].date);
    });

    it('filters by familyId when provided', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('filtered-query' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_query, callback) => {
        const snapshot = {
          docs: [{ data: () => mockSession }]
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      subscribeToSessions(onData, undefined, 'family-1');

      expect(firestore.where).toHaveBeenCalledWith('familyId', '==', 'family-1');
      expect(firestore.query).toHaveBeenCalled();
      expect(onData).toHaveBeenCalledWith([mockSession]);
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

      subscribeToSessions(onData, onError);

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

      subscribeToSessions(onData);
    });
  });

  describe('addSession', () => {
    it('adds a session document', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      await addSession(mockSession);

      expect(firestore.doc).toHaveBeenCalledWith({}, 'sessions', 'session-1');
      expect(firestore.setDoc).toHaveBeenCalledWith('doc-ref', mockSession);
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Write failed'));

      await expect(addSession(mockSession)).rejects.toThrow(DatabaseError);
      await expect(addSession(mockSession)).rejects.toThrow('Failed to add session');
    });
  });

  describe('filterSessionsByChild', () => {
    it('returns only sessions for the specified child', () => {
      const result = filterSessionsByChild(mockSessions, 'child-1');

      expect(result).toHaveLength(2);
      expect(result.every(s => s.childId === 'child-1')).toBe(true);
    });

    it('returns empty array when no sessions match', () => {
      const result = filterSessionsByChild(mockSessions, 'child-999');

      expect(result).toHaveLength(0);
    });

    it('handles empty sessions array', () => {
      const result = filterSessionsByChild([], 'child-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('filterSessionsBySubject', () => {
    it('returns only sessions for the specified subject', () => {
      const result = filterSessionsBySubject(mockSessions, 'hebrew-1');

      expect(result).toHaveLength(2);
      expect(result.every(s => s.subjectId === 'hebrew-1')).toBe(true);
    });

    it('returns empty array when no sessions match', () => {
      const result = filterSessionsBySubject(mockSessions, 'english-1');

      expect(result).toHaveLength(0);
    });

    it('handles empty sessions array', () => {
      const result = filterSessionsBySubject([], 'math-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('calculateStats', () => {
    it('calculates correct statistics for sessions', () => {
      const result = calculateStats(mockSessions);

      expect(result.totalCorrect).toBe(24); // 8 + 7 + 9
      expect(result.totalQuestions).toBe(30); // 10 + 10 + 10
      expect(result.averagePercentage).toBe(80); // 24/30 * 100 = 80
      expect(result.sessionCount).toBe(3);
    });

    it('returns zeros for empty sessions array', () => {
      const result = calculateStats([]);

      expect(result.totalCorrect).toBe(0);
      expect(result.totalQuestions).toBe(0);
      expect(result.averagePercentage).toBe(0);
      expect(result.sessionCount).toBe(0);
    });

    it('handles single session', () => {
      const result = calculateStats([mockSession]);

      expect(result.totalCorrect).toBe(8);
      expect(result.totalQuestions).toBe(10);
      expect(result.averagePercentage).toBe(80);
      expect(result.sessionCount).toBe(1);
    });

    it('handles perfect score', () => {
      const perfectSession: StudySession = {
        ...mockSession,
        score: 10,
        totalQuestions: 10
      };

      const result = calculateStats([perfectSession]);

      expect(result.averagePercentage).toBe(100);
    });

    it('handles zero score', () => {
      const zeroSession: StudySession = {
        ...mockSession,
        score: 0,
        totalQuestions: 10
      };

      const result = calculateStats([zeroSession]);

      expect(result.averagePercentage).toBe(0);
    });

    it('rounds percentage correctly', () => {
      const sessions: StudySession[] = [
        { ...mockSession, score: 1, totalQuestions: 3 },
        { ...mockSession, score: 1, totalQuestions: 3 }
      ];

      const result = calculateStats(sessions);

      // 2/6 = 33.333... should round to 33
      expect(result.averagePercentage).toBe(33);
    });
  });
});
