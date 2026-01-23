/**
 * Forgetting Curve - Time-Based Mastery Decay
 *
 * Implements Ebbinghaus forgetting curve for learner profiles.
 * Knowledge decays over time without practice, with rate depending
 * on current mastery level.
 *
 * Decay rates (per week):
 * - Mastered topics (>=0.8): 0.95 (5% weekly decay)
 * - Learning topics (0.5-0.8): 0.92 (8% weekly decay)
 * - Weak topics (<0.5): 0.88 (12% weekly decay)
 *
 * Example: Mastered topic (0.85) after 8 weeks without practice:
 * 0.85 * 0.95^8 = 0.85 * 0.663 = 0.56 (~66% retention)
 *
 * References:
 * - Ebbinghaus, H. (1885). Memory: A Contribution to Experimental Psychology
 * - Wozniak, P. (1990). SuperMemo spacing algorithm
 */

import { TopicMastery, LearnerProfile } from '../types';
import { daysSince } from './signalWeights';

/**
 * Configuration for forgetting curve decay
 */
export const FORGETTING_CONFIG = {
  /** Weekly decay multipliers by mastery level */
  DECAY_RATES: {
    mastered: 0.95,   // pKnown >= 0.8 (5% weekly decay)
    learning: 0.92,   // pKnown 0.5-0.8 (8% weekly decay)
    weak: 0.88        // pKnown < 0.5 (12% weekly decay)
  },
  /** Minimum pKnown floor (residual knowledge never fully disappears) */
  MIN_PKNOWN: 0.05,
  /** Global enable toggle for forgetting curve */
  ENABLED: true
} as const;

/**
 * Apply forgetting curve decay to a single topic mastery
 *
 * Uses exponential decay based on time since last attempt:
 * newPKnown = originalPKnown * (decayRate ^ weeks)
 *
 * Decay rate selection:
 * - Mastered (pKnown >= 0.8): 0.95/week
 * - Learning (0.5 <= pKnown < 0.8): 0.92/week
 * - Weak (pKnown < 0.5): 0.88/week
 *
 * @param mastery - Topic mastery to apply decay to
 * @returns New mastery object with decayed pKnown (immutable)
 *
 * @example
 * // Mastered topic after 56 days (8 weeks)
 * const mastery = { pKnown: 0.85, lastAttempt: Date.now() - 56*24*60*60*1000, ... };
 * const decayed = applyForgettingCurve(mastery);
 * // decayed.pKnown ≈ 0.56 (66% of original)
 */
export function applyForgettingCurve(mastery: TopicMastery): TopicMastery {
  // If disabled, return unchanged
  if (!FORGETTING_CONFIG.ENABLED) {
    return mastery;
  }

  // Calculate weeks since last attempt
  const days = daysSince(mastery.lastAttempt);
  const weeks = days / 7;

  // Select decay rate based on current mastery level
  let decayRate: number;
  if (mastery.pKnown >= 0.8) {
    decayRate = FORGETTING_CONFIG.DECAY_RATES.mastered;
  } else if (mastery.pKnown >= 0.5) {
    decayRate = FORGETTING_CONFIG.DECAY_RATES.learning;
  } else {
    decayRate = FORGETTING_CONFIG.DECAY_RATES.weak;
  }

  // Apply exponential decay: pKnown * (decayRate ^ weeks)
  const decayedPKnown = mastery.pKnown * Math.pow(decayRate, weeks);

  // Floor at minimum (residual knowledge)
  const finalPKnown = Math.max(FORGETTING_CONFIG.MIN_PKNOWN, decayedPKnown);

  // Return new object (immutable)
  // Note: lastAttempt is NOT modified - decay is read-only
  return {
    ...mastery,
    pKnown: finalPKnown
  };
}

/**
 * Apply forgetting curve decay to all topics in a learner profile
 *
 * Iterates through all topics in profile.topicMastery and applies
 * time-based decay to each one. Useful for profile visualization
 * and recommendation scoring.
 *
 * @param profile - Learner profile to apply decay to
 * @returns New profile object with all topics decayed (immutable)
 *
 * @example
 * const profile = await getProfile(childId);
 * const withDecay = applyForgettingCurveToProfile(profile);
 * // Use withDecay for recommendations/display (doesn't write to DB)
 */
export function applyForgettingCurveToProfile(profile: LearnerProfile): LearnerProfile {
  // If disabled, return unchanged
  if (!FORGETTING_CONFIG.ENABLED) {
    return profile;
  }

  // Apply decay to all topics
  const decayedTopics: Record<string, TopicMastery> = {};
  for (const [key, mastery] of Object.entries(profile.topicMastery)) {
    decayedTopics[key] = applyForgettingCurve(mastery);
  }

  // Return new profile (immutable)
  return {
    ...profile,
    topicMastery: decayedTopics
  };
}

/**
 * Math verification examples:
 *
 * Mastered topic (0.85) after 56 days (8 weeks):
 * 0.85 * 0.95^8 = 0.85 * 0.663 = 0.564 (~56%, or 66% of original)
 *
 * Learning topic (0.65) after 56 days (8 weeks):
 * 0.65 * 0.92^8 = 0.65 * 0.513 = 0.333 (~33%, or 52% of original)
 *
 * Weak topic (0.35) after 56 days (8 weeks):
 * 0.35 * 0.88^8 = 0.35 * 0.360 = 0.126 (~13%, or 37% of original)
 *
 * All examples floor at MIN_PKNOWN (0.05) to prevent complete knowledge loss.
 */
