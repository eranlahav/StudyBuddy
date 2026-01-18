/**
 * Tests for hooks/useErrorHandler.ts
 *
 * Tests the error handling hooks: useErrorHandler and useErrorState.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler, useErrorState } from './useErrorHandler';
import { QuizGenerationError, ConfigurationError } from '../lib/errors';

// Mock the logger to avoid console noise
vi.mock('../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with correct initial state', () => {
      const asyncFn = vi.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.canRetry).toBe(false);
    });
  });

  describe('execute', () => {
    it('sets isLoading to true during execution', async () => {
      let resolvePromise: (value: string) => void;
      const asyncFn = vi.fn().mockImplementation(() =>
        new Promise<string>((resolve) => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useErrorHandler(asyncFn));

      act(() => {
        result.current.execute();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!('data');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets data on successful execution', async () => {
      const asyncFn = vi.fn().mockResolvedValue('test data');
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('test data');
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('returns the result from execute', async () => {
      const asyncFn = vi.fn().mockResolvedValue('returned value');
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      let returnedValue: string | null = null;
      await act(async () => {
        returnedValue = await result.current.execute();
      });

      expect(returnedValue).toBe('returned value');
    });

    it('calls onSuccess callback on success', async () => {
      const onSuccess = vi.fn();
      const asyncFn = vi.fn().mockResolvedValue('data');
      const { result } = renderHook(() =>
        useErrorHandler(asyncFn, { onSuccess })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('sets error state on failure', async () => {
      const error = new Error('Test error');
      const asyncFn = vi.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(error);
      expect(result.current.errorMessage).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    it('returns null on failure', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      let returnedValue: string | null = 'not null';
      await act(async () => {
        returnedValue = await result.current.execute();
      });

      expect(returnedValue).toBeNull();
    });

    it('calls onError callback on failure', async () => {
      const onError = vi.fn();
      const error = new Error('Test error');
      const asyncFn = vi.fn().mockRejectedValue(error);
      const { result } = renderHook(() =>
        useErrorHandler(asyncFn, { onError })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('converts non-Error throws to Error objects', async () => {
      const asyncFn = vi.fn().mockRejectedValue('string error');
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('string error');
    });

    it('clears previous error on new execution', async () => {
      const asyncFn = vi.fn()
        .mockRejectedValueOnce(new Error('first error'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() => useErrorHandler(asyncFn));

      // First call fails
      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.error).toBeTruthy();

      // Second call succeeds
      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBe('success');
    });
  });

  describe('retry', () => {
    it('calls execute again', async () => {
      const asyncFn = vi.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      await act(async () => {
        await result.current.execute();
      });
      expect(asyncFn).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.retry();
      });
      expect(asyncFn).toHaveBeenCalledTimes(2);
    });

    it('uses the latest async function reference', async () => {
      let counter = 0;
      const asyncFn1 = vi.fn().mockImplementation(() => {
        counter++;
        return Promise.resolve(`call ${counter}`);
      });

      const { result, rerender } = renderHook(
        ({ fn }) => useErrorHandler(fn),
        { initialProps: { fn: asyncFn1 } }
      );

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('call 1');

      await act(async () => {
        await result.current.retry();
      });
      expect(result.current.data).toBe('call 2');
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      const asyncFn = vi.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('data');

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.canRetry).toBe(false);
    });
  });

  describe('setData', () => {
    it('allows manual data setting', () => {
      const asyncFn = vi.fn().mockResolvedValue('async data');
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      act(() => {
        result.current.setData('manual data');
      });

      expect(result.current.data).toBe('manual data');
    });

    it('can set data to null', async () => {
      const asyncFn = vi.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('data');

      act(() => {
        result.current.setData(null);
      });
      expect(result.current.data).toBeNull();
    });
  });

  describe('canRetry with error types', () => {
    it('sets canRetry true for recoverable errors (QuizGenerationError)', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new QuizGenerationError('Quiz failed'));
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.canRetry).toBe(true);
    });

    it('sets canRetry false for non-recoverable errors (ConfigurationError)', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new ConfigurationError('Bad config'));
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.canRetry).toBe(false);
    });

    it('sets canRetry true for generic Error (defaults to recoverable)', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('Generic error'));
      const { result } = renderHook(() => useErrorHandler(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      // Unknown errors default to recoverable
      expect(result.current.canRetry).toBe(true);
    });
  });

  describe('logContext option', () => {
    it('uses logContext in logging', async () => {
      const { logger } = await import('../lib/logger');
      const asyncFn = vi.fn().mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() =>
        useErrorHandler(asyncFn, { logContext: 'TestComponent' })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'TestComponent: Operation failed',
        expect.anything(),
        expect.any(Error)
      );
    });
  });
});

describe('useErrorState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with no error', () => {
      const { result } = renderHook(() => useErrorState());

      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.canRetry).toBe(false);
    });
  });

  describe('handleError', () => {
    it('sets error from Error object', () => {
      const { result } = renderHook(() => useErrorState());
      const error = new Error('Test error');

      act(() => {
        result.current.handleError(error);
      });

      expect(result.current.error).toBe(error);
      expect(result.current.errorMessage).toBeTruthy();
    });

    it('converts non-Error to Error', () => {
      const { result } = renderHook(() => useErrorState());

      act(() => {
        result.current.handleError('string error');
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('string error');
    });

    it('sets canRetry true for recoverable errors', () => {
      const { result } = renderHook(() => useErrorState());

      act(() => {
        result.current.handleError(new QuizGenerationError('Quiz failed'));
      });

      expect(result.current.canRetry).toBe(true);
    });

    it('sets canRetry false for non-recoverable errors', () => {
      const { result } = renderHook(() => useErrorState());

      act(() => {
        result.current.handleError(new ConfigurationError('Bad config'));
      });

      expect(result.current.canRetry).toBe(false);
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      const { result } = renderHook(() => useErrorState());

      act(() => {
        result.current.handleError(new Error('error'));
      });
      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.canRetry).toBe(false);
    });
  });
});
