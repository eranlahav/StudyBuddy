/**
 * Retry utilities with exponential backoff
 *
 * Use this for transient failures like network errors or rate limiting.
 * The retry logic uses exponential backoff to avoid overwhelming services.
 */

import { logger } from './logger';
import { ApiError } from './errors';
import { sleep } from './utils';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 2) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Function to determine if an error is retryable (default: checks for transient errors) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Optional context for logging */
  context?: string;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'context' | 'shouldRetry'>> = {
  maxRetries: 2,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

/**
 * Default retry predicate - retries on network errors and rate limits
 */
function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Rate limiting (429)
  if (error instanceof ApiError && error.statusCode === 429) {
    return true;
  }

  // Server errors (5xx)
  if (error instanceof ApiError && error.statusCode && error.statusCode >= 500) {
    return true;
  }

  // Google AI SDK specific errors that are retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('rate limit') ||
      message.includes('quota exceeded') ||
      message.includes('temporarily unavailable') ||
      message.includes('resource exhausted') ||
      message.includes('timeout') ||
      message.includes('network')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  // Exponential backoff: delay = initial * multiplier^attempt
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter (±25%) to avoid thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

  return Math.round(cappedDelay + jitter);
}

/**
 * Execute an async function with retry logic
 *
 * @example
 * const result = await retry(
 *   () => fetchDataFromApi(),
 *   { maxRetries: 3, context: 'fetchUserData' }
 * );
 *
 * @example
 * // With custom retry predicate
 * const result = await retry(
 *   () => generateQuiz(),
 *   {
 *     maxRetries: 2,
 *     shouldRetry: (error) => error.message.includes('rate limit')
 *   }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier
  } = { ...DEFAULT_OPTIONS, ...options };

  const shouldRetry = options.shouldRetry ?? isRetryableError;
  const logContext = options.context ?? 'retry';

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(error, attempt)) {
        const delay = calculateDelay(
          attempt,
          initialDelayMs,
          maxDelayMs,
          backoffMultiplier
        );

        logger.warn(
          `${logContext}: Attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          { attempt, maxRetries, delay },
          error
        );

        await sleep(delay);
      } else {
        // No more retries or error is not retryable
        if (attempt > 0) {
          logger.error(
            `${logContext}: All ${attempt + 1} attempts failed`,
            { attempts: attempt + 1 },
            error
          );
        }
        throw error;
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Create a retryable version of an async function
 *
 * @example
 * const retryableFetch = withRetry(fetchData, { maxRetries: 3 });
 * const result = await retryableFetch();
 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => retry(() => fn(...args), options);
}
