/**
 * Tests for lib/retry.ts
 *
 * Covers retry logic with exponential backoff.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retry, withRetry } from './retry';
import { ApiError } from './errors';

// Mock the sleep function to avoid actual delays in tests
vi.mock('./utils', () => ({
  sleep: vi.fn(() => Promise.resolve())
}));

// Mock logger to avoid console output in tests
vi.mock('./logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError('Rate limited', { statusCode: 429 }))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries up to maxRetries times', async () => {
    const rateLimitError = new ApiError('Rate limited', { statusCode: 429 });
    const fn = vi.fn().mockRejectedValue(rateLimitError);

    await expect(retry(fn, { maxRetries: 3 })).rejects.toThrow('Rate limited');
    expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Validation failed'));

    await expect(retry(fn)).rejects.toThrow('Validation failed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx server errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError('Server error', { statusCode: 500 }))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 502 bad gateway', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError('Bad gateway', { statusCode: 502 }))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 503 service unavailable', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError('Service unavailable', { statusCode: 503 }))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
  });

  it('retries on rate limit message', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('rate limit exceeded'))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on quota exceeded message', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('quota exceeded'))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
  });

  it('retries on timeout message', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('request timeout'))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
  });

  it('retries on network error message', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
  });

  it('retries on temporarily unavailable message', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('service temporarily unavailable'))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
  });

  it('retries on resource exhausted message', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('resource exhausted'))
      .mockResolvedValueOnce('success');

    const result = await retry(fn);

    expect(result).toBe('success');
  });

  it('uses custom shouldRetry predicate', async () => {
    const customError = new Error('Custom retryable');
    const fn = vi.fn()
      .mockRejectedValueOnce(customError)
      .mockResolvedValueOnce('success');

    const result = await retry(fn, {
      shouldRetry: (error) => error instanceof Error && error.message.includes('Custom')
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('respects maxRetries option', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError('Error', { statusCode: 500 }));

    await expect(retry(fn, { maxRetries: 1 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  it('handles zero maxRetries', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError('Error', { statusCode: 500 }));

    await expect(retry(fn, { maxRetries: 0 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1); // Just initial, no retries
  });

  it('does not retry 4xx errors (except 429)', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError('Not found', { statusCode: 404 }));

    await expect(retry(fn)).rejects.toThrow('Not found');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry 400 bad request', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError('Bad request', { statusCode: 400 }));

    await expect(retry(fn)).rejects.toThrow('Bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry 401 unauthorized', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError('Unauthorized', { statusCode: 401 }));

    await expect(retry(fn)).rejects.toThrow('Unauthorized');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry 403 forbidden', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError('Forbidden', { statusCode: 403 }));

    await expect(retry(fn)).rejects.toThrow('Forbidden');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a retryable function', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const retryableFn = withRetry(fn);

    const result = await retryableFn();

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to wrapped function', async () => {
    const fn = vi.fn((a: number, b: string) => Promise.resolve(`${a}-${b}`));
    const retryableFn = withRetry(fn);

    const result = await retryableFn(42, 'test');

    expect(result).toBe('42-test');
    expect(fn).toHaveBeenCalledWith(42, 'test');
  });

  it('retries with options', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError('Error', { statusCode: 500 }))
      .mockResolvedValueOnce('success');

    const retryableFn = withRetry(fn, { maxRetries: 2 });
    const result = await retryableFn();

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('preserves function type', async () => {
    const fn = async (x: number): Promise<number> => x * 2;
    const retryableFn = withRetry(fn);

    const result = await retryableFn(5);

    expect(result).toBe(10);
    expect(typeof result).toBe('number');
  });
});
