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
