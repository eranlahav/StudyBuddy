/**
 * PIN Service
 *
 * Handles PIN hashing and verification for child authentication.
 * Uses bcrypt for secure password hashing.
 */

import bcrypt from 'bcryptjs';
import { logger, PinError } from '../lib';

// bcrypt cost factor - higher = more secure but slower
const SALT_ROUNDS = 10;

// PIN attempt tracking (in-memory, resets on page refresh)
const attemptTracker = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 30000; // 30 seconds

/**
 * Hash a 4-digit PIN
 */
export async function hashPin(pin: string): Promise<string> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }

  try {
    const hash = await bcrypt.hash(pin, SALT_ROUNDS);
    logger.debug('pinService: PIN hashed');
    return hash;
  } catch (error) {
    logger.error('pinService: Failed to hash PIN', {}, error);
    throw error;
  }
}

/**
 * Verify a PIN against its hash
 * Includes brute-force protection with attempt limiting
 */
export async function verifyPin(
  childId: string,
  pin: string,
  hash: string
): Promise<boolean> {
  // Check if locked out
  const tracker = attemptTracker.get(childId);
  if (tracker && tracker.lockedUntil > Date.now()) {
    const secondsLeft = Math.ceil((tracker.lockedUntil - Date.now()) / 1000);
    throw new PinError(
      'Too many attempts',
      tracker.count >= MAX_ATTEMPTS ? undefined : secondsLeft
    );
  }

  try {
    const isValid = await bcrypt.compare(pin, hash);

    if (isValid) {
      // Clear attempts on success
      attemptTracker.delete(childId);
      logger.debug('pinService: PIN verified successfully', { childId });
      return true;
    }

    // Track failed attempt
    const currentTracker = attemptTracker.get(childId) || { count: 0, lockedUntil: 0 };
    currentTracker.count += 1;

    if (currentTracker.count >= MAX_ATTEMPTS) {
      currentTracker.lockedUntil = Date.now() + LOCKOUT_DURATION;
      attemptTracker.set(childId, currentTracker);

      logger.warn('pinService: Child locked out due to failed attempts', {
        childId,
        attempts: currentTracker.count
      });

      throw new PinError('Account locked', 0);
    }

    attemptTracker.set(childId, currentTracker);
    const remaining = MAX_ATTEMPTS - currentTracker.count;

    logger.debug('pinService: PIN verification failed', {
      childId,
      attemptsRemaining: remaining
    });

    throw new PinError('Invalid PIN', remaining);

  } catch (error) {
    // Re-throw PinError, wrap others
    if (error instanceof PinError) {
      throw error;
    }
    logger.error('pinService: PIN verification error', { childId }, error);
    throw error;
  }
}

/**
 * Validate PIN format (4 digits)
 */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Check if a child has a PIN set
 */
export function hasPinSet(pinHash: string | undefined | null): boolean {
  return Boolean(pinHash && pinHash.length > 0);
}

/**
 * Clear attempt tracker for a child (for testing or admin reset)
 */
export function clearAttempts(childId: string): void {
  attemptTracker.delete(childId);
}

/**
 * Get remaining attempts for a child
 */
export function getRemainingAttempts(childId: string): number {
  const tracker = attemptTracker.get(childId);
  if (!tracker) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - tracker.count);
}

/**
 * Check if a child is locked out
 */
export function isLockedOut(childId: string): { locked: boolean; secondsRemaining: number } {
  const tracker = attemptTracker.get(childId);
  if (!tracker || tracker.lockedUntil <= Date.now()) {
    return { locked: false, secondsRemaining: 0 };
  }
  return {
    locked: true,
    secondsRemaining: Math.ceil((tracker.lockedUntil - Date.now()) / 1000)
  };
}
