/**
 * User-friendly error fallback component (Hebrew)
 *
 * Displays error messages in a friendly way for children/parents
 * with options to retry or navigate away.
 */

import React from 'react';
import { getUserMessage, isRecoverable } from '../lib/errors';
import { Button } from './Button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error boundary and retry */
  resetErrorBoundary?: () => void;
  /** Optional custom title */
  title?: string;
  /** Whether to show the home button */
  showHomeButton?: boolean;
}

/**
 * Friendly error display component
 *
 * Shows a Hebrew error message with retry/home options.
 * Used both by ErrorBoundary and for inline error states.
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  title,
  showHomeButton = true
}) => {
  const userMessage = getUserMessage(error);
  const canRetry = isRecoverable(error) && resetErrorBoundary;

  const handleGoHome = () => {
    window.location.href = '/child';
  };

  return (
    <div
      className="min-h-[50vh] flex items-center justify-center p-6"
      dir="rtl"
      role="alert"
    >
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border-2 border-red-100">
        {/* Error Icon */}
        <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-800 mb-3">
          {title || 'אופס! משהו השתבש'}
        </h1>

        {/* User-friendly message */}
        <p className="text-slate-600 mb-6 text-lg">
          {userMessage}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canRetry && (
            <Button
              onClick={resetErrorBoundary}
              variant="primary"
              size="lg"
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              נסו שוב
            </Button>
          )}

          {showHomeButton && (
            <Button
              onClick={handleGoHome}
              variant="ghost"
              size="lg"
              className="flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              חזרה הביתה
            </Button>
          )}
        </div>

        {/* Technical details (development only) */}
        {import.meta.env?.MODE === 'development' && (
          <details className="mt-8 text-right">
            <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-600">
              פרטים טכניים (למפתחים)
            </summary>
            <pre
              className="mt-2 p-4 bg-slate-100 rounded-lg text-xs text-slate-700 overflow-auto max-h-40 text-left"
              dir="ltr"
            >
              {error.name}: {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

/**
 * Inline error display for smaller error states
 * Use this for errors within components (e.g., failed API calls)
 */
export const InlineError: React.FC<{
  error: Error;
  onRetry?: () => void;
}> = ({ error, onRetry }) => {
  const userMessage = getUserMessage(error);
  const canRetry = isRecoverable(error) && onRetry;

  return (
    <div
      className="bg-red-50 border border-red-200 rounded-xl p-4 text-center"
      dir="rtl"
      role="alert"
    >
      <p className="text-red-700 mb-3">{userMessage}</p>
      {canRetry && (
        <button
          onClick={onRetry}
          className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center justify-center gap-1 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          נסו שוב
        </button>
      )}
    </div>
  );
};
