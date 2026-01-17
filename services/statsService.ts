/**
 * Stats Service
 *
 * Aggregates statistics for families and children.
 * Used primarily for admin dashboard views.
 */

import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ChildProfile, StudySession } from '../types';
import { logger, DatabaseError } from '../lib';

/**
 * Per-child statistics
 */
export interface ChildStats {
  childId: string;
  childName: string;
  sessions: number;
  avgScore: number;
  streak: number;
  stars: number;
}

/**
 * Family-level aggregated statistics
 */
export interface FamilyStats {
  childrenCount: number;
  totalSessions: number;
  avgScore: number;
  lastActivityDate: number | null;
  perChildStats: ChildStats[];
}

/**
 * Get comprehensive statistics for a family
 */
export async function getFamilyStats(familyId: string): Promise<FamilyStats> {
  try {
    // Fetch children for this family
    const childrenQuery = query(
      collection(db, 'children'),
      where('familyId', '==', familyId)
    );
    const childrenSnapshot = await getDocs(childrenQuery);
    const children = childrenSnapshot.docs.map(doc => doc.data() as ChildProfile);

    // Fetch sessions for this family
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('familyId', '==', familyId)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);
    const sessions = sessionsSnapshot.docs.map(doc => doc.data() as StudySession);

    // Calculate per-child stats
    const perChildStats: ChildStats[] = children.map(child => {
      const childSessions = sessions.filter(s => s.childId === child.id);
      const totalScore = childSessions.reduce((sum, s) => {
        return sum + (s.totalQuestions > 0 ? (s.score / s.totalQuestions) * 100 : 0);
      }, 0);

      return {
        childId: child.id,
        childName: child.name,
        sessions: childSessions.length,
        avgScore: childSessions.length > 0 ? totalScore / childSessions.length : 0,
        streak: child.streak,
        stars: child.stars
      };
    });

    // Calculate family-level aggregates
    const totalSessions = sessions.length;
    const allScores = sessions.map(s =>
      s.totalQuestions > 0 ? (s.score / s.totalQuestions) * 100 : 0
    );
    const avgScore = allScores.length > 0
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
      : 0;

    // Find last activity date
    const lastActivityDate = sessions.length > 0
      ? Math.max(...sessions.map(s => s.date))
      : null;

    const stats: FamilyStats = {
      childrenCount: children.length,
      totalSessions,
      avgScore,
      lastActivityDate,
      perChildStats
    };

    logger.debug('statsService: Calculated family stats', {
      familyId,
      childrenCount: stats.childrenCount,
      totalSessions: stats.totalSessions
    });

    return stats;
  } catch (error) {
    logger.error('statsService: Failed to get family stats', { familyId }, error);
    throw new DatabaseError('Failed to get family statistics', { cause: error as Error });
  }
}

/**
 * Get statistics for a single child
 */
export async function getChildStats(childId: string): Promise<ChildStats | null> {
  try {
    // Fetch child
    const childrenQuery = query(
      collection(db, 'children'),
      where('id', '==', childId)
    );
    const childSnapshot = await getDocs(childrenQuery);

    if (childSnapshot.empty) {
      return null;
    }

    const child = childSnapshot.docs[0].data() as ChildProfile;

    // Fetch sessions
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('childId', '==', childId)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);
    const sessions = sessionsSnapshot.docs.map(doc => doc.data() as StudySession);

    const totalScore = sessions.reduce((sum, s) => {
      return sum + (s.totalQuestions > 0 ? (s.score / s.totalQuestions) * 100 : 0);
    }, 0);

    return {
      childId: child.id,
      childName: child.name,
      sessions: sessions.length,
      avgScore: sessions.length > 0 ? totalScore / sessions.length : 0,
      streak: child.streak,
      stars: child.stars
    };
  } catch (error) {
    logger.error('statsService: Failed to get child stats', { childId }, error);
    throw new DatabaseError('Failed to get child statistics', { cause: error as Error });
  }
}
