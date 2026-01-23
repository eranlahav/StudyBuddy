/**
 * Engagement Detector - Session Behavior Analysis
 *
 * Analyzes quiz session metrics to detect engagement patterns:
 * - High: Normal pace, completes session, focused
 * - Medium: Slightly fast/slow, but completes
 * - Low: Rushing through or very slow, completes
 * - Avoidance: Early exit, incomplete, very fast across all
 *
 * Engagement signals modify profile confidence, not mastery directly.
 * Low engagement = lower confidence in existing mastery estimate.
 */

import { EngagementMetrics, EngagementSignal } from '../types';

/**
 * Configuration for engagement detection thresholds
 */
export const ENGAGEMENT_CONFIG = {
  /** Expected seconds per question (baseline) */
  EXPECTED_TIME_PER_QUESTION: 30000, // 30 seconds in ms

  /** Answer time < expected * RUSH_THRESHOLD = rushing */
  RUSH_THRESHOLD: 0.5,

  /** Answer time > expected * SLOW_THRESHOLD = slow */
  SLOW_THRESHOLD: 3.0,

  /** Completion rate below this + early exit = avoidance */
  AVOIDANCE_COMPLETION_THRESHOLD: 0.5,

  /** Session duration ratio thresholds */
  FAST_SESSION_RATIO: 0.6,
  SLOW_SESSION_RATIO: 2.0,

  /** Mastery adjustments by engagement level */
  MASTERY_ADJUSTMENTS: {
    high: 0,
    medium: 0,
    low: -0.05,
    avoidance: -0.10
  } as const,

  /** Minimum questions for meaningful engagement analysis */
  MIN_QUESTIONS_FOR_ANALYSIS: 3
};

/**
 * Analyze engagement patterns from session metrics
 *
 * @param metrics - Session metrics captured during quiz
 * @param expectedTimePerQuestion - Expected time per question (ms), defaults to 30s
 * @returns Engagement signal with level, confidence, reasoning, and mastery impact
 */
export function analyzeEngagement(
  metrics: EngagementMetrics,
  expectedTimePerQuestion: number = ENGAGEMENT_CONFIG.EXPECTED_TIME_PER_QUESTION
): EngagementSignal {
  const reasoning: string[] = [];
  let level: EngagementSignal['level'] = 'medium';
  let impactOnMastery = 0;

  // Not enough data for meaningful analysis
  if (metrics.questionsAnswered < ENGAGEMENT_CONFIG.MIN_QUESTIONS_FOR_ANALYSIS) {
    return {
      level: 'medium',
      confidence: 0.3,
      reasoning: ['לא מספיק נתונים לניתוח מעורבות'],
      impactOnMastery: 0
    };
  }

  // 1. Check completion rate and early exit
  if (
    metrics.completionRate < ENGAGEMENT_CONFIG.AVOIDANCE_COMPLETION_THRESHOLD &&
    metrics.earlyExitDetected
  ) {
    level = 'avoidance';
    impactOnMastery = ENGAGEMENT_CONFIG.MASTERY_ADJUSTMENTS.avoidance;
    reasoning.push(
      `יצא מהתרגול מוקדם (השלים רק ${Math.round(metrics.completionRate * 100)}%)`
    );
  } else if (metrics.completionRate >= 0.95) {
    reasoning.push('השלים את כל התרגול');
  } else if (metrics.completionRate >= 0.7) {
    reasoning.push(`השלים ${Math.round(metrics.completionRate * 100)}% מהתרגול`);
  }

  // 2. Check pacing (answer time)
  const avgTimeMs = metrics.averageTimePerQuestion;
  const rushThreshold = expectedTimePerQuestion * ENGAGEMENT_CONFIG.RUSH_THRESHOLD;
  const slowThreshold = expectedTimePerQuestion * ENGAGEMENT_CONFIG.SLOW_THRESHOLD;

  if (metrics.rushingDetected || avgTimeMs < rushThreshold) {
    reasoning.push(
      `עובר על שאלות במהירות (ממוצע ${Math.round(avgTimeMs / 1000)} שניות)`
    );
    if (level !== 'avoidance') {
      level = 'low';
      impactOnMastery = ENGAGEMENT_CONFIG.MASTERY_ADJUSTMENTS.low;
    }
  } else if (avgTimeMs > slowThreshold) {
    reasoning.push(
      `לוקח זמן רב (ממוצע ${Math.round(avgTimeMs / 1000)} שניות)`
    );
    // Slow can indicate deep thinking OR disengagement
    // We don't penalize for slow - context from accuracy determines impact
  } else {
    reasoning.push('קצב תשובה נורמלי');
    if (level === 'medium' && metrics.completionRate >= 0.95) {
      level = 'high';
    }
  }

  // 3. Session duration vs expected duration
  const expectedDuration = metrics.questionsAnswered * expectedTimePerQuestion;
  const durationRatio = metrics.sessionDuration / expectedDuration;

  if (durationRatio < ENGAGEMENT_CONFIG.FAST_SESSION_RATIO) {
    reasoning.push('סיים מהר מהצפוי');
    if (level !== 'avoidance') {
      level = 'low';
      impactOnMastery = Math.min(impactOnMastery, ENGAGEMENT_CONFIG.MASTERY_ADJUSTMENTS.low);
    }
  } else if (durationRatio > ENGAGEMENT_CONFIG.SLOW_SESSION_RATIO) {
    reasoning.push('לקח זמן רב עם הפסקות');
    // Don't penalize - could be bathroom break, etc.
  }

  // 4. Calculate confidence based on data quality
  // More questions answered = higher confidence in engagement assessment
  const confidence = Math.min(
    0.95,
    0.4 + (metrics.questionsAnswered / 20) * 0.55
  );

  return {
    level,
    confidence,
    reasoning,
    impactOnMastery
  };
}

/**
 * Build engagement metrics from quiz session data
 * Helper function for constructing metrics object
 *
 * @param params - Session timing and completion data
 * @returns EngagementMetrics object ready for analysis
 */
export function buildEngagementMetrics(params: {
  sessionStartTime: number;
  sessionEndTime: number;
  questionsAnswered: number;
  questionsAvailable: number;
  answerTimes: number[]; // Array of ms per question
  earlyExit: boolean;
}): EngagementMetrics {
  const {
    sessionStartTime,
    sessionEndTime,
    questionsAnswered,
    questionsAvailable,
    answerTimes,
    earlyExit
  } = params;

  const sessionDuration = sessionEndTime - sessionStartTime;
  const completionRate = questionsAvailable > 0
    ? questionsAnswered / questionsAvailable
    : 0;

  const averageTimePerQuestion = answerTimes.length > 0
    ? answerTimes.reduce((a, b) => a + b, 0) / answerTimes.length
    : 0;

  // Detect rushing: >80% of answers are below half expected time
  const expectedTime = ENGAGEMENT_CONFIG.EXPECTED_TIME_PER_QUESTION;
  const rushCount = answerTimes.filter(t => t < expectedTime * 0.5).length;
  const rushingDetected = answerTimes.length > 0 && rushCount / answerTimes.length > 0.8;

  return {
    sessionDuration,
    questionsAnswered,
    questionsAvailable,
    completionRate,
    averageTimePerQuestion,
    earlyExitDetected: earlyExit,
    rushingDetected
  };
}

/**
 * Get Hebrew label for engagement level
 */
export function getEngagementLabel(level: EngagementSignal['level']): string {
  switch (level) {
    case 'high':
      return 'מעורבות גבוהה';
    case 'medium':
      return 'מעורבות בינונית';
    case 'low':
      return 'מעורבות נמוכה';
    case 'avoidance':
      return 'הימנעות';
  }
}

/**
 * Get CSS color class for engagement level
 */
export function getEngagementColorClass(level: EngagementSignal['level']): string {
  switch (level) {
    case 'high':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-orange-600';
    case 'avoidance':
      return 'text-red-600';
  }
}
