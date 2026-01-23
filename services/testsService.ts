/**
 * Tests Service
 *
 * Handles all Firestore operations for upcoming tests.
 * Provides typed CRUD operations with error handling.
 * Supports multi-tenant filtering via familyId.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UpcomingTest } from '../types';
import { logger, DatabaseError } from '../lib';
import { isTestKid } from '../constants/testKids';

/**
 * Check if a test ID belongs to a mock test
 */
function isTestMockTest(testId: string): boolean {
  return testId.startsWith('test-upcoming-');
}

const COLLECTION = 'upcomingTests';

/**
 * Subscribe to upcoming tests collection changes
 * @param familyId - Optional family ID to filter tests by tenant
 */
export function subscribeToTests(
  onData: (tests: UpcomingTest[]) => void,
  onError?: (error: Error) => void,
  familyId?: string
): Unsubscribe {
  // Use query with familyId filter if provided
  const q = familyId
    ? query(collection(db, COLLECTION), where('familyId', '==', familyId))
    : collection(db, COLLECTION);

  return onSnapshot(
    q,
    (snapshot) => {
      const tests = snapshot.docs.map(doc => doc.data() as UpcomingTest);
      onData(tests);
    },
    (error) => {
      logger.error('testsService: Subscription error', { familyId }, error);
      onError?.(new DatabaseError('Failed to subscribe to tests', { cause: error }));
    }
  );
}

/**
 * Add a new upcoming test
 * Silently skips for test kids (mock tests are read-only)
 */
export async function addTest(test: UpcomingTest): Promise<void> {
  // Silently skip for test kids
  if (isTestKid(test.childId)) {
    logger.debug('testsService: Skipping add for test kid', { childId: test.childId });
    return;
  }

  try {
    await setDoc(doc(db, COLLECTION, test.id), test);
    logger.info('testsService: Test added', {
      testId: test.id,
      childId: test.childId,
      type: test.type || 'quiz',
      topics: test.topics.join(', ')
    });
  } catch (error) {
    logger.error('testsService: Failed to add test', { testId: test.id }, error);
    throw new DatabaseError('Failed to add test', { cause: error as Error });
  }
}

/**
 * Update an existing test
 * Throws error for mock tests (read-only)
 */
export async function updateTest(
  id: string,
  updates: Partial<UpcomingTest>
): Promise<void> {
  // Prevent modifying mock tests
  if (isTestMockTest(id)) {
    throw new Error('לא ניתן לערוך מבחני בדיקה');
  }

  try {
    await updateDoc(doc(db, COLLECTION, id), updates);
    logger.debug('testsService: Test updated', { testId: id, fields: Object.keys(updates) });
  } catch (error) {
    logger.error('testsService: Failed to update test', { testId: id }, error);
    throw new DatabaseError('Failed to update test', { cause: error as Error });
  }
}

/**
 * Delete a test
 * Throws error for mock tests (read-only)
 */
export async function deleteTest(id: string): Promise<void> {
  // Prevent deleting mock tests
  if (isTestMockTest(id)) {
    throw new Error('לא ניתן למחוק מבחני בדיקה');
  }

  try {
    await deleteDoc(doc(db, COLLECTION, id));
    logger.info('testsService: Test deleted', { testId: id });
  } catch (error) {
    logger.error('testsService: Failed to delete test', { testId: id }, error);
    throw new DatabaseError('Failed to delete test', { cause: error as Error });
  }
}

/**
 * Get tests for a specific child
 */
export function filterTestsByChild(
  tests: UpcomingTest[],
  childId: string
): UpcomingTest[] {
  return tests.filter(t => t.childId === childId);
}

/**
 * Get tests for a specific subject
 */
export function filterTestsBySubject(
  tests: UpcomingTest[],
  subjectId: string
): UpcomingTest[] {
  return tests.filter(t => t.subjectId === subjectId);
}

/**
 * Get tests within a date range
 */
export function filterTestsByDateRange(
  tests: UpcomingTest[],
  startDate: number,
  endDate: number
): UpcomingTest[] {
  return tests.filter(t => t.date >= startDate && t.date <= endDate);
}

/**
 * Get upcoming tests (from now onwards), sorted by date
 */
export function getUpcomingTests(tests: UpcomingTest[]): UpcomingTest[] {
  const now = Date.now();
  return tests
    .filter(t => t.date >= now)
    .sort((a, b) => a.date - b.date);
}

/**
 * Get the next test for a specific child
 */
export function getNextTest(
  tests: UpcomingTest[],
  childId: string
): UpcomingTest | undefined {
  const childTests = filterTestsByChild(tests, childId);
  const upcoming = getUpcomingTests(childTests);
  return upcoming[0];
}
