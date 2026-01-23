/**
 * useLearnerProfile Hook
 *
 * Provides access to a child's learner profile with real-time updates.
 * Handles subscription lifecycle, loading states, and error handling.
 *
 * AUTO-BOOTSTRAP: If profile is null but child has existing sessions,
 * automatically triggers bootstrapProfile in background (fire-and-forget).
 *
 * REGRESSION DETECTION: Compares current vs previous profile to detect
 * when mastery drops from mastered (>=0.8) to below threshold (0.7).
 * Creates alerts and notifications when regression is detected.
 *
 * Usage:
 *   const { profile, isLoading, error, activeNotification, dismissNotification } = useLearnerProfile(child, sessions, subjects);
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LearnerProfile,
  TopicMastery,
  MasteryLevel,
  getMasteryLevel,
  StudySession,
  ChildProfile,
  RegressionAlert,
  Subject
} from '../types';
import { subscribeToProfile, getProfile, bootstrapProfile, findSubjectById } from '../services';
import { detectRegression, createRegressionAlert, shouldAlertForRegression } from '../services/alertService';
import { applyForgettingCurveToProfile } from '../lib/forgettingCurve';
import { logger } from '../lib';

export interface UseLearnerProfileOptions {
  /** If true, don't bootstrap from sessions (for testing) */
  skipBootstrap?: boolean;
  /** Auto-dismiss notification timeout in ms (default: 8000) */
  notificationTimeout?: number;
}

export interface UseLearnerProfileReturn {
  /** Current learner profile (null if loading or not found) */
  profile: LearnerProfile | null;

  /** Profile with forgetting curve decay applied (for display/recommendations) */
  decayedProfile: LearnerProfile | null;

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

  /** All regression alerts (for history/analytics) */
  alerts: RegressionAlert[];

  /** Currently active notification to display (auto-dismisses after timeout) */
  activeNotification: RegressionAlert | null;

  /** Dismiss a specific alert by ID */
  dismissAlert: (alertId: string) => void;

  /** Dismiss the active notification */
  dismissNotification: () => void;
}

/** Track last alert times per topic for cooldown */
type AlertCooldownMap = Record<string, number>;

/**
 * Hook to access learner profile with real-time updates
 *
 * @param child - ChildProfile object (or undefined if not loaded yet)
 * @param sessions - Child's quiz sessions (used for auto-bootstrap check)
 * @param subjects - Available subjects (used for alert messages)
 * @param options - Configuration options
 */
export function useLearnerProfile(
  child: ChildProfile | undefined,
  sessions: StudySession[] = [],
  subjects: Subject[] = [],
  options: UseLearnerProfileOptions = {}
): UseLearnerProfileReturn {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Regression alerts state
  const [alerts, setAlerts] = useState<RegressionAlert[]>([]);
  const [activeNotification, setActiveNotification] = useState<RegressionAlert | null>(null);

  // Track previous profile for regression comparison
  const prevProfileRef = useRef<LearnerProfile | null>(null);

  // Track last alert time per topic for cooldown
  const alertCooldownRef = useRef<AlertCooldownMap>({});

  // Track if we've already attempted bootstrap for this child
  const bootstrapAttemptedRef = useRef<string | null>(null);

  const childId = child?.id;
  const notificationTimeout = options.notificationTimeout ?? 8000;

  // Compute decayed profile for display/recommendations
  const decayedProfile = useMemo(() => {
    if (!profile) return null;
    return applyForgettingCurveToProfile(profile);
  }, [profile]);

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
        // REGRESSION DETECTION: Compare current vs previous profile
        if (data && prevProfileRef.current && child) {
          const newAlerts: RegressionAlert[] = [];

          for (const [topicKey, currentMastery] of Object.entries(data.topicMastery)) {
            const previousMastery = prevProfileRef.current.topicMastery[topicKey];

            // Check if regression detected
            if (detectRegression(currentMastery, previousMastery)) {
              // Check cooldown
              const lastAlerted = alertCooldownRef.current[topicKey];
              if (shouldAlertForRegression(currentMastery, lastAlerted)) {
                // Get subject name for display
                const subject = findSubjectById(subjects, currentMastery.subjectId);
                const subjectName = subject?.name ?? 'נושא';

                // Create alert
                const alert = createRegressionAlert(
                  child,
                  currentMastery,
                  subjectName,
                  previousMastery!.pKnown
                );

                newAlerts.push(alert);
                alertCooldownRef.current[topicKey] = Date.now();

                logger.info('useLearnerProfile: Regression detected', {
                  childId,
                  topic: currentMastery.topic,
                  previousPKnown: previousMastery!.pKnown,
                  currentPKnown: currentMastery.pKnown
                });
              }
            }
          }

          // Add new alerts and show first one as notification
          if (newAlerts.length > 0) {
            setAlerts(prev => [...prev, ...newAlerts]);
            // Only set notification if there isn't one already active
            setActiveNotification(prev => prev ?? newAlerts[0]);
          }
        }

        // Store current profile for next comparison
        prevProfileRef.current = data;

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
  }, [childId, sessions.length, options.skipBootstrap, child, subjects, notificationTimeout]);

  // Auto-dismiss notification after timeout
  useEffect(() => {
    if (!activeNotification) return;

    const timer = setTimeout(() => {
      setActiveNotification(null);
      logger.debug('useLearnerProfile: Notification auto-dismissed', {
        alertId: activeNotification.id
      });
    }, notificationTimeout);

    return () => clearTimeout(timer);
  }, [activeNotification, notificationTimeout]);

  // Reset bootstrap attempt ref when childId changes
  useEffect(() => {
    if (childId !== bootstrapAttemptedRef.current) {
      // Only reset if switching to a different child (not on first mount)
      if (bootstrapAttemptedRef.current !== null) {
        bootstrapAttemptedRef.current = null;
      }
    }
  }, [childId]);

  // Reset alerts when child changes
  useEffect(() => {
    setAlerts([]);
    setActiveNotification(null);
    alertCooldownRef.current = {};
    prevProfileRef.current = null;
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

  // Dismiss a specific alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, dismissed: true } : a
    ));
    // If this was the active notification, clear it
    if (activeNotification?.id === alertId) {
      setActiveNotification(null);
    }
    logger.debug('useLearnerProfile: Alert dismissed', { alertId });
  }, [activeNotification]);

  // Dismiss the active notification
  const dismissNotification = useCallback(() => {
    if (activeNotification) {
      logger.debug('useLearnerProfile: Notification dismissed', {
        alertId: activeNotification.id
      });
      setActiveNotification(null);
    }
  }, [activeNotification]);

  return {
    profile,
    decayedProfile,
    isLoading,
    error,
    refresh,
    getTopicsByMastery,
    getConfidenceLevel,
    alerts,
    activeNotification,
    dismissAlert,
    dismissNotification
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
