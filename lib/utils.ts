/**
 * Shared utility functions for Study Buddy
 * Consolidates duplicate logic from across the codebase
 */

/**
 * Fisher-Yates shuffle algorithm for arrays
 * Creates a new shuffled array without mutating the original
 *
 * @example
 * const shuffled = shuffle([1, 2, 3, 4, 5]);
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Format a timestamp to a localized Hebrew date string
 *
 * @example
 * formatHebrewDate(Date.now()) // "16 בינואר 2026"
 */
export function formatHebrewDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format a timestamp to a short Hebrew date
 *
 * @example
 * formatShortDate(Date.now()) // "16/1/26"
 */
export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit'
  });
}

/**
 * Format a timestamp to a relative day string in Hebrew
 * Returns "היום", "מחר", "אתמול", or the formatted date
 */
export function formatRelativeDay(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  if (isSameDay(date, today)) return 'היום';
  if (isSameDay(date, tomorrow)) return 'מחר';
  if (isSameDay(date, yesterday)) return 'אתמול';

  return formatHebrewDate(timestamp);
}

/**
 * Check if a date is today
 */
export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is within the next N days
 */
export function isWithinDays(timestamp: number, days: number): boolean {
  const date = new Date(timestamp);
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  return date >= now && date <= future;
}

/**
 * Generate a unique ID for entities
 * Uses timestamp + random suffix for uniqueness
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage with rounding
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Sleep for a specified duration (useful for testing/delays)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
