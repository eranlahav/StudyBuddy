/**
 * Signal Weights - Evidence Hierarchy Configuration
 *
 * Implements confidence-weighted Bayesian fusion for multi-signal
 * profile updates. Based on ITS research (VanLehn et al., 2005).
 *
 * Evidence hierarchy:
 * - Evaluation: 95% confidence (teacher-validated, comprehensive)
 * - Quiz: 70% confidence (consistent but limited scope)
 * - Engagement: 60% confidence (indirect but revealing)
 * - Parent note: 40% confidence (subjective but valuable context)
 */

import { Signal, SignalType, FusedSignal } from '../types';

/**
 * Base confidence weights by signal type
 * Reflects inherent reliability of each evidence source
 */
export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  evaluation: 0.95,    // Teacher-validated, comprehensive
  quiz: 0.70,          // Consistent but limited scope
  engagement: 0.60,    // Indirect measure but revealing
  parent_note: 0.40    // Subjective but valuable context
};

/**
 * Recency decay configuration
 * Evidence decays over time: 100% today -> 50% at HALF_LIFE_DAYS
 */
export const RECENCY_CONFIG = {
  HALF_LIFE_DAYS: 30,  // 50% confidence at 30 days
  MIN_CONFIDENCE: 0.05 // Never fully discount evidence
};

/**
 * Sample size configuration for confidence boost
 */
export const SAMPLE_SIZE_CONFIG = {
  SATURATION_POINT: 10 // 10 samples for ~63% of max confidence
};

/**
 * Get base confidence for a signal type
 */
export function getBaseConfidence(signalType: SignalType): number {
  return SIGNAL_WEIGHTS[signalType] ?? 0.5;
}

/**
 * Apply recency decay to confidence
 * Uses exponential decay: confidence * e^(-0.5 * days / halfLife)
 *
 * @param baseConfidence - Starting confidence (0-1)
 * @param daysAgo - Days since signal was captured
 * @returns Adjusted confidence with decay applied
 */
export function applyRecencyDecay(
  baseConfidence: number,
  daysAgo: number
): number {
  const decayRate = 0.5; // Corresponds to 50% at HALF_LIFE_DAYS
  const decayFactor = Math.exp(-decayRate * daysAgo / RECENCY_CONFIG.HALF_LIFE_DAYS);
  return Math.max(RECENCY_CONFIG.MIN_CONFIDENCE, baseConfidence * decayFactor);
}

/**
 * Adjust confidence based on sample size
 * More data = higher confidence
 *
 * Formula: baseConfidence * (1 - e^(-sampleSize / saturationPoint))
 * - 1 sample: ~9% of base
 * - 5 samples: ~40% of base
 * - 10 samples: ~63% of base
 * - 20 samples: ~86% of base
 *
 * @param baseConfidence - Starting confidence (0-1)
 * @param sampleSize - Number of data points
 * @returns Adjusted confidence based on sample size
 */
export function applySampleSizeBoost(
  baseConfidence: number,
  sampleSize: number
): number {
  if (sampleSize <= 0) return RECENCY_CONFIG.MIN_CONFIDENCE;

  const boost = 1 - Math.exp(-sampleSize / SAMPLE_SIZE_CONFIG.SATURATION_POINT);
  return baseConfidence * boost;
}

/**
 * Calculate final confidence for a signal
 * Combines base confidence, recency decay, and sample size boost
 *
 * @param signal - The signal to calculate confidence for
 * @returns Final confidence value (clamped to [0.05, 0.95])
 */
export function calculateSignalConfidence(signal: Signal): number {
  const base = getBaseConfidence(signal.type);
  const withRecency = applyRecencyDecay(base, signal.recency);
  const final = applySampleSizeBoost(withRecency, signal.sampleSize);

  // Clamp to valid range
  return Math.max(0.05, Math.min(0.95, final));
}

/**
 * Fuse multiple signals into single mastery estimate
 * Uses confidence-weighted average (Bayesian fusion)
 *
 * P(mastery | all signals) = Sum(confidence_i * p_i) / Sum(confidence_i)
 *
 * @param signals - Array of signals to fuse
 * @returns Fused mastery estimate with composite confidence
 */
export function fuseSignals(signals: Signal[]): FusedSignal {
  if (signals.length === 0) {
    return {
      pKnown: 0.5, // Neutral prior
      confidence: 0.0,
      dominantSignal: 'quiz'
    };
  }

  // Calculate adjusted confidence for each signal
  const weighted = signals.map(signal => ({
    signal,
    adjustedConfidence: calculateSignalConfidence(signal)
  }));

  // Confidence-weighted average
  const totalWeight = weighted.reduce((sum, w) => sum + w.adjustedConfidence, 0);

  if (totalWeight === 0) {
    return {
      pKnown: 0.5,
      confidence: 0.0,
      dominantSignal: signals[0]?.type ?? 'quiz'
    };
  }

  const weightedSum = weighted.reduce(
    (sum, w) => sum + w.adjustedConfidence * w.signal.pKnown,
    0
  );

  const fusedPKnown = weightedSum / totalWeight;

  // Composite confidence (average of contributing confidences)
  const avgConfidence = totalWeight / weighted.length;

  // Find dominant signal (highest adjusted confidence)
  const dominant = weighted.reduce((max, w) =>
    w.adjustedConfidence > max.adjustedConfidence ? w : max
  );

  return {
    pKnown: Math.max(0, Math.min(1, fusedPKnown)),
    confidence: avgConfidence,
    dominantSignal: dominant.signal.type
  };
}

/**
 * Calculate days since a timestamp
 */
export function daysSince(timestamp: number): number {
  const now = Date.now();
  const diff = now - timestamp;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
