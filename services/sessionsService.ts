/**
 * Sessions Service
 *
 * Handles all Firestore operations for study sessions.
 * Provides typed CRUD operations with error handling.
 * Supports multi-tenant filtering via familyId.
 */

import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { StudySession } from '../types';
import { logger, DatabaseError } from '../lib';
import { isTestKid } from '../constants/testKids';
import { addTestSession } from './testKidsStorage';

const COLLECTION = 'sessions';

/**
 * Subscribe to sessions collection changes
 * @param familyId - Optional family ID to filter sessions by tenant
 */
export function subscribeToSessions(
  onData: (sessions: StudySession[]) => void,
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
      const sessions = snapshot.docs.map(doc => doc.data() as StudySession);
      // Sort by date, newest first
      sessions.sort((a, b) => b.date - a.date);
      onData(sessions);
    },
    (error) => {
      logger.error('sessionsService: Subscription error', { familyId }, error);
      onError?.(new DatabaseError('Failed to subscribe to sessions', { cause: error }));
    }
  );
}

/**
 * Add a new study session
 * Writes to localStorage for test kids (persistent test data)
 */
export async function addSession(session: StudySession): Promise<void> {
  // Write to localStorage for test kids
  if (isTestKid(session.childId)) {
    logger.debug('sessionsService: Writing to localStorage for test kid', {
      childId: session.childId,
      score: `${session.score}/${session.totalQuestions}`
    });
    addTestSession(session);
    return;
  }

  try {
    await setDoc(doc(db, COLLECTION, session.id), session);
    logger.info('sessionsService: Session added', {
      sessionId: session.id,
      childId: session.childId,
      subject: session.subjectId,
      topic: session.topic,
      score: `${session.score}/${session.totalQuestions}`
    });
  } catch (error) {
    logger.error('sessionsService: Failed to add session', { sessionId: session.id }, error);
    throw new DatabaseError('Failed to add session', { cause: error as Error });
  }
}

/**
 * Get sessions for a specific child
 * Note: This filters in memory since Firestore queries require indexes
 */
export function filterSessionsByChild(
  sessions: StudySession[],
  childId: string
): StudySession[] {
  return sessions.filter(s => s.childId === childId);
}

/**
 * Get sessions for a specific subject
 */
export function filterSessionsBySubject(
  sessions: StudySession[],
  subjectId: string
): StudySession[] {
  return sessions.filter(s => s.subjectId === subjectId);
}

/**
 * Calculate score statistics for a set of sessions
 */
export function calculateStats(sessions: StudySession[]): {
  totalCorrect: number;
  totalQuestions: number;
  averagePercentage: number;
  sessionCount: number;
} {
  if (sessions.length === 0) {
    return {
      totalCorrect: 0,
      totalQuestions: 0,
      averagePercentage: 0,
      sessionCount: 0
    };
  }

  const totalCorrect = sessions.reduce((sum, s) => sum + s.score, 0);
  const totalQuestions = sessions.reduce((sum, s) => sum + s.totalQuestions, 0);
  const averagePercentage = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;

  return {
    totalCorrect,
    totalQuestions,
    averagePercentage,
    sessionCount: sessions.length
  };
}
