/**
 * Alert Service - Regression Detection
 *
 * Detects when a child's mastery regresses from mastered (>=0.8) to below
 * critical threshold (0.7) and creates alerts for parent intervention.
 *
 * Key features:
 * - 14-day cooldown per topic to prevent alert fatigue
 * - Minimum 10% drop threshold to reduce noise
 * - Hebrew message formatting for parent dashboard
 */

import { RegressionAlert, TopicMastery, ChildProfile } from '../types';
import { daysSince } from '../lib/signalWeights';
import { logger } from '../lib';

/**
 * Configuration constants for regression alerts
 */
export const ALERT_CONFIG = {
  /** Trigger alert when pKnown drops below this */
  REGRESSION_THRESHOLD: 0.70,
  /** Only alert if topic was previously above this */
  PREVIOUS_MASTERY_THRESHOLD: 0.80,
  /** Cooldown between alerts for same topic (days) */
  ALERT_COOLDOWN_DAYS: 14,
  /** Minimum drop in pKnown to trigger (prevents noise) */
  MIN_DROP_THRESHOLD: 0.10
};

/**
 * Detect if a topic has regressed from mastery
 *
 * Criteria:
 * 1. Previously mastered (pKnown >= 0.8)
 * 2. Currently below threshold (pKnown < 0.7)
 * 3. Drop is at least 10 percentage points
 *
 * @param currentMastery - Current mastery state
 * @param previousMastery - Previous mastery state (optional)
 * @returns true if regression detected
 */
export function detectRegression(
  currentMastery: TopicMastery,
  previousMastery?: TopicMastery
): boolean {
  // No baseline to compare against
  if (!previousMastery) {
    return false;
  }

  const wasMastered = previousMastery.pKnown >= ALERT_CONFIG.PREVIOUS_MASTERY_THRESHOLD;
  const isBelowThreshold = currentMastery.pKnown < ALERT_CONFIG.REGRESSION_THRESHOLD;
  const dropMagnitude = previousMastery.pKnown - currentMastery.pKnown;
  const isSignificantDrop = dropMagnitude >= ALERT_CONFIG.MIN_DROP_THRESHOLD;

  logger.debug('Regression detection', {
    topic: currentMastery.topic,
    wasMastered,
    isBelowThreshold,
    dropMagnitude,
    isSignificantDrop
  });

  return wasMastered && isBelowThreshold && isSignificantDrop;
}

/**
 * Check if we should alert for this regression
 * Applies cooldown logic to prevent alert fatigue
 *
 * @param mastery - Current mastery state with lastAlertedAt
 * @param lastAlertedAt - Timestamp of last alert (optional)
 * @returns true if cooldown has expired or no previous alert
 */
export function shouldAlertForRegression(
  mastery: TopicMastery,
  lastAlertedAt?: number
): boolean {
  // No previous alert - can alert now
  if (!lastAlertedAt) {
    return true;
  }

  const daysSinceAlert = daysSince(lastAlertedAt);
  const cooldownExpired = daysSinceAlert >= ALERT_CONFIG.ALERT_COOLDOWN_DAYS;

  logger.debug('Alert cooldown check', {
    topic: mastery.topic,
    daysSinceAlert,
    cooldownExpired
  });

  return cooldownExpired;
}

/**
 * Format Hebrew message for regression alert
 *
 * @param childName - Child's name
 * @param topic - Topic that regressed
 * @param subjectName - Subject name
 * @returns Hebrew message string
 */
export function formatAlertMessage(
  childName: string,
  topic: string,
  subjectName: string
): string {
  return `${childName} נראה/ת מתקשה ב${topic} (${subjectName})`;
}

/**
 * Create a regression alert object
 *
 * @param child - Child profile
 * @param mastery - Current mastery state showing regression
 * @param subjectName - Name of subject for display
 * @param previousPKnown - Previous mastery level before regression
 * @returns Complete RegressionAlert object ready for storage
 */
export function createRegressionAlert(
  child: ChildProfile,
  mastery: TopicMastery,
  subjectName: string,
  previousPKnown: number
): RegressionAlert {
  const timestamp = Date.now();
  const id = `alert_${child.id}_${mastery.topic}_${timestamp}`;
  const message = formatAlertMessage(child.name, mastery.topic, subjectName);

  logger.info('Creating regression alert', {
    childId: child.id,
    topic: mastery.topic,
    previousPKnown,
    currentPKnown: mastery.pKnown
  });

  return {
    id,
    childId: child.id,
    childName: child.name,
    topic: mastery.topic,
    subjectId: mastery.subjectId,
    subjectName,
    previousPKnown,
    currentPKnown: mastery.pKnown,
    message,
    timestamp,
    dismissed: false,
    lastAlertedAt: timestamp
  };
}
