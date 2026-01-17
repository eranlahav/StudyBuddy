/**
 * Hook for declarative error handling in components
 *
 * Provides a consistent way to handle async operations with
 * loading states, error handling, and retry capabilities.
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '../lib/logger';
import { getUserMessage, isRecoverable } from '../lib/errors';

export interface AsyncState<T> {
  /** The data returned by the async operation */
  data: T | null;
  /** Whether the operation is in progress */
  isLoading: boolean;
  /** The error if the operation failed */
  error: Error | null;
  /** User-friendly error message (Hebrew) */
  errorMessage: string | null;
  /** Whether the error is recoverable (can retry) */
  canRetry: boolean;
}

export interface UseErrorHandlerReturn<T> extends AsyncState<T> {
  /** Execute the async operation */
  execute: () => Promise<T | null>;
  /** Retry the last failed operation */
  retry: () => Promise<T | null>;
  /** Reset the state (clear error and data) */
  reset: () => void;
  /** Set data manually (useful for optimistic updates) */
  setData: (data: T | null) => void;
}

export interface UseErrorHandlerOptions {
  /** Context for logging */
  logContext?: string;
  /** Callback when operation succeeds */
  onSuccess?: () => void;
  /** Callback when operation fails */
  onError?: (error: Error) => void;
}

/**
 * Hook for handling async operations with error handling
 *
 * @example
 * const {
 *   data: questions,
 *   isLoading,
 *   error,
 *   errorMessage,
 *   execute,
 *   retry
 * } = useErrorHandler(
 *   () => generateQuizQuestions(subject, topic, grade),
 *   { logContext: 'QuizSession' }
 * );
 *
 * useEffect(() => { execute(); }, []);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <InlineError error={error} onRetry={retry} />;
 * return <QuizQuestions questions={questions} />;
 */
export function useErrorHandler<T>(
  asyncFn: () => Promise<T>,
  options: UseErrorHandlerOptions = {}
): UseErrorHandlerReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null,
    errorMessage: null,
    canRetry: false
  });

  // Store the async function ref so retry works correctly
  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;

  const execute = useCallback(async (): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      errorMessage: null
    }));

    try {
      const result = await asyncFnRef.current();
      setState({
        data: result,
        isLoading: false,
        error: null,
        errorMessage: null,
        canRetry: false
      });
      options.onSuccess?.();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      logger.error(
        `${options.logContext || 'useErrorHandler'}: Operation failed`,
        {},
        error
      );

      setState({
        data: null,
        isLoading: false,
        error,
        errorMessage: getUserMessage(error),
        canRetry: isRecoverable(error)
      });

      options.onError?.(error);
      return null;
    }
  }, [options.logContext, options.onSuccess, options.onError]);

  const retry = useCallback(async (): Promise<T | null> => {
    logger.info(`${options.logContext || 'useErrorHandler'}: Retrying operation`);
    return execute();
  }, [execute, options.logContext]);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      errorMessage: null,
      canRetry: false
    });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    execute,
    retry,
    reset,
    setData
  };
}

/**
 * Simpler hook for handling errors imperatively
 *
 * @example
 * const { handleError, clearError, error, errorMessage } = useErrorState();
 *
 * const handleSubmit = async () => {
 *   try {
 *     await submitForm();
 *   } catch (err) {
 *     handleError(err);
 *   }
 * };
 */
export function useErrorState() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((err: unknown, context?: string) => {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(context || 'useErrorState', {}, error);
    setError(error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    errorMessage: error ? getUserMessage(error) : null,
    canRetry: error ? isRecoverable(error) : false,
    handleError,
    clearError
  };
}
