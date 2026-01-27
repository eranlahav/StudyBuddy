/**
 * usePrerequisites Hook
 *
 * Detects topic dependencies using AI and caches results per session.
 * Helps parents understand "fix X first, then Y will make sense" relationships.
 *
 * Features:
 * - Session-level caching to minimize AI API calls
 * - Automatic detection for weak topics (pKnown < 0.5)
 * - Graceful degradation when API unavailable
 *
 * Usage:
 *   const { prerequisites, isLoading, getPrerequisiteFor } = usePrerequisites(profile, subjects, grade);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LearnerProfile, Subject, GradeLevel, TopicMastery, getMasteryLevel } from '../types';
import { detectPrerequisites, PrerequisiteRelationship } from '../services/prerequisiteService';
import { logger } from '../lib';

// Session-level cache (survives re-renders, cleared on page refresh)
const prerequisiteCache = new Map<string, PrerequisiteRelationship[]>();

export interface UsePrerequisitesReturn {
  /** All detected prerequisite relationships */
  prerequisites: PrerequisiteRelationship[];

  /** True while AI detection is in progress */
  isLoading: boolean;

  /** Get prerequisite for a specific topic (or null if none) */
  getPrerequisiteFor: (topic: string) => PrerequisiteRelationship | null;

  /** Map of topic -> prerequisite for quick lookup */
  prerequisiteMap: Map<string, PrerequisiteRelationship>;
}

/**
 * Hook to detect and cache prerequisite relationships
 *
 * @param profile - Learner profile with topic mastery data
 * @param subjects - Available subjects for context
 * @param grade - Child's grade level
 * @param selectedSubjectId - Optional: filter to specific subject
 */
export function usePrerequisites(
  profile: LearnerProfile | null,
  subjects: Subject[],
  grade: GradeLevel,
  selectedSubjectId?: string
): UsePrerequisitesReturn {
  const [prerequisites, setPrerequisites] = useState<PrerequisiteRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track which subjects we've already fetched
  const fetchedSubjectsRef = useRef<Set<string>>(new Set());

  // Detect prerequisites when profile changes
  useEffect(() => {
    if (!profile || Object.keys(profile.topicMastery).length === 0) {
      setPrerequisites([]);
      return;
    }

    const fetchPrerequisites = async () => {
      // Get all topics from profile
      const allTopics = Object.values(profile.topicMastery);

      // Filter by subject if specified
      const filteredTopics = selectedSubjectId
        ? allTopics.filter(t => t.subjectId === selectedSubjectId)
        : allTopics;

      // Identify weak topics (pKnown < 0.5)
      const weakTopics = filteredTopics.filter(t => getMasteryLevel(t.pKnown) === 'weak');

      if (weakTopics.length === 0) {
        setPrerequisites([]);
        return;
      }

      // Group weak topics by subject for targeted API calls
      const topicsBySubject = new Map<string, TopicMastery[]>();
      weakTopics.forEach(topic => {
        const existing = topicsBySubject.get(topic.subjectId) || [];
        existing.push(topic);
        topicsBySubject.set(topic.subjectId, existing);
      });

      const allResults: PrerequisiteRelationship[] = [];
      const subjectsToFetch: string[] = [];

      // Check cache and identify subjects needing API calls
      topicsBySubject.forEach((topics, subjectId) => {
        const cacheKey = `${profile.childId}:${subjectId}`;

        if (prerequisiteCache.has(cacheKey)) {
          // Use cached results
          const cached = prerequisiteCache.get(cacheKey)!;
          allResults.push(...cached);
          logger.debug('usePrerequisites: Using cached results', {
            subjectId,
            cachedCount: cached.length
          });
        } else if (!fetchedSubjectsRef.current.has(cacheKey)) {
          // Need to fetch
          subjectsToFetch.push(subjectId);
        }
      });

      // If all subjects are cached, update state and return
      if (subjectsToFetch.length === 0) {
        setPrerequisites(allResults);
        return;
      }

      // Fetch missing subjects
      setIsLoading(true);

      try {
        for (const subjectId of subjectsToFetch) {
          const cacheKey = `${profile.childId}:${subjectId}`;
          const subjectTopics = topicsBySubject.get(subjectId) || [];
          const subject = subjects.find(s => s.id === subjectId);

          if (!subject) continue;

          // Get all topics for this subject (for context)
          const allSubjectTopics = allTopics.filter(t => t.subjectId === subjectId);

          logger.info('usePrerequisites: Fetching prerequisites', {
            subjectId,
            subjectName: subject.name,
            weakCount: subjectTopics.length,
            totalCount: allSubjectTopics.length
          });

          const results = await detectPrerequisites(
            subjectTopics,
            allSubjectTopics,
            subject.name,
            grade
          );

          // Cache results
          prerequisiteCache.set(cacheKey, results);
          fetchedSubjectsRef.current.add(cacheKey);
          allResults.push(...results);

          logger.info('usePrerequisites: Prerequisites detected', {
            subjectId,
            count: results.length
          });
        }
      } catch (error) {
        logger.warn('usePrerequisites: Failed to detect prerequisites', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with partial results (graceful degradation)
      } finally {
        setIsLoading(false);
      }

      setPrerequisites(allResults);
    };

    fetchPrerequisites();
  }, [profile?.childId, profile?.topicMastery, subjects, grade, selectedSubjectId]);

  // Build lookup map
  const prerequisiteMap = new Map<string, PrerequisiteRelationship>();
  prerequisites.forEach(rel => {
    prerequisiteMap.set(rel.topic, rel);
  });

  // Lookup function
  const getPrerequisiteFor = useCallback((topic: string): PrerequisiteRelationship | null => {
    return prerequisiteMap.get(topic) || null;
  }, [prerequisiteMap]);

  return {
    prerequisites,
    isLoading,
    getPrerequisiteFor,
    prerequisiteMap
  };
}

// Re-export type for convenience
export type { PrerequisiteRelationship };
