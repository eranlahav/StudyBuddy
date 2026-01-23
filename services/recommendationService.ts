/**
 * Recommendation Engine Service
 *
 * Multi-factor scoring algorithm for topic recommendations:
 * - Mastery score (30%): Lower mastery = higher priority
 * - Urgency score (40%): Upcoming tests boost priority
 * - Goal score (30%): Parent-defined goals boost priority
 *
 * Balanced recommendation strategy:
 * - 30% weakness topics (pKnown < 0.5)
 * - 40% growth topics (pKnown 0.5-0.8)
 * - 30% maintenance topics (pKnown >= 0.8)
 */

import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { logger } from '../lib/logger';
import { generateId } from '../lib/utils';
import type {
  LearnerProfile,
  TopicMastery,
  UpcomingTest,
  LearningGoal,
  TopicScore,
  Recommendation,
  OverrideReason,
  RecommendationOverride,
  ScoringWeights
} from '../types';
import { DEFAULT_SCORING_WEIGHTS } from '../types';

/**
 * Calculate mastery score (0-100)
 * Lower mastery = higher score (inverted)
 */
export function calculateMasteryScore(topicMastery: TopicMastery | undefined): number {
  if (!topicMastery || topicMastery.pKnown === undefined) {
    return 50; // Neutral score for new topics
  }

  const pKnown = topicMastery.pKnown;

  // Cap very weak topics to avoid overwhelming
  if (pKnown < 0.3) {
    return 95;
  }

  // Mastered topics still need maintenance
  if (pKnown >= 0.8) {
    return 20;
  }

  // Invert: low mastery → high score
  return Math.round((1 - pKnown) * 100);
}

/**
 * Calculate urgency score (0-100) based on upcoming test proximity
 */
export function calculateUrgencyScore(
  topic: string,
  upcomingTests: UpcomingTest[]
): number {
  // Filter tests that include this topic
  const relevantTests = upcomingTests.filter((test) =>
    test.topics.includes(topic)
  );

  if (relevantTests.length === 0) {
    return 0; // No urgency
  }

  // Find nearest test
  const now = Date.now();
  const nearestTest = relevantTests.reduce((nearest, test) => {
    return test.date < nearest.date ? test : nearest;
  });

  const daysUntil = Math.ceil((nearestTest.date - now) / (1000 * 60 * 60 * 24));

  // More than 30 days away = no urgency
  if (daysUntil >= 30) {
    return 0;
  }

  // Linear scaling: 30 days = 0, 0 days = 100
  return Math.round(100 * (1 - daysUntil / 30));
}

/**
 * Calculate goal score (0-100) based on parent learning goals
 */
export function calculateGoalScore(
  topic: string,
  learningGoals: LearningGoal[]
): number {
  if (learningGoals.length === 0) {
    return 0; // No goals defined
  }

  let maxScore = 0;

  for (const goal of learningGoals) {
    let score = 0;

    // Exact match (case-insensitive)
    if (goal.topic.toLowerCase() === topic.toLowerCase()) {
      score = 100;
    }
    // Partial match (substring)
    else if (
      goal.topic.toLowerCase().includes(topic.toLowerCase()) ||
      topic.toLowerCase().includes(goal.topic.toLowerCase())
    ) {
      score = 70;
    }

    // Apply deadline multiplier if goal has target date
    if (score > 0 && goal.targetDate) {
      const now = Date.now();
      const daysUntil = Math.ceil((goal.targetDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 7) {
        score = Math.min(100, score * 1.5); // 1.5x for urgent goals
      } else if (daysUntil <= 30) {
        score = Math.min(100, score * 1.2); // 1.2x for near-term goals
      }
    }

    maxScore = Math.max(maxScore, score);
  }

  return Math.round(maxScore);
}

/**
 * Score a single topic using multi-factor algorithm
 */
export function scoreTopic(
  topic: string,
  profile: LearnerProfile,
  upcomingTests: UpcomingTest[],
  learningGoals: LearningGoal[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): TopicScore {
  const topicMastery = profile.topicMastery[topic];

  // Calculate component scores
  const masteryScore = calculateMasteryScore(topicMastery);
  const urgencyScore = calculateUrgencyScore(topic, upcomingTests);
  const goalScore = calculateGoalScore(topic, learningGoals);

  // Composite score (weighted average)
  const compositeScore = Math.round(
    masteryScore * weights.mastery +
    urgencyScore * weights.urgency +
    goalScore * weights.goals
  );

  // Confidence based on data availability
  const attempts = topicMastery?.attempts || 0;
  const confidence: 'low' | 'medium' | 'high' =
    attempts === 0 ? 'low' :
    attempts < 10 ? 'medium' :
    'high';

  // Generate Hebrew reasoning
  const reasoning: string[] = [];

  if (masteryScore >= 60) {
    reasoning.push('נושא שדורש חיזוק');
  }
  if (urgencyScore >= 60) {
    reasoning.push('מבחן מתקרב בנושא זה');
  }
  if (goalScore >= 70) {
    reasoning.push('תואם למטרות למידה שהוגדרו');
  }
  if (topicMastery && topicMastery.recentTrend === 'declining') {
    reasoning.push('ביצועים יורדים לאחרונה');
  }
  if (topicMastery && topicMastery.recentTrend === 'improving') {
    reasoning.push('ביצועים עולים - כדאי להמשיך');
  }
  if (!topicMastery) {
    reasoning.push('נושא חדש - טרם נלמד');
  }

  return {
    topic,
    score: compositeScore,
    masteryScore,
    urgencyScore,
    goalScore,
    confidence,
    reasoning
  };
}

/**
 * Generate balanced recommendations from scored topics
 *
 * Strategy:
 * - 30% from weakness topics (masteryScore >= 60)
 * - 40% from growth topics (masteryScore 30-60)
 * - 30% from maintenance topics (masteryScore < 30)
 */
export function generateRecommendations(
  scoredTopics: TopicScore[],
  count: number = 5
): Recommendation[] {
  // Sort by composite score descending
  const sorted = [...scoredTopics].sort((a, b) => b.score - a.score);

  // Categorize by mastery level
  const weakness = sorted.filter((t) => t.masteryScore >= 60);
  const growth = sorted.filter((t) => t.masteryScore >= 30 && t.masteryScore < 60);
  const maintenance = sorted.filter((t) => t.masteryScore < 30);

  // Calculate target counts (30/40/30 split)
  const weaknessCount = Math.ceil(count * 0.3);
  const growthCount = Math.ceil(count * 0.4);
  const maintenanceCount = Math.floor(count * 0.3);

  // Select from each category
  const selected: TopicScore[] = [
    ...weakness.slice(0, weaknessCount),
    ...growth.slice(0, growthCount),
    ...maintenance.slice(0, maintenanceCount)
  ];

  // Fill remaining slots with highest scored topics
  const remaining = count - selected.length;
  if (remaining > 0) {
    const usedTopics = new Set(selected.map((t) => t.topic));
    const fillTopics = sorted.filter((t) => !usedTopics.has(t.topic));
    selected.push(...fillTopics.slice(0, remaining));
  }

  // Convert to recommendations and sort by score
  const recommendations: Recommendation[] = selected
    .map((topicScore) => {
      // Determine category
      let category: 'weakness' | 'growth' | 'maintenance';
      if (topicScore.masteryScore >= 60) category = 'weakness';
      else if (topicScore.masteryScore >= 30) category = 'growth';
      else category = 'maintenance';

      // Determine priority
      let priority: 'urgent' | 'important' | 'review';
      if (topicScore.urgencyScore >= 60 || topicScore.masteryScore >= 80) {
        priority = 'urgent';
      } else if (topicScore.score >= 60) {
        priority = 'important';
      } else {
        priority = 'review';
      }

      return {
        topic: topicScore.topic,
        priority,
        score: topicScore.score,
        confidence: topicScore.confidence,
        reasoning: topicScore.reasoning,
        category
      };
    })
    .sort((a, b) => b.score - a.score);

  return recommendations;
}

/**
 * Record parent override for future calibration
 * Fire-and-forget pattern (swallow errors, log warning)
 */
export async function recordOverride(
  childId: string,
  familyId: string,
  parentId: string,
  topic: string,
  reason: OverrideReason,
  customReason?: string
): Promise<void> {
  try {
    const override: Omit<RecommendationOverride, 'id'> = {
      childId,
      familyId,
      parentId,
      topic,
      reason,
      customReason,
      timestamp: Date.now()
    };

    await addDoc(collection(db, 'recommendationOverrides'), override);

    logger.info('Recorded recommendation override', {
      childId,
      topic,
      reason
    });
  } catch (error) {
    logger.warn('Failed to record override (non-blocking)', {
      error,
      childId,
      topic
    });
    // Swallow error - override tracking is non-critical
  }
}
