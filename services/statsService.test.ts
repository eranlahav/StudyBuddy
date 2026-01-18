/**
 * Tests for services/statsService.ts
 *
 * Tests statistics aggregation including:
 * - Family-level statistics
 * - Per-child statistics
 * - Score calculations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { ChildProfile, StudySession, GradeLevel } from '../types';

// Mock Firestore functions
vi.mock('firebase/firestore', async () => {
  const { vi } = await import('vitest');
  return {
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn()
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
import { getFamilyStats, getChildStats } from './statsService';
import { DatabaseError } from '../lib';

// Test data
const now = Date.now();

const mockChildren: ChildProfile[] = [
  {
    id: 'child-1',
    familyId: 'family-1',
    name: 'דני',
    avatar: 'cat',
    grade: 'כיתה ג\'' as GradeLevel,
    stars: 50,
    streak: 5,
    subjects: ['math-1'],
    proficiency: { 'math-1': 'medium' },
    pinHash: '',
    createdAt: now,
    createdBy: 'parent-1'
  },
  {
    id: 'child-2',
    familyId: 'family-1',
    name: 'רונית',
    avatar: 'dog',
    grade: 'כיתה ה\'' as GradeLevel,
    stars: 30,
    streak: 3,
    subjects: ['math-1', 'hebrew-1'],
    proficiency: { 'math-1': 'hard' },
    pinHash: '',
    createdAt: now,
    createdBy: 'parent-1'
  }
];

const mockSessions: StudySession[] = [
  {
    id: 'session-1',
    familyId: 'family-1',
    childId: 'child-1',
    subjectId: 'math-1',
    topic: 'חיבור',
    date: now,
    score: 8,
    totalQuestions: 10,
    questions: [],
    userAnswers: []
  },
  {
    id: 'session-2',
    familyId: 'family-1',
    childId: 'child-1',
    subjectId: 'math-1',
    topic: 'חיסור',
    date: now - 1000,
    score: 7,
    totalQuestions: 10,
    questions: [],
    userAnswers: []
  },
  {
    id: 'session-3',
    familyId: 'family-1',
    childId: 'child-2',
    subjectId: 'hebrew-1',
    topic: 'קריאה',
    date: now - 2000,
    score: 10,
    totalQuestions: 10,
    questions: [],
    userAnswers: []
  }
];

describe('statsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFamilyStats', () => {
    it('returns comprehensive family statistics', async () => {
      // Track which query is being made
      let queryCount = 0;

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockImplementation(async () => {
        queryCount++;
        if (queryCount === 1) {
          // First query: children
          return {
            docs: mockChildren.map(c => ({ data: () => c }))
          } as unknown as QuerySnapshot<DocumentData>;
        } else {
          // Second query: sessions
          return {
            docs: mockSessions.map(s => ({ data: () => s }))
          } as unknown as QuerySnapshot<DocumentData>;
        }
      });

      const result = await getFamilyStats('family-1');

      expect(result.childrenCount).toBe(2);
      expect(result.totalSessions).toBe(3);
      expect(result.avgScore).toBeCloseTo(83.33, 1); // (80 + 70 + 100) / 3
      expect(result.lastActivityDate).toBe(now);
      expect(result.perChildStats).toHaveLength(2);
    });

    it('calculates per-child stats correctly', async () => {
      let queryCount = 0;

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockImplementation(async () => {
        queryCount++;
        if (queryCount === 1) {
          return { docs: mockChildren.map(c => ({ data: () => c })) } as unknown as QuerySnapshot<DocumentData>;
        } else {
          return { docs: mockSessions.map(s => ({ data: () => s })) } as unknown as QuerySnapshot<DocumentData>;
        }
      });

      const result = await getFamilyStats('family-1');

      const child1Stats = result.perChildStats.find(s => s.childId === 'child-1');
      expect(child1Stats).toBeDefined();
      expect(child1Stats!.sessions).toBe(2);
      expect(child1Stats!.avgScore).toBeCloseTo(75, 1); // (80 + 70) / 2
      expect(child1Stats!.stars).toBe(50);
      expect(child1Stats!.streak).toBe(5);

      const child2Stats = result.perChildStats.find(s => s.childId === 'child-2');
      expect(child2Stats).toBeDefined();
      expect(child2Stats!.sessions).toBe(1);
      expect(child2Stats!.avgScore).toBe(100); // 10/10 = 100%
      expect(child2Stats!.stars).toBe(30);
    });

    it('handles family with no sessions', async () => {
      let queryCount = 0;

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockImplementation(async () => {
        queryCount++;
        if (queryCount === 1) {
          return { docs: mockChildren.map(c => ({ data: () => c })) } as unknown as QuerySnapshot<DocumentData>;
        } else {
          return { docs: [] } as unknown as QuerySnapshot<DocumentData>;
        }
      });

      const result = await getFamilyStats('family-1');

      expect(result.childrenCount).toBe(2);
      expect(result.totalSessions).toBe(0);
      expect(result.avgScore).toBe(0);
      expect(result.lastActivityDate).toBeNull();
    });

    it('handles family with no children', async () => {
      let queryCount = 0;

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockImplementation(async () => {
        queryCount++;
        return { docs: [] } as unknown as QuerySnapshot<DocumentData>;
      });

      const result = await getFamilyStats('empty-family');

      expect(result.childrenCount).toBe(0);
      expect(result.totalSessions).toBe(0);
      expect(result.perChildStats).toHaveLength(0);
    });

    it('handles session with zero total questions', async () => {
      let queryCount = 0;
      const sessionWithZeroQuestions: StudySession = {
        ...mockSessions[0],
        score: 0,
        totalQuestions: 0
      };

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockImplementation(async () => {
        queryCount++;
        if (queryCount === 1) {
          return { docs: [{ data: () => mockChildren[0] }] } as unknown as QuerySnapshot<DocumentData>;
        } else {
          return { docs: [{ data: () => sessionWithZeroQuestions }] } as unknown as QuerySnapshot<DocumentData>;
        }
      });

      const result = await getFamilyStats('family-1');

      // Should not crash, treats as 0%
      expect(result.avgScore).toBe(0);
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Query failed'));

      await expect(getFamilyStats('family-1')).rejects.toThrow(DatabaseError);
      await expect(getFamilyStats('family-1')).rejects.toThrow('Failed to get family statistics');
    });
  });

  describe('getChildStats', () => {
    it('returns stats for a specific child', async () => {
      let queryCount = 0;

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockImplementation(async () => {
        queryCount++;
        if (queryCount === 1) {
          // First query: child
          return {
            empty: false,
            docs: [{ data: () => mockChildren[0] }]
          } as unknown as QuerySnapshot<DocumentData>;
        } else {
          // Second query: sessions for child-1
          return {
            docs: mockSessions.filter(s => s.childId === 'child-1').map(s => ({ data: () => s }))
          } as unknown as QuerySnapshot<DocumentData>;
        }
      });

      const result = await getChildStats('child-1');

      expect(result).not.toBeNull();
      expect(result!.childId).toBe('child-1');
      expect(result!.childName).toBe('דני');
      expect(result!.sessions).toBe(2);
      expect(result!.avgScore).toBeCloseTo(75, 1);
      expect(result!.stars).toBe(50);
      expect(result!.streak).toBe(5);
    });

    it('returns null when child not found', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: []
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getChildStats('nonexistent');

      expect(result).toBeNull();
    });

    it('handles child with no sessions', async () => {
      let queryCount = 0;

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockImplementation(async () => {
        queryCount++;
        if (queryCount === 1) {
          return {
            empty: false,
            docs: [{ data: () => mockChildren[0] }]
          } as unknown as QuerySnapshot<DocumentData>;
        } else {
          return { docs: [] } as unknown as QuerySnapshot<DocumentData>;
        }
      });

      const result = await getChildStats('child-1');

      expect(result).not.toBeNull();
      expect(result!.sessions).toBe(0);
      expect(result!.avgScore).toBe(0);
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Query failed'));

      await expect(getChildStats('child-1')).rejects.toThrow(DatabaseError);
      await expect(getChildStats('child-1')).rejects.toThrow('Failed to get child statistics');
    });
  });
});
