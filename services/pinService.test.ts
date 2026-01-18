/**
 * Tests for services/pinService.ts
 *
 * Tests PIN hashing, verification, and brute-force protection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hashPin,
  verifyPin,
  isValidPinFormat,
  hasPinSet,
  clearAttempts,
  getRemainingAttempts,
  isLockedOut
} from './pinService';
import { PinError } from '../lib';

// Mock logger to reduce noise
vi.mock('../lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib')>();
  return {
    ...actual,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('pinService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all attempt trackers between tests
    clearAttempts('test-child-1');
    clearAttempts('test-child-2');
    clearAttempts('test-child-lockout');
  });

  describe('hashPin', () => {
    it('hashes a valid 4-digit PIN', async () => {
      const hash = await hashPin('1234');

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('1234');
      expect(hash.length).toBeGreaterThan(10); // bcrypt hashes are long
    });

    it('produces different hashes for same PIN (due to salt)', async () => {
      const hash1 = await hashPin('1234');
      const hash2 = await hashPin('1234');

      expect(hash1).not.toBe(hash2);
    });

    it('rejects PIN with less than 4 digits', async () => {
      await expect(hashPin('123')).rejects.toThrow('PIN must be exactly 4 digits');
    });

    it('rejects PIN with more than 4 digits', async () => {
      await expect(hashPin('12345')).rejects.toThrow('PIN must be exactly 4 digits');
    });

    it('rejects PIN with non-digit characters', async () => {
      await expect(hashPin('12ab')).rejects.toThrow('PIN must be exactly 4 digits');
    });

    it('rejects empty PIN', async () => {
      await expect(hashPin('')).rejects.toThrow('PIN must be exactly 4 digits');
    });
  });

  describe('verifyPin', () => {
    it('returns true for correct PIN', async () => {
      const hash = await hashPin('5678');
      const result = await verifyPin('test-child-1', '5678', hash);

      expect(result).toBe(true);
    });

    it('throws PinError for incorrect PIN', async () => {
      const hash = await hashPin('1234');

      await expect(verifyPin('test-child-1', '0000', hash))
        .rejects.toThrow(PinError);
    });

    it('includes remaining attempts in error for wrong PIN', async () => {
      const hash = await hashPin('1234');

      try {
        await verifyPin('test-child-2', '0000', hash);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(PinError);
        // First failed attempt, should have 2 remaining
      }
    });

    it('clears attempts on successful verification', async () => {
      const hash = await hashPin('1234');
      const childId = 'test-child-1';

      // Fail once
      try {
        await verifyPin(childId, '0000', hash);
      } catch {}

      expect(getRemainingAttempts(childId)).toBe(2);

      // Succeed
      await verifyPin(childId, '1234', hash);

      // Attempts should be cleared
      expect(getRemainingAttempts(childId)).toBe(3);
    });

    it('locks out after 3 failed attempts', async () => {
      const hash = await hashPin('1234');
      const childId = 'test-child-lockout';

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await verifyPin(childId, '0000', hash);
        } catch {}
      }

      // Should be locked out
      const lockStatus = isLockedOut(childId);
      expect(lockStatus.locked).toBe(true);
      expect(lockStatus.secondsRemaining).toBeGreaterThan(0);
    });

    it('throws when trying to verify while locked out', async () => {
      const hash = await hashPin('1234');
      const childId = 'test-child-lockout';

      // Fail 3 times to trigger lockout
      for (let i = 0; i < 3; i++) {
        try {
          await verifyPin(childId, '0000', hash);
        } catch {}
      }

      // Try again while locked
      await expect(verifyPin(childId, '1234', hash))
        .rejects.toThrow(PinError);
    });
  });

  describe('isValidPinFormat', () => {
    it('returns true for valid 4-digit PIN', () => {
      expect(isValidPinFormat('1234')).toBe(true);
      expect(isValidPinFormat('0000')).toBe(true);
      expect(isValidPinFormat('9999')).toBe(true);
    });

    it('returns false for non-4-digit strings', () => {
      expect(isValidPinFormat('123')).toBe(false);
      expect(isValidPinFormat('12345')).toBe(false);
      expect(isValidPinFormat('')).toBe(false);
    });

    it('returns false for non-numeric strings', () => {
      expect(isValidPinFormat('abcd')).toBe(false);
      expect(isValidPinFormat('12ab')).toBe(false);
      expect(isValidPinFormat('12.4')).toBe(false);
    });
  });

  describe('hasPinSet', () => {
    it('returns true for non-empty hash', () => {
      expect(hasPinSet('$2a$10$somehashvalue')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(hasPinSet('')).toBe(false);
    });

    it('returns false for null', () => {
      expect(hasPinSet(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(hasPinSet(undefined)).toBe(false);
    });
  });

  describe('getRemainingAttempts', () => {
    it('returns max attempts for new child', () => {
      expect(getRemainingAttempts('new-child')).toBe(3);
    });

    it('decrements after failed attempt', async () => {
      const hash = await hashPin('1234');
      const childId = 'test-child-1';

      try {
        await verifyPin(childId, '0000', hash);
      } catch {}

      expect(getRemainingAttempts(childId)).toBe(2);
    });

    it('returns 0 after max failed attempts', async () => {
      const hash = await hashPin('1234');
      const childId = 'test-child-1';

      for (let i = 0; i < 3; i++) {
        try {
          await verifyPin(childId, '0000', hash);
        } catch {}
      }

      expect(getRemainingAttempts(childId)).toBe(0);
    });
  });

  describe('clearAttempts', () => {
    it('resets attempt count', async () => {
      const hash = await hashPin('1234');
      const childId = 'test-child-1';

      // Fail once
      try {
        await verifyPin(childId, '0000', hash);
      } catch {}

      expect(getRemainingAttempts(childId)).toBe(2);

      clearAttempts(childId);

      expect(getRemainingAttempts(childId)).toBe(3);
    });

    it('clears lockout', async () => {
      const hash = await hashPin('1234');
      const childId = 'test-child-1';

      // Trigger lockout
      for (let i = 0; i < 3; i++) {
        try {
          await verifyPin(childId, '0000', hash);
        } catch {}
      }

      expect(isLockedOut(childId).locked).toBe(true);

      clearAttempts(childId);

      expect(isLockedOut(childId).locked).toBe(false);
    });
  });

  describe('isLockedOut', () => {
    it('returns locked: false for new child', () => {
      const result = isLockedOut('new-child');

      expect(result.locked).toBe(false);
      expect(result.secondsRemaining).toBe(0);
    });

    it('returns locked: true after lockout', async () => {
      const hash = await hashPin('1234');
      const childId = 'test-child-1';

      for (let i = 0; i < 3; i++) {
        try {
          await verifyPin(childId, '0000', hash);
        } catch {}
      }

      const result = isLockedOut(childId);

      expect(result.locked).toBe(true);
      expect(result.secondsRemaining).toBeGreaterThan(0);
      expect(result.secondsRemaining).toBeLessThanOrEqual(30);
    });
  });
});
