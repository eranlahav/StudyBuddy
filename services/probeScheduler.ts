/**
 * Probe Scheduler Service
 *
 * Implements SM-2 based spaced repetition for mastery verification.
 * Mastered topics are probed periodically to ensure retention.
 *
 * Algorithm:
 * - Initial probe interval: 4 weeks (28 days)
 * - On success (>=67% accuracy): double interval (up to 24 weeks max)
 * - On failure (<67%): reset to initial interval, demote pKnown to 0.75
 */

import { TopicMastery } from '../types';
import { logger } from '../lib';

/**
 * Probe scheduling configuration constants
 */
export const PROBE_CONFIG = {
  /** Initial probe interval (4 weeks = 28 days) */
  INITIAL_INTERVAL_DAYS: 28,
  /** Maximum probe interval (24 weeks = 168 days) */
  MAX_INTERVAL_DAYS: 168,
  /** Probe question count per topic per quiz */
  QUESTIONS_PER_PROBE: 3,
  /** Minimum accuracy to pass probe (67% = 2/3 questions) */
  PASSING_ACCURACY: 0.67,
  /** pKnown to set after failed probe */
  FAILED_PROBE_PKNOWN: 0.75,
  /** Minimum pKnown to be eligible for probing */
  MIN_PROBE_PKNOWN: 0.8
} as const;

/**
 * Result of a probe attempt
 */
export interface ProbeResult {
  correct: number;
  total: number;
  passed: boolean;
}

/**
 * Check if a topic needs a probe question
 *
 * @param mastery - Topic mastery record to check
 * @returns True if topic is due for probing
 */
export function needsProbeQuestion(mastery: TopicMastery): boolean {
  // Only probe mastered topics (pKnown >= 0.8)
  if (mastery.pKnown < PROBE_CONFIG.MIN_PROBE_PKNOWN) {
    return false;
  }

  // No probe scheduled yet (new mastery or never probed)
  if (!mastery.nextProbeDate) {
    return false;
  }

  // Check if current time is past the scheduled probe date
  return Date.now() >= mastery.nextProbeDate;
}

/**
 * Schedule the next probe date for a topic
 *
 * @param mastery - Current topic mastery
 * @param probeResult - Optional result from a completed probe
 * @returns Updated TopicMastery with nextProbeDate and probeIntervalDays
 */
export function scheduleNextProbe(
  mastery: TopicMastery,
  probeResult?: ProbeResult
): TopicMastery {
  let intervalDays: number;

  if (!mastery.probeIntervalDays) {
    // First time scheduling: use initial interval
    intervalDays = PROBE_CONFIG.INITIAL_INTERVAL_DAYS;
    logger.debug('probeScheduler: Setting initial probe interval', {
      topic: mastery.topic,
      intervalDays
    });
  } else if (probeResult) {
    if (probeResult.passed) {
      // Passed probe: double the interval (up to max)
      intervalDays = Math.min(
        mastery.probeIntervalDays * 2,
        PROBE_CONFIG.MAX_INTERVAL_DAYS
      );
      logger.debug('probeScheduler: Probe passed, doubling interval', {
        topic: mastery.topic,
        previousInterval: mastery.probeIntervalDays,
        newInterval: intervalDays
      });
    } else {
      // Failed probe: reset to initial interval
      intervalDays = PROBE_CONFIG.INITIAL_INTERVAL_DAYS;
      logger.debug('probeScheduler: Probe failed, resetting interval', {
        topic: mastery.topic,
        intervalDays
      });
    }
  } else {
    // No probe result, maintain current interval or set initial
    intervalDays = mastery.probeIntervalDays || PROBE_CONFIG.INITIAL_INTERVAL_DAYS;
  }

  // Calculate next probe date
  const nextProbeDate = Date.now() + (intervalDays * 24 * 60 * 60 * 1000);

  return {
    ...mastery,
    nextProbeDate,
    probeIntervalDays: intervalDays
  };
}

/**
 * Process the result of a probe attempt
 *
 * @param mastery - Current topic mastery
 * @param correct - Number of correct answers
 * @param total - Total questions in probe
 * @returns Updated TopicMastery with adjusted pKnown and next probe scheduled
 */
export function processProbeResult(
  mastery: TopicMastery,
  correct: number,
  total: number
): TopicMastery {
  const accuracy = total > 0 ? correct / total : 0;
  const passed = accuracy >= PROBE_CONFIG.PASSING_ACCURACY;

  const probeResult: ProbeResult = {
    correct,
    total,
    passed
  };

  let updatedMastery: TopicMastery;

  if (!passed) {
    // Failed probe: demote from mastered
    logger.info('probeScheduler: Failed probe, demoting topic', {
      topic: mastery.topic,
      accuracy: Math.round(accuracy * 100),
      previousPKnown: mastery.pKnown,
      newPKnown: PROBE_CONFIG.FAILED_PROBE_PKNOWN
    });

    updatedMastery = {
      ...mastery,
      pKnown: PROBE_CONFIG.FAILED_PROBE_PKNOWN
    };
  } else {
    // Passed probe: refresh lastAttempt timestamp
    logger.info('probeScheduler: Probe passed, maintaining mastery', {
      topic: mastery.topic,
      accuracy: Math.round(accuracy * 100),
      pKnown: mastery.pKnown
    });

    updatedMastery = {
      ...mastery,
      lastAttempt: Date.now()
    };
  }

  // Schedule next probe based on result
  return scheduleNextProbe(updatedMastery, probeResult);
}
