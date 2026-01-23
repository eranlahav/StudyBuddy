/**
 * Adaptive Quiz Service
 *
 * Provides difficulty mixing and topic selection based on learner profiles.
 * Uses mastery thresholds from Phase 1 BKT implementation.
 *
 * Key algorithms:
 * - classifyTopics: Group topics by weak/learning/mastered
 * - mixDifficulty: Apply 20/50/30 ratio for review/target/weak
 * - orderTopics: Arrange questions easy-to-hard
 */

import { LearnerProfile, TopicClassification, DifficultyMix } from '../types';
import { shuffle } from '../lib';
import { daysSince } from '../lib/signalWeights';
import { needsProbeQuestion } from './probeScheduler';

// Mastery thresholds (from Phase 1)
const WEAK_THRESHOLD = 0.5;
const MASTERED_THRESHOLD = 0.8;

// Default difficulty ratios (from Phase 2 research)
const REVIEW_RATIO = 0.2;   // 20% mastered topics
const TARGET_RATIO = 0.5;   // 50% learning topics
const WEAK_RATIO = 0.3;     // 30% weak topics
const WEAK_RATIO_FRUSTRATED = 0.1;  // Reduced weak % when frustrated

/**
 * Review mode configuration constants
 * Triggers after extended absence to ease child back into learning
 */
export const REVIEW_MODE_CONFIG = {
  /** Trigger review mode after this many days gap */
  GAP_THRESHOLD_DAYS: 21,  // 3 weeks
  /** Percentage of questions that should be review */
  REVIEW_PERCENTAGE: 0.30,  // 30%
  /** Minimum pKnown to be eligible for review */
  MIN_REVIEW_PKNOWN: 0.65
} as const;

/**
 * Classify topics based on BKT mastery levels
 *
 * Thresholds from Phase 1:
 * - Weak: < 0.5 (less than 50% probability of knowing)
 * - Learning: 0.5-0.8 (progressing but not mastered)
 * - Mastered: >= 0.8 (high confidence)
 *
 * @param profile - Child's learner profile (or null for new users)
 * @param availableTopics - Topics available for the quiz
 */
export function classifyTopics(
  profile: LearnerProfile | null,
  availableTopics: string[]
): TopicClassification {
  const weak: string[] = [];
  const learning: string[] = [];
  const mastered: string[] = [];

  for (const topic of availableTopics) {
    // New topics or no profile default to neutral (0.5 = learning)
    const mastery = profile?.topicMastery[topic];
    const pKnown = mastery?.pKnown ?? 0.5;

    if (pKnown < WEAK_THRESHOLD) {
      weak.push(topic);
    } else if (pKnown < MASTERED_THRESHOLD) {
      learning.push(topic);
    } else {
      mastered.push(topic);
    }
  }

  return { weak, learning, mastered };
}

/**
 * Apply 20/50/30 difficulty mixing strategy
 *
 * Strategy from Phase 2 context:
 * - 20% review (mastered topics) - Spaced retrieval, prevents forgetting
 * - 50% target (current level) - Zone of proximal development
 * - 30% weak topics (capped if frustrated) - Remediation
 *
 * If insufficient topics in a category, the quiz will be shorter.
 * This prevents forcing artificial difficulty.
 *
 * @param classification - Topics grouped by mastery level
 * @param totalQuestions - Desired number of questions
 * @param allowDifficultQuestions - False if frustration detected (caps weak %)
 */
export function mixDifficulty(
  classification: TopicClassification,
  totalQuestions: number,
  allowDifficultQuestions: boolean = true
): DifficultyMix {
  const { weak, learning, mastered } = classification;

  // Calculate target counts based on ratios
  const weakRatio = allowDifficultQuestions ? WEAK_RATIO : WEAK_RATIO_FRUSTRATED;
  let reviewCount = Math.round(totalQuestions * REVIEW_RATIO);
  let targetCount = Math.round(totalQuestions * TARGET_RATIO);
  let weakCount = Math.round(totalQuestions * weakRatio);

  // Adjust if total != sum due to rounding
  const sum = reviewCount + targetCount + weakCount;
  if (sum !== totalQuestions) {
    targetCount += (totalQuestions - sum);
  }

  // Sample topics (may get fewer than requested if topics exhausted)
  const reviewTopics = sampleTopics(mastered, reviewCount);
  const weakTopics = sampleTopics(weak, weakCount);

  // Allocate remaining questions to target (learning) topics
  const remaining = totalQuestions - reviewTopics.length - weakTopics.length;
  const targetTopics = sampleTopics(learning, remaining);

  // Final count may be less than requested
  const finalCount = reviewTopics.length + targetTopics.length + weakTopics.length;

  return {
    reviewTopics,
    targetTopics,
    weakTopics,
    questionCount: finalCount
  };
}

/**
 * Sample topics randomly without replacement
 * Uses Fisher-Yates shuffle for uniform distribution
 */
function sampleTopics(topics: string[], count: number): string[] {
  if (topics.length === 0) return [];
  if (count >= topics.length) return [...topics];

  const shuffled = shuffle([...topics]);
  return shuffled.slice(0, count);
}

/**
 * Order topics for progressive difficulty
 *
 * Strategy: Start easy (mastered) -> build confidence -> end with challenges
 * This ordering supports the pedagogical principle of warming up
 * before tackling difficult material.
 */
export function orderTopics(mix: DifficultyMix): string[] {
  return [
    ...mix.reviewTopics,    // Easy first (confidence boost)
    ...mix.targetTopics,    // Main learning in middle
    ...mix.weakTopics       // Challenges at end (when warmed up)
  ];
}

/**
 * Get all topics from a difficulty mix as an ordered array
 * Convenience function for quiz setup
 */
export function getOrderedTopics(mix: DifficultyMix): string[] {
  return orderTopics(mix);
}

/**
 * Check if profile has sufficient data for adaptive quiz
 * Returns true if at least 3 topics have been practiced
 */
export function hasProfileData(profile: LearnerProfile | null): boolean {
  if (!profile) return false;
  return Object.keys(profile.topicMastery).length >= 3;
}

/**
 * Check if quiz should enter review mode (child returning after gap)
 *
 * Review mode triggers after 3+ weeks of inactivity to ease the child
 * back into learning with familiar content before challenging material.
 *
 * @param lastSessionTimestamp - Timestamp of last session (milliseconds)
 * @returns True if review mode should be activated
 */
export function shouldEnterReviewMode(lastSessionTimestamp: number): boolean {
  const daysSinceLastSession = daysSince(lastSessionTimestamp);
  return daysSinceLastSession >= REVIEW_MODE_CONFIG.GAP_THRESHOLD_DAYS;
}

/**
 * Select topics for review mode (returning after gap)
 *
 * Selects topics that:
 * - Belong to the same subject
 * - Have pKnown >= 0.65 (previously learned)
 * - Haven't been practiced in 21+ days
 *
 * Returns oldest topics first (most in need of refresh).
 *
 * @param profile - Child's learner profile
 * @param currentSubjectId - Current subject being studied
 * @returns Up to 3 topics for review
 */
export function selectReviewTopics(
  profile: LearnerProfile | null,
  currentSubjectId: string
): string[] {
  if (!profile) return [];

  const now = Date.now();
  const gapThresholdMs = REVIEW_MODE_CONFIG.GAP_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  // Filter topics: same subject, learned (pKnown >= 0.65), stale (21+ days old)
  const eligibleTopics = Object.values(profile.topicMastery)
    .filter(mastery =>
      mastery.subjectId === currentSubjectId &&
      mastery.pKnown >= REVIEW_MODE_CONFIG.MIN_REVIEW_PKNOWN &&
      mastery.lastAttempt && (now - mastery.lastAttempt) >= gapThresholdMs
    )
    // Sort by lastAttempt ascending (oldest first, most need refresh)
    .sort((a, b) => (a.lastAttempt || 0) - (b.lastAttempt || 0));

  // Return top 3 topic names
  return eligibleTopics.slice(0, 3).map(m => m.topic);
}

/**
 * Select mastered topics due for probe verification
 *
 * Probes verify that mastered content is still retained.
 * Uses SM-2 based scheduling from probeScheduler.
 *
 * @param profile - Child's learner profile
 * @param subjectId - Current subject being studied
 * @returns Up to 2 topics due for probing
 */
export function selectProbeTopics(
  profile: LearnerProfile | null,
  subjectId: string
): string[] {
  if (!profile) return [];

  // Filter topics: same subject, needs probe
  const dueTopics = Object.values(profile.topicMastery)
    .filter(mastery =>
      mastery.subjectId === subjectId &&
      needsProbeQuestion(mastery)
    )
    // Sort by nextProbeDate ascending (most overdue first)
    .sort((a, b) => (a.nextProbeDate || 0) - (b.nextProbeDate || 0));

  // Return max 2 probe topics per quiz
  return dueTopics.slice(0, 2).map(m => m.topic);
}
