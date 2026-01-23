/**
 * useRecommendations Hook
 *
 * Generates prioritized topic recommendations by combining:
 * - Learner profile mastery data (30% weight)
 * - Upcoming test urgency (40% weight)
 * - Parent learning goals (30% weight)
 *
 * Returns 3-5 balanced recommendations with override capability.
 *
 * Usage:
 *   const { recommendations, handleOverride, isLoading } = useRecommendations(child, subject, goals);
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Recommendation,
  ChildProfile,
  Subject,
  LearningGoal,
  OverrideReason,
  UpcomingTest
} from '../types';
import { useLearnerProfile } from './useLearnerProfile';
import { useStore } from '../store';
import {
  scoreTopic,
  generateRecommendations,
  recordOverride
} from '../services/recommendationService';
import { logger } from '../lib';

export interface UseRecommendationsReturn {
  /** 3-5 prioritized recommendations (filtered by overrides) */
  recommendations: Recommendation[];

  /** True while profile is loading */
  isLoading: boolean;

  /** Error if calculation failed */
  error: Error | null;

  /** Remove topic from recommendations and log to Firestore */
  handleOverride: (topic: string, reason: OverrideReason, customReason?: string) => Promise<void>;

  /** Clear all overrides and regenerate fresh recommendations */
  refresh: () => void;
}

/**
 * Hook to generate prioritized topic recommendations
 *
 * @param child - ChildProfile object (or undefined if not loaded)
 * @param subject - Subject to generate recommendations for (or undefined)
 * @param goals - Parent-defined learning goals for this child/subject
 */
export function useRecommendations(
  child: ChildProfile | undefined,
  subject: Subject | undefined,
  goals: LearningGoal[] = []
): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [error, setError] = useState<Error | null>(null);

  // Get learner profile with auto-bootstrap
  const { profile, isLoading: profileLoading } = useLearnerProfile(child, []);

  // Get store data (upcomingTests, parent)
  const { upcomingTests, parent } = useStore();

  // Calculate recommendations
  useEffect(() => {
    // Guard: require child and subject
    if (!child || !subject) {
      setRecommendations([]);
      setError(null);
      return;
    }

    try {
      logger.debug('useRecommendations: Calculating', {
        childId: child.id,
        subjectId: subject.id,
        hasProfile: !!profile,
        topicsCount: subject.topics.length,
        testsCount: upcomingTests.length,
        goalsCount: goals.length,
        overridesCount: overrides.size
      });

      // If no profile yet, return empty (will update once profile loads)
      if (!profile) {
        setRecommendations([]);
        setError(null);
        return;
      }

      // Filter upcoming tests for this child + subject
      const relevantTests = upcomingTests.filter(
        test => test.childId === child.id && test.subjectId === subject.id
      );

      // Score all topics in the subject
      const scoredTopics = subject.topics.map(topic =>
        scoreTopic(topic, profile, relevantTests, goals)
      );

      logger.debug('useRecommendations: Topics scored', {
        childId: child.id,
        subjectId: subject.id,
        scoredCount: scoredTopics.length,
        avgScore: Math.round(
          scoredTopics.reduce((sum, t) => sum + t.score, 0) / scoredTopics.length
        )
      });

      // Generate recommendations (5 recommendations)
      const generated = generateRecommendations(scoredTopics, 5);

      // Filter out overridden topics
      const filtered = generated.filter(rec => !overrides.has(rec.topic));

      setRecommendations(filtered);
      setError(null);

      logger.info('useRecommendations: Recommendations generated', {
        childId: child.id,
        subjectId: subject.id,
        totalGenerated: generated.length,
        afterFiltering: filtered.length,
        urgent: filtered.filter(r => r.priority === 'urgent').length,
        important: filtered.filter(r => r.priority === 'important').length,
        review: filtered.filter(r => r.priority === 'review').length
      });

    } catch (err) {
      logger.error('useRecommendations: Calculation failed', {
        childId: child?.id,
        subjectId: subject?.id
      }, err);
      setError(err as Error);
      setRecommendations([]);
    }
  }, [child?.id, subject?.id, profile, upcomingTests, goals, overrides]);

  // Handle parent override
  const handleOverride = useCallback(async (
    topic: string,
    reason: OverrideReason,
    customReason?: string
  ) => {
    // Optimistic update: remove topic immediately
    setOverrides(prev => new Set([...prev, topic]));

    logger.info('useRecommendations: Override requested', {
      childId: child?.id,
      topic,
      reason,
      customReason
    });

    // Fire-and-forget: record override in Firestore
    // Don't await - override tracking is non-critical analytics
    if (child && parent) {
      recordOverride(
        child.id,
        child.familyId,
        parent.id,
        topic,
        reason,
        customReason
      ).catch(err => {
        // Error already logged in recommendationService
        // Swallow here - override tracking failure shouldn't disrupt UI
        logger.warn('useRecommendations: Override recording failed (non-blocking)', {
          childId: child.id,
          topic
        });
      });
    }
  }, [child, parent]);

  // Refresh: clear overrides
  const refresh = useCallback(() => {
    logger.info('useRecommendations: Refreshing (clearing overrides)', {
      childId: child?.id,
      subjectId: subject?.id,
      previousOverrides: overrides.size
    });
    setOverrides(new Set());
  }, [child?.id, subject?.id, overrides.size]);

  return {
    recommendations,
    isLoading: profileLoading,
    error,
    handleOverride,
    refresh
  };
}
