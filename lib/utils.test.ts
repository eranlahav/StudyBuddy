/**
 * Tests for lib/utils.ts
 *
 * Covers all utility functions with edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
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

describe('shuffle', () => {
  it('returns an array of the same length', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
  });

  it('contains all original elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result.sort()).toEqual(input.sort());
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const original = [...input];
    shuffle(input);
    expect(input).toEqual(original);
  });

  it('handles empty arrays', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles single-element arrays', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('works with different types', () => {
    const strings = shuffle(['a', 'b', 'c']);
    expect(strings).toHaveLength(3);
    expect(strings.sort()).toEqual(['a', 'b', 'c']);

    const objects = shuffle([{ id: 1 }, { id: 2 }]);
    expect(objects).toHaveLength(2);
  });
});

describe('formatHebrewDate', () => {
  it('formats a date in Hebrew locale', () => {
    // January 15, 2026
    const timestamp = new Date(2026, 0, 15).getTime();
    const result = formatHebrewDate(timestamp);
    // Should contain "15" and "ינואר" and "2026"
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  it('handles different months', () => {
    // July 4, 2026
    const timestamp = new Date(2026, 6, 4).getTime();
    const result = formatHebrewDate(timestamp);
    expect(result).toContain('4');
    expect(result).toContain('2026');
  });
});

describe('formatShortDate', () => {
  it('formats date in short Hebrew format', () => {
    const timestamp = new Date(2026, 0, 15).getTime();
    const result = formatShortDate(timestamp);
    // Short format like "15/1/26" or similar
    expect(result).toMatch(/\d+/);
  });
});

describe('formatRelativeDay', () => {
  beforeEach(() => {
    // Mock Date to have consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 17, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "היום" for today', () => {
    const today = new Date(2026, 0, 17).getTime();
    expect(formatRelativeDay(today)).toBe('היום');
  });

  it('returns "מחר" for tomorrow', () => {
    const tomorrow = new Date(2026, 0, 18).getTime();
    expect(formatRelativeDay(tomorrow)).toBe('מחר');
  });

  it('returns "אתמול" for yesterday', () => {
    const yesterday = new Date(2026, 0, 16).getTime();
    expect(formatRelativeDay(yesterday)).toBe('אתמול');
  });

  it('returns formatted date for other days', () => {
    const nextWeek = new Date(2026, 0, 24).getTime();
    const result = formatRelativeDay(nextWeek);
    expect(result).not.toBe('היום');
    expect(result).not.toBe('מחר');
    expect(result).not.toBe('אתמול');
    expect(result).toContain('24');
  });
});

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 17, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for timestamps from today', () => {
    const morningToday = new Date(2026, 0, 17, 8, 0, 0).getTime();
    const eveningToday = new Date(2026, 0, 17, 20, 0, 0).getTime();
    expect(isToday(morningToday)).toBe(true);
    expect(isToday(eveningToday)).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date(2026, 0, 16, 12, 0, 0).getTime();
    expect(isToday(yesterday)).toBe(false);
  });

  it('returns false for tomorrow', () => {
    const tomorrow = new Date(2026, 0, 18, 12, 0, 0).getTime();
    expect(isToday(tomorrow)).toBe(false);
  });
});

describe('isWithinDays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 17, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for dates within range', () => {
    // Use timestamps that are in the future relative to mocked "now"
    const laterToday = new Date(2026, 0, 17, 14, 0, 0).getTime();
    const in3Days = new Date(2026, 0, 20, 12, 0, 0).getTime();
    expect(isWithinDays(laterToday, 7)).toBe(true);
    expect(isWithinDays(in3Days, 7)).toBe(true);
  });

  it('returns false for dates beyond range', () => {
    const in10Days = new Date(2026, 0, 27, 12, 0, 0).getTime();
    expect(isWithinDays(in10Days, 7)).toBe(false);
  });

  it('returns false for past dates', () => {
    const yesterday = new Date(2026, 0, 16, 12, 0, 0).getTime();
    expect(isWithinDays(yesterday, 7)).toBe(false);
  });

  it('includes the boundary day', () => {
    const exactlyInDays = new Date(2026, 0, 24, 11, 0, 0).getTime();
    expect(isWithinDays(exactlyInDays, 7)).toBe(true);
  });
});

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('includes prefix when provided', () => {
    const id = generateId('child');
    expect(id.startsWith('child-')).toBe(true);
  });

  it('works without prefix', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });

  it('generates IDs of reasonable length', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(5);
    expect(id.length).toBeLessThan(30);
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('returns min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, 0, 10)).toBe(0);
  });

  it('returns max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(1000, 0, 10)).toBe(10);
  });

  it('handles negative ranges', () => {
    expect(clamp(0, -10, -5)).toBe(-5);
    expect(clamp(-7, -10, -5)).toBe(-7);
    expect(clamp(-15, -10, -5)).toBe(-10);
  });

  it('handles equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
    expect(clamp(1, 3, 3)).toBe(3);
  });
});

describe('calculatePercentage', () => {
  it('calculates correct percentage', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(3, 4)).toBe(75);
    expect(calculatePercentage(1, 3)).toBe(33); // Rounded
  });

  it('returns 0 for zero total', () => {
    expect(calculatePercentage(5, 0)).toBe(0);
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it('handles 100% correctly', () => {
    expect(calculatePercentage(10, 10)).toBe(100);
  });

  it('handles 0% correctly', () => {
    expect(calculatePercentage(0, 10)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculatePercentage(1, 6)).toBe(17); // 16.666... rounds to 17
    expect(calculatePercentage(2, 6)).toBe(33); // 33.333... rounds to 33
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after specified time', async () => {
    const sleepPromise = sleep(1000);

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    await sleepPromise;
    // With fake timers, this should complete immediately
    expect(true).toBe(true);
  });

  it('returns a Promise', () => {
    const result = sleep(100);
    expect(result).toBeInstanceOf(Promise);
  });
});
