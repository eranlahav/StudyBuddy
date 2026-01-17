/**
 * Centralized logging for Study Buddy
 *
 * Provides consistent logging with context, log levels,
 * and error serialization for debugging.
 */

import { isAppError } from './errors';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    userMessage?: string;
    stack?: string;
    cause?: string;
  };
}

/**
 * Check if we're in development mode
 */
function isDev(): boolean {
  return import.meta.env?.MODE === 'development';
}

/**
 * Serialize an error for logging
 */
function serializeError(error: unknown): LogEntry['error'] | undefined {
  if (!error) return undefined;

  if (isAppError(error)) {
    return {
      name: error.name,
      message: error.message,
      userMessage: error.userMessage,
      stack: error.stack,
      cause: error.cause?.message
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    name: 'UnknownError',
    message: String(error)
  };
}

/**
 * Format a log entry for console output
 */
function formatForConsole(entry: LogEntry): string[] {
  const parts: string[] = [`[${entry.level.toUpperCase()}] ${entry.message}`];

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context, null, 2));
  }

  return parts;
}

/**
 * Get the console method for a log level
 */
function getConsoleMethod(level: LogLevel): typeof console.log {
  switch (level) {
    case 'debug':
      return console.debug;
    case 'info':
      return console.info;
    case 'warn':
      return console.warn;
    case 'error':
      return console.error;
    default:
      return console.log;
  }
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error: serializeError(error)
  };

  const consoleMethod = getConsoleMethod(level);
  const formatted = formatForConsole(entry);

  // In development, use colorful console output
  if (isDev()) {
    consoleMethod(...formatted);
    if (entry.error) {
      console.groupCollapsed('Error details');
      console.log(entry.error);
      console.groupEnd();
    }
  } else {
    // In production, log structured JSON (useful for log aggregation)
    consoleMethod(JSON.stringify(entry));
  }
}

/**
 * Logger instance with convenience methods
 *
 * @example
 * logger.info('Quiz started', { childId: '123', topic: 'fractions' });
 * logger.error('Failed to generate quiz', { topic }, error);
 */
export const logger = {
  /**
   * Debug-level logging (only shown in development)
   */
  debug(message: string, context?: LogContext): void {
    if (isDev()) {
      log('debug', message, context);
    }
  },

  /**
   * Info-level logging for general events
   */
  info(message: string, context?: LogContext): void {
    log('info', message, context);
  },

  /**
   * Warning-level logging for potential issues
   */
  warn(message: string, context?: LogContext, error?: unknown): void {
    log('warn', message, context, error);
  },

  /**
   * Error-level logging for failures
   */
  error(message: string, context?: LogContext, error?: unknown): void {
    log('error', message, context, error);
  },

  /**
   * Log an error with automatic context extraction
   * Convenience method for catch blocks
   */
  logError(error: unknown, message?: string, context?: LogContext): void {
    const errorMessage = message || (isAppError(error) ? error.message : 'An error occurred');
    log('error', errorMessage, context, error);
  },

  /**
   * Create a child logger with preset context
   * Useful for component-scoped logging
   *
   * @example
   * const log = logger.child({ component: 'QuizSession', childId: '123' });
   * log.info('Quiz started'); // Automatically includes component and childId
   */
  child(baseContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext, error?: unknown) =>
        logger.warn(message, { ...baseContext, ...context }, error),
      error: (message: string, context?: LogContext, error?: unknown) =>
        logger.error(message, { ...baseContext, ...context }, error),
      logError: (error: unknown, message?: string, context?: LogContext) =>
        logger.logError(error, message, { ...baseContext, ...context })
    };
  }
};
