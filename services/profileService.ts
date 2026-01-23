/**
 * Profile Service
 *
 * Handles all Firestore operations for learner profiles.
 * Profiles are stored as subcollections under children documents:
 * /children/{childId}/learnerProfile/main
 *
 * This isolation prevents profile data from bloating children queries
 * and allows independent real-time subscriptions.
 */

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { LearnerProfile } from '../types';
import { logger, DatabaseError } from '../lib';
import { TEST_LEARNER_PROFILES, isTestKid } from '../constants/testKids';

/**
 * Get learner profile for a child
 * Returns null if profile doesn't exist yet (lazy initialization)
 * Returns mock profile for test kids (no Firestore access)
 */
export async function getProfile(childId: string): Promise<LearnerProfile | null> {
  // Return mock profile for test kids
  if (isTestKid(childId)) {
    logger.debug('profileService: Returning mock profile for test kid', { childId });
    return TEST_LEARNER_PROFILES[childId] || null;
  }

  try {
    const profileRef = doc(db, 'children', childId, 'learnerProfile', 'main');
    const snapshot = await getDoc(profileRef);

    if (!snapshot.exists()) {
      logger.debug('profileService: No profile found', { childId });
      return null;
    }

    return snapshot.data() as LearnerProfile;
  } catch (error) {
    logger.error('profileService: Failed to get profile', { childId }, error);
    throw new DatabaseError('Failed to get profile', { cause: error as Error });
  }
}

/**
 * Update or create learner profile
 * Uses merge:true to support partial updates
 * Silently skips updates for test kids (read-only mock data)
 */
export async function updateProfile(
  childId: string,
  profile: LearnerProfile
): Promise<void> {
  // Silently skip updates for test kids (mock data is read-only)
  if (isTestKid(childId)) {
    logger.debug('profileService: Skipping update for test kid', { childId });
    return;
  }

  try {
    const profileRef = doc(db, 'children', childId, 'learnerProfile', 'main');

    await setDoc(profileRef, {
      ...profile,
      lastUpdated: Date.now()
    }, { merge: true });

    logger.debug('profileService: Profile updated', {
      childId,
      topicsCount: Object.keys(profile.topicMastery).length,
      totalQuizzes: profile.totalQuizzes
    });
  } catch (error) {
    logger.error('profileService: Failed to update profile', { childId }, error);
    throw new DatabaseError('Failed to update profile', { cause: error as Error });
  }
}

/**
 * Subscribe to profile changes
 * Real-time updates for dashboard display
 * For test kids, returns mock data immediately (no Firestore subscription)
 */
export function subscribeToProfile(
  childId: string,
  onData: (profile: LearnerProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // For test kids, return mock data immediately with no-op unsubscribe
  if (isTestKid(childId)) {
    const mockProfile = TEST_LEARNER_PROFILES[childId] || null;
    logger.debug('profileService: Returning mock subscription for test kid', { childId });
    onData(mockProfile);
    return () => {}; // No-op unsubscribe
  }

  const profileRef = doc(db, 'children', childId, 'learnerProfile', 'main');

  return onSnapshot(
    profileRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
      } else {
        onData(snapshot.data() as LearnerProfile);
      }
    },
    (error) => {
      logger.error('profileService: Subscription error', { childId }, error);
      onError?.(new DatabaseError('Failed to subscribe to profile', { cause: error }));
    }
  );
}

/**
 * Initialize empty profile for a child
 * Called when first quiz is completed
 */
export function initializeProfile(childId: string, familyId: string): LearnerProfile {
  return {
    childId,
    familyId,
    topicMastery: {},
    totalQuizzes: 0,
    totalQuestions: 0,
    lastUpdated: Date.now(),
    version: 1
  };
}
