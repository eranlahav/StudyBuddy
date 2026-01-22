/**
 * useLearnerProfile Hook
 *
 * Provides access to a child's learner profile with real-time updates.
 * Handles subscription lifecycle, loading states, and error handling.
 *
 * AUTO-BOOTSTRAP: If profile is null but child has existing sessions,
 * automatically triggers bootstrapProfile in background (fire-and-forget).
 *
 * Usage:
 *   const { profile, isLoading, error } = useLearnerProfile(child, sessions);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LearnerProfile, TopicMastery, MasteryLevel, getMasteryLevel, StudySession, ChildProfile } from '../types';
import { subscribeToProfile, getProfile, bootstrapProfile } from '../services';
import { logger } from '../lib';

export interface UseLearnerProfileOptions {
  /** If true, don't bootstrap from sessions (for testing) */
  skipBootstrap?: boolean;
}

export interface UseLearnerProfileReturn {
  /** Current learner profile (null if loading or not found) */
  profile: LearnerProfile | null;

  /** True while initial load is in progress */
  isLoading: boolean;

  /** Error if subscription failed */
  error: Error | null;

  /** Manually refresh profile (rarely needed due to real-time updates) */
  refresh: () => Promise<void>;

  /** Get topics by mastery level */
  getTopicsByMastery: (level: MasteryLevel) => TopicMastery[];

  /** Get profile confidence level based on data quantity */
  getConfidenceLevel: () => 'low' | 'medium' | 'high';
}

/**
 * Hook to access learner profile with real-time updates
 *
 * @param child - ChildProfile object (or undefined if not loaded yet)
 * @param sessions - Child's quiz sessions (used for auto-bootstrap check)
 * @param options - Configuration options
 */
export function useLearnerProfile(
  child: ChildProfile | undefined,
  sessions: StudySession[] = [],
  options: UseLearnerProfileOptions = {}
): UseLearnerProfileReturn {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if we've already attempted bootstrap for this child
  const bootstrapAttemptedRef = useRef<string | null>(null);

  const childId = child?.id;

  // Subscribe to profile changes
  useEffect(() => {
    if (!childId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    logger.debug('useLearnerProfile: Subscribing', { childId });

    const unsubscribe = subscribeToProfile(
      childId,
      (data) => {
        setProfile(data);
        setIsLoading(false);
        logger.debug('useLearnerProfile: Profile received', {
          childId,
          hasProfile: !!data,
          topicsCount: data ? Object.keys(data.topicMastery).length : 0
        });

        // AUTO-BOOTSTRAP: If profile is null AND child has sessions AND we haven't tried yet
        if (
          data === null &&
          sessions.length > 0 &&
          !options.skipBootstrap &&
          bootstrapAttemptedRef.current !== childId &&
          child  // Ensure child object is available
        ) {
          bootstrapAttemptedRef.current = childId;
          logger.info('useLearnerProfile: Auto-bootstrapping profile from existing sessions', {
            childId,
            sessionCount: sessions.length
          });

          // Fire-and-forget bootstrap - subscription will pick up the new profile
          // Pass all 4 required params: childId, familyId, sessions, grade
          bootstrapProfile(child.id, child.familyId, sessions, child.grade).catch(() => {
            // Error already logged in profileService - swallow here
            // Bootstrap failure is non-critical, profile will be built on next quiz
            logger.warn('useLearnerProfile: Auto-bootstrap failed (non-critical)', { childId });
          });
        }
      },
      (err) => {
        setError(err);
        setIsLoading(false);
        logger.error('useLearnerProfile: Subscription error', { childId }, err);
      }
    );

    return () => {
      logger.debug('useLearnerProfile: Unsubscribing', { childId });
      unsubscribe();
    };
  }, [childId, sessions.length, options.skipBootstrap, child]);

  // Reset bootstrap attempt ref when childId changes
  useEffect(() => {
    if (childId !== bootstrapAttemptedRef.current) {
      // Only reset if switching to a different child (not on first mount)
      if (bootstrapAttemptedRef.current !== null) {
        bootstrapAttemptedRef.current = null;
      }
    }
  }, [childId]);

  // Manual refresh (rarely needed)
  const refresh = useCallback(async () => {
    if (!childId) return;

    try {
      setIsLoading(true);
      const freshProfile = await getProfile(childId);
      setProfile(freshProfile);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [childId]);

  // Get topics filtered by mastery level
  const getTopicsByMastery = useCallback((level: MasteryLevel): TopicMastery[] => {
    if (!profile) return [];

    return Object.values(profile.topicMastery).filter(
      topic => getMasteryLevel(topic.pKnown) === level
    );
  }, [profile]);

  // Get confidence level based on data quantity
  const getConfidenceLevel = useCallback((): 'low' | 'medium' | 'high' => {
    if (!profile) return 'low';

    const totalQuestions = profile.totalQuestions;

    if (totalQuestions < 20) {
      return 'low';
    } else if (totalQuestions < 50) {
      return 'medium';
    } else {
      return 'high';
    }
  }, [profile]);

  return {
    profile,
    isLoading,
    error,
    refresh,
    getTopicsByMastery,
    getConfidenceLevel
  };
}

/**
 * Get Hebrew message for confidence level
 */
export function getConfidenceMessage(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'low':
      return 'בונים פרופיל אישי... נצבור עוד מידע ב-2-3 תרגולים';
    case 'medium':
      return 'הפרופיל האישי מתחיל להיות מדויק';
    case 'high':
      return 'פרופיל אישי מפורט ומדויק';
  }
}
