/**
 * Learner Model - Bayesian Knowledge Tracing Implementation
 *
 * Implements BKT algorithm for probabilistic skill tracking.
 * Based on Corbett & Anderson (1994) with grade-specific parameters.
 *
 * Key concepts:
 * - pKnown: Probability student has mastered the skill (0-1)
 * - pLearn: Probability of learning from each question
 * - pGuess: Probability of correct answer when skill not known
 * - pSlip: Probability of incorrect answer when skill is known
 */

import { BKTParams, GradeLevel, DifficultyLevel } from '../types';

/**
 * Default BKT parameters by grade band
 * Based on educational research + Khan Academy calibration
 */
export const BKT_DEFAULTS: Record<string, BKTParams> = {
  'grades_1_3': {
    pInit: 0.10,   // Start low (most material new)
    pLearn: 0.30,  // Learn quickly (foundational skills)
    pGuess: 0.25,  // 4 options = 25% theoretical
    pSlip: 0.15    // Higher slip (developing focus)
  },
  'grades_4_6': {
    pInit: 0.20,   // Some prior knowledge
    pLearn: 0.20,  // Steady learning rate
    pGuess: 0.20,  // Slightly below theoretical
    pSlip: 0.10    // Improved attention
  },
  'grades_7_8': {
    pInit: 0.25,   // More background
    pLearn: 0.15,  // Slower (complex material)
    pGuess: 0.18,  // Strategic guessing
    pSlip: 0.08    // Mature focus
  }
};

/**
 * Get grade band key from GradeLevel enum
 */
function getGradeBand(grade: GradeLevel): string {
  // Extract grade number from Hebrew string (e.g., "כיתה ד'" -> 4)
  const gradeMap: Record<GradeLevel, number> = {
    [GradeLevel.Grade1]: 1,
    [GradeLevel.Grade2]: 2,
    [GradeLevel.Grade3]: 3,
    [GradeLevel.Grade4]: 4,
    [GradeLevel.Grade5]: 5,
    [GradeLevel.Grade6]: 6,
    [GradeLevel.Grade7]: 7,
    [GradeLevel.Grade8]: 8
  };

  const gradeNum = gradeMap[grade] ?? 4; // Default to grade 4 if unknown

  if (gradeNum <= 3) return 'grades_1_3';
  if (gradeNum <= 6) return 'grades_4_6';
  return 'grades_7_8';
}

/**
 * Get grade-appropriate BKT parameters
 */
export function getBKTParams(grade: GradeLevel): BKTParams {
  const band = getGradeBand(grade);
  return BKT_DEFAULTS[band] || BKT_DEFAULTS['grades_4_6'];
}

/**
 * Update mastery probability using Bayesian Knowledge Tracing
 *
 * @param pKnown - Current mastery probability (0-1)
 * @param correct - Did student answer correctly?
 * @param params - BKT parameters (grade-specific)
 * @returns Updated mastery probability (0-1)
 *
 * Formula based on Corbett & Anderson (1994):
 * 1. Update for learning opportunity: P(K) = P(K) + (1-P(K)) * P(Learn)
 * 2. Apply Bayes rule based on observed response
 */
export function updateBKT(
  pKnown: number,
  correct: boolean,
  params: BKTParams
): number {
  const { pLearn, pGuess, pSlip } = params;

  // Update for learning opportunity (happens regardless of answer)
  const pKnownAfterLearning = pKnown + (1 - pKnown) * pLearn;

  // Conditional probabilities
  const pCorrectIfKnown = 1 - pSlip;
  const pCorrectIfUnknown = pGuess;

  // Apply Bayes rule
  let pKnownPosterior: number;

  if (correct) {
    // P(Known | Correct) using Bayes rule
    const numerator = pKnownAfterLearning * pCorrectIfKnown;
    const denominator =
      pKnownAfterLearning * pCorrectIfKnown +
      (1 - pKnownAfterLearning) * pCorrectIfUnknown;
    pKnownPosterior = numerator / denominator;
  } else {
    // P(Known | Incorrect) using Bayes rule
    const numerator = pKnownAfterLearning * (1 - pCorrectIfKnown);
    const denominator =
      pKnownAfterLearning * (1 - pCorrectIfKnown) +
      (1 - pKnownAfterLearning) * (1 - pCorrectIfUnknown);
    pKnownPosterior = numerator / denominator;
  }

  // Clamp to [0, 1] to handle numerical edge cases
  return Math.max(0, Math.min(1, pKnownPosterior));
}

/**
 * Recommend difficulty level based on current mastery
 */
export function recommendDifficulty(pKnown: number): DifficultyLevel {
  if (pKnown < 0.4) {
    return 'easy';
  } else if (pKnown < 0.7) {
    return 'medium';
  } else {
    return 'hard';
  }
}

/**
 * Calculate trend from performance window
 * Requires at least 6 attempts for meaningful comparison
 */
export function calculateTrend(
  performanceWindow: number[]
): 'improving' | 'stable' | 'declining' {
  if (performanceWindow.length < 6) {
    return 'stable';
  }

  // Compare last 3 vs previous 3
  const recent = performanceWindow.slice(-3).reduce((a, b) => a + b, 0);
  const previous = performanceWindow.slice(-6, -3).reduce((a, b) => a + b, 0);

  if (recent > previous + 1) {
    return 'improving';
  } else if (recent < previous - 1) {
    return 'declining';
  }
  return 'stable';
}
