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
import { logger, DatabaseError, applyForgettingCurveToProfile } from '../lib';
import { isTestKid } from '../constants/testKids';
import { getTestProfile, updateTestProfile } from './testKidsStorage';

/**
 * Get learner profile for a child
 * Returns null if profile doesn't exist yet (lazy initialization)
 * Returns profile from localStorage for test kids (no Firestore access)
 */
export async function getProfile(childId: string): Promise<LearnerProfile | null> {
  // Return profile from localStorage for test kids
  if (isTestKid(childId)) {
    logger.debug('profileService: Getting profile from localStorage for test kid', { childId });
    return getTestProfile(childId);
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
 * Writes to localStorage for test kids (persistent test data)
 */
export async function updateProfile(
  childId: string,
  profile: LearnerProfile
): Promise<void> {
  // Write to localStorage for test kids
  if (isTestKid(childId)) {
    logger.debug('profileService: Writing to localStorage for test kid', { childId });
    updateTestProfile(childId, profile);
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
 * For test kids, returns localStorage data immediately (no Firestore subscription)
 */
export function subscribeToProfile(
  childId: string,
  onData: (profile: LearnerProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // For test kids, return localStorage data immediately with no-op unsubscribe
  if (isTestKid(childId)) {
    const profile = getTestProfile(childId);
    logger.debug('profileService: Returning localStorage subscription for test kid', { childId });
    onData(profile);
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

/**
 * Get learner profile with forgetting curve decay applied
 *
 * Wrapper around getProfile that automatically applies time-based
 * mastery decay to all topics. Use this for:
 * - Recommendation scoring (shows current effective mastery)
 * - Dashboard display (reflects knowledge decay over time)
 *
 * Do NOT use for profile updates - decay is read-only visualization.
 *
 * @param childId - Child ID to get profile for
 * @returns Profile with decayed pKnown values, or null if no profile
 *
 * @example
 * const decayedProfile = await getProfileWithDecay(childId);
 * // decayedProfile.topicMastery shows time-adjusted mastery levels
 */
export async function getProfileWithDecay(childId: string): Promise<LearnerProfile | null> {
  const profile = await getProfile(childId);

  if (!profile) {
    return null;
  }

  return applyForgettingCurveToProfile(profile);
}
