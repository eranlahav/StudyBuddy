/**
 * Tests for lib/errors.ts
 *
 * Covers all custom error classes and helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  ApiError,
  QuizGenerationError,
  TopicExtractionError,
  DatabaseError,
  ConfigurationError,
  AuthError,
  NotFoundError,
  ValidationError,
  isAppError,
  getUserMessage,
  isRecoverable
} from './errors';

describe('AppError', () => {
  it('creates error with message and userMessage', () => {
    const error = new AppError('Technical message', 'User message');
    expect(error.message).toBe('Technical message');
    expect(error.userMessage).toBe('User message');
    expect(error.name).toBe('AppError');
  });

  it('defaults to recoverable true', () => {
    const error = new AppError('msg', 'user msg');
    expect(error.recoverable).toBe(true);
  });

  it('accepts recoverable option', () => {
    const recoverable = new AppError('msg', 'user', { recoverable: true });
    const notRecoverable = new AppError('msg', 'user', { recoverable: false });
    expect(recoverable.recoverable).toBe(true);
    expect(notRecoverable.recoverable).toBe(false);
  });

  it('accepts cause option', () => {
    const cause = new Error('Original error');
    const error = new AppError('msg', 'user', { cause });
    expect(error.cause).toBe(cause);
  });

  it('is an instance of Error', () => {
    const error = new AppError('msg', 'user');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('ApiError', () => {
  it('sets name to ApiError', () => {
    const error = new ApiError('API call failed');
    expect(error.name).toBe('ApiError');
  });

  it('includes statusCode', () => {
    const error = new ApiError('Failed', { statusCode: 404 });
    expect(error.statusCode).toBe(404);
  });

  it('provides Hebrew message for 401', () => {
    const error = new ApiError('Unauthorized', { statusCode: 401 });
    expect(error.userMessage).toBe('אין הרשאה לבצע פעולה זו.');
  });

  it('provides Hebrew message for 403', () => {
    const error = new ApiError('Forbidden', { statusCode: 403 });
    expect(error.userMessage).toBe('אין הרשאה לבצע פעולה זו.');
  });

  it('provides Hebrew message for 404', () => {
    const error = new ApiError('Not found', { statusCode: 404 });
    expect(error.userMessage).toBe('המידע המבוקש לא נמצא.');
  });

  it('provides Hebrew message for 429', () => {
    const error = new ApiError('Too many requests', { statusCode: 429 });
    expect(error.userMessage).toBe('יותר מדי בקשות. חכו רגע ונסו שוב.');
  });

  it('provides Hebrew message for 500', () => {
    const error = new ApiError('Server error', { statusCode: 500 });
    expect(error.userMessage).toBe('השרת לא זמין כרגע. נסו שוב בעוד רגע.');
  });

  it('provides Hebrew message for 502', () => {
    const error = new ApiError('Bad gateway', { statusCode: 502 });
    expect(error.userMessage).toBe('השרת לא זמין כרגע. נסו שוב בעוד רגע.');
  });

  it('provides Hebrew message for 503', () => {
    const error = new ApiError('Service unavailable', { statusCode: 503 });
    expect(error.userMessage).toBe('השרת לא זמין כרגע. נסו שוב בעוד רגע.');
  });

  it('provides generic Hebrew message for unknown status codes', () => {
    const error = new ApiError('Unknown error', { statusCode: 418 });
    expect(error.userMessage).toBe('משהו השתבש. נסו שוב.');
  });

  it('provides generic Hebrew message when no status code', () => {
    const error = new ApiError('Unknown error');
    expect(error.userMessage).toBe('משהו השתבש. נסו שוב.');
  });
});

describe('QuizGenerationError', () => {
  it('sets name to QuizGenerationError', () => {
    const error = new QuizGenerationError('Failed to generate');
    expect(error.name).toBe('QuizGenerationError');
  });

  it('provides Hebrew user message', () => {
    const error = new QuizGenerationError('Failed');
    expect(error.userMessage).toBe('אופס! לא הצלחנו ליצור שאלות כרגע. נסו שוב בעוד רגע.');
  });

  it('is recoverable', () => {
    const error = new QuizGenerationError('Failed');
    expect(error.recoverable).toBe(true);
  });

  it('accepts cause', () => {
    const cause = new Error('API error');
    const error = new QuizGenerationError('Failed', { cause });
    expect(error.cause).toBe(cause);
  });
});

describe('TopicExtractionError', () => {
  it('sets name to TopicExtractionError', () => {
    const error = new TopicExtractionError('Failed to extract');
    expect(error.name).toBe('TopicExtractionError');
  });

  it('provides Hebrew user message', () => {
    const error = new TopicExtractionError('Failed');
    expect(error.userMessage).toBe('לא הצלחנו לזהות את הנושאים. נסו להזין אותם ידנית.');
  });

  it('is recoverable', () => {
    const error = new TopicExtractionError('Failed');
    expect(error.recoverable).toBe(true);
  });
});

describe('DatabaseError', () => {
  it('sets name to DatabaseError', () => {
    const error = new DatabaseError('Write failed');
    expect(error.name).toBe('DatabaseError');
  });

  it('provides Hebrew user message', () => {
    const error = new DatabaseError('Failed');
    expect(error.userMessage).toBe('בעיה בשמירת הנתונים. בדקו את החיבור לאינטרנט ונסו שוב.');
  });

  it('is recoverable', () => {
    const error = new DatabaseError('Failed');
    expect(error.recoverable).toBe(true);
  });
});

describe('ConfigurationError', () => {
  it('sets name to ConfigurationError', () => {
    const error = new ConfigurationError('Missing API key');
    expect(error.name).toBe('ConfigurationError');
  });

  it('provides Hebrew user message', () => {
    const error = new ConfigurationError('Missing config');
    expect(error.userMessage).toBe('האפליקציה לא מוגדרת נכון. פנו למנהל המערכת.');
  });

  it('is NOT recoverable', () => {
    const error = new ConfigurationError('Missing config');
    expect(error.recoverable).toBe(false);
  });
});

describe('AuthError', () => {
  it('sets name to AuthError', () => {
    const error = new AuthError('Invalid credentials');
    expect(error.name).toBe('AuthError');
  });

  it('provides Hebrew user message', () => {
    const error = new AuthError('Failed');
    expect(error.userMessage).toBe('שם המשתמש או הסיסמה שגויים.');
  });

  it('is recoverable', () => {
    const error = new AuthError('Failed');
    expect(error.recoverable).toBe(true);
  });
});

describe('NotFoundError', () => {
  it('sets name to NotFoundError', () => {
    const error = new NotFoundError('Child');
    expect(error.name).toBe('NotFoundError');
  });

  it('includes entity type in message', () => {
    const error = new NotFoundError('Child', '123');
    expect(error.message).toBe('Child with id "123" not found');
    expect(error.entityType).toBe('Child');
  });

  it('handles missing id', () => {
    const error = new NotFoundError('Subject');
    expect(error.message).toBe('Subject not found');
  });

  it('provides Hebrew user message', () => {
    const error = new NotFoundError('Child');
    expect(error.userMessage).toBe('המידע המבוקש לא נמצא. נסו לרענן את הדף.');
  });

  it('is recoverable', () => {
    const error = new NotFoundError('Child');
    expect(error.recoverable).toBe(true);
  });
});

describe('ValidationError', () => {
  it('sets name to ValidationError', () => {
    const error = new ValidationError('Invalid input');
    expect(error.name).toBe('ValidationError');
  });

  it('includes field name', () => {
    const error = new ValidationError('Invalid email', 'email');
    expect(error.field).toBe('email');
  });

  it('handles missing field', () => {
    const error = new ValidationError('Invalid');
    expect(error.field).toBeUndefined();
  });

  it('provides Hebrew user message', () => {
    const error = new ValidationError('Invalid');
    expect(error.userMessage).toBe('יש שגיאה בנתונים שהוזנו. בדקו ונסו שוב.');
  });

  it('is recoverable', () => {
    const error = new ValidationError('Invalid');
    expect(error.recoverable).toBe(true);
  });
});

describe('isAppError', () => {
  it('returns true for AppError', () => {
    expect(isAppError(new AppError('msg', 'user'))).toBe(true);
  });

  it('returns true for subclasses', () => {
    expect(isAppError(new ApiError('msg'))).toBe(true);
    expect(isAppError(new QuizGenerationError('msg'))).toBe(true);
    expect(isAppError(new DatabaseError('msg'))).toBe(true);
    expect(isAppError(new ConfigurationError('msg'))).toBe(true);
    expect(isAppError(new AuthError('msg'))).toBe(true);
    expect(isAppError(new NotFoundError('Entity'))).toBe(true);
    expect(isAppError(new ValidationError('msg'))).toBe(true);
    expect(isAppError(new TopicExtractionError('msg'))).toBe(true);
  });

  it('returns false for standard Error', () => {
    expect(isAppError(new Error('msg'))).toBe(false);
  });

  it('returns false for non-errors', () => {
    expect(isAppError('string')).toBe(false);
    expect(isAppError(123)).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError({ message: 'fake error' })).toBe(false);
  });
});

describe('getUserMessage', () => {
  it('returns userMessage for AppError', () => {
    const error = new QuizGenerationError('Technical');
    expect(getUserMessage(error)).toBe('אופס! לא הצלחנו ליצור שאלות כרגע. נסו שוב בעוד רגע.');
  });

  it('returns generic message for standard Error', () => {
    const error = new Error('Technical error');
    expect(getUserMessage(error)).toBe('משהו השתבש. נסו שוב.');
  });

  it('returns unexpected error message for non-errors', () => {
    expect(getUserMessage('string')).toBe('אירעה שגיאה לא צפויה.');
    expect(getUserMessage(null)).toBe('אירעה שגיאה לא צפויה.');
    expect(getUserMessage(undefined)).toBe('אירעה שגיאה לא צפויה.');
  });
});

describe('isRecoverable', () => {
  it('returns true for recoverable AppErrors', () => {
    expect(isRecoverable(new QuizGenerationError('msg'))).toBe(true);
    expect(isRecoverable(new DatabaseError('msg'))).toBe(true);
    expect(isRecoverable(new AuthError('msg'))).toBe(true);
  });

  it('returns false for non-recoverable AppErrors', () => {
    expect(isRecoverable(new ConfigurationError('msg'))).toBe(false);
  });

  it('defaults to true for unknown errors', () => {
    expect(isRecoverable(new Error('msg'))).toBe(true);
    expect(isRecoverable('string')).toBe(true);
    expect(isRecoverable(null)).toBe(true);
  });
});
