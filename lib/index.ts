/**
 * Library exports for Study Buddy
 *
 * Import from '@/lib' for convenience:
 * import { shuffle, logger, retry, QuizGenerationError } from '@/lib';
 */

// Utilities
export {
  shuffle,
  formatHebrewDate,
  formatShortDate,
  formatRelativeDay,
  isToday,
  isWithinDays,
  generateId,
  clamp,
  calculatePercentage,
  sleep
} from './utils';

// Error handling
export {
  AppError,
  ApiError,
  QuizGenerationError,
  TopicExtractionError,
  EvaluationAnalysisError,
  DatabaseError,
  ProfileUpdateError,
  ConfigurationError,
  AuthError,
  AuthenticationError,
  InviteError,
  PinError,
  NotFoundError,
  ValidationError,
  isAppError,
  getUserMessage,
  isRecoverable
} from './errors';

// Environment
export { env, hasApiKey, requireApiKey } from './env';
export type { EnvConfig } from './env';

// Logging
export { logger } from './logger';

// Retry
export { retry, withRetry } from './retry';
export type { RetryOptions } from './retry';

// Learner Model (BKT)
export {
  updateBKT,
  getBKTParams,
  recommendDifficulty,
  calculateTrend,
  BKT_DEFAULTS
} from './learnerModel';

// Encouragement messages
export {
  FATIGUE_MESSAGES,
  FRUSTRATION_MESSAGES,
  EARLY_END_EXPLANATIONS,
  getEncouragementMessage,
  getParentExplanation
} from './encouragement';

// OCR utilities
export {
  detectOcrIssues,
  hasCriticalIssues,
  getConfidenceLabel,
  getConfidenceColorClass,
  getScoreColorClass,
  getTestTypeLabel
} from './ocrUtils';
export type { OcrIssue, OcrIssueType, OcrIssueSeverity } from './ocrUtils';

// Signal Weights (Phase 4)
export {
  getBaseConfidence,
  applyRecencyDecay,
  applySampleSizeBoost,
  calculateSignalConfidence,
  fuseSignals,
  daysSince,
  SIGNAL_WEIGHTS,
  RECENCY_CONFIG,
  SAMPLE_SIZE_CONFIG
} from './signalWeights';

// Engagement Detection (Phase 4)
export {
  analyzeEngagement,
  buildEngagementMetrics,
  getEngagementLabel,
  getEngagementColorClass,
  ENGAGEMENT_CONFIG
} from './engagementDetector';
