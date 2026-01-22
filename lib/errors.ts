/**
 * Custom error classes for Study Buddy
 *
 * These provide typed errors with user-friendly Hebrew messages
 * for different failure scenarios in the application.
 */

/**
 * Base error class for all application errors
 * Includes both a technical message and a user-friendly Hebrew message
 */
export class AppError extends Error {
  /** Hebrew message safe to show to users */
  readonly userMessage: string;
  /** Original error if this wraps another error */
  readonly cause?: Error;
  /** Whether this error is recoverable (user can retry) */
  readonly recoverable: boolean;

  constructor(
    message: string,
    userMessage: string,
    options: { cause?: Error; recoverable?: boolean } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.userMessage = userMessage;
    this.cause = options.cause;
    this.recoverable = options.recoverable ?? true;
  }
}

/**
 * Error thrown when API calls fail
 */
export class ApiError extends AppError {
  readonly statusCode?: number;

  constructor(
    message: string,
    options: { cause?: Error; statusCode?: number; recoverable?: boolean } = {}
  ) {
    const userMessage = getApiErrorMessage(options.statusCode);
    super(message, userMessage, options);
    this.name = 'ApiError';
    this.statusCode = options.statusCode;
  }
}

/**
 * Error thrown when quiz generation fails
 */
export class QuizGenerationError extends AppError {
  constructor(message: string, options: { cause?: Error } = {}) {
    super(
      message,
      'אופס! לא הצלחנו ליצור שאלות כרגע. נסו שוב בעוד רגע.',
      { ...options, recoverable: true }
    );
    this.name = 'QuizGenerationError';
  }
}

/**
 * Error thrown when topic extraction fails
 */
export class TopicExtractionError extends AppError {
  constructor(message: string, options: { cause?: Error } = {}) {
    super(
      message,
      'לא הצלחנו לזהות את הנושאים. נסו להזין אותם ידנית.',
      { ...options, recoverable: true }
    );
    this.name = 'TopicExtractionError';
  }
}

/**
 * Error thrown when evaluation document analysis fails
 */
export class EvaluationAnalysisError extends AppError {
  constructor(message: string, options: { cause?: Error } = {}) {
    super(
      message,
      'לא הצלחנו לנתח את המסמך. נסו להעלות תמונה ברורה יותר או להזין את הנתונים ידנית.',
      { ...options, recoverable: true }
    );
    this.name = 'EvaluationAnalysisError';
  }
}

/**
 * Error thrown when Firebase operations fail
 */
export class DatabaseError extends AppError {
  constructor(message: string, options: { cause?: Error } = {}) {
    super(
      message,
      'בעיה בשמירת הנתונים. בדקו את החיבור לאינטרנט ונסו שוב.',
      { ...options, recoverable: true }
    );
    this.name = 'DatabaseError';
  }
}

/**
 * Error thrown when profile update operations fail
 */
export class ProfileUpdateError extends AppError {
  constructor(message: string, options: { cause?: Error } = {}) {
    super(
      message,
      'לא הצלחנו לעדכן את הפרופיל. הנתונים נשמרו בכל מקרה.',
      { ...options, recoverable: true }
    );
    this.name = 'ProfileUpdateError';
  }
}

/**
 * Error thrown when required environment variables are missing
 */
export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(
      message,
      'האפליקציה לא מוגדרת נכון. פנו למנהל המערכת.',
      { recoverable: false }
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown for authentication failures
 */
export class AuthError extends AppError {
  constructor(message: string, options: { cause?: Error } = {}) {
    super(
      message,
      'שם המשתמש או הסיסמה שגויים.',
      { ...options, recoverable: true }
    );
    this.name = 'AuthError';
  }
}

/**
 * Error thrown for Google authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string, options: { cause?: Error } = {}) {
    super(
      message,
      'ההתחברות נכשלה. נסו שוב.',
      { ...options, recoverable: true }
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when invite validation fails
 */
export class InviteError extends AppError {
  constructor(message: string, userMessage: string, options: { cause?: Error } = {}) {
    super(message, userMessage, { ...options, recoverable: false });
    this.name = 'InviteError';
  }
}

/**
 * Error thrown when PIN validation fails
 */
export class PinError extends AppError {
  readonly attemptsRemaining?: number;

  constructor(message: string, attemptsRemaining?: number) {
    const userMessage = attemptsRemaining !== undefined
      ? `קוד שגוי. נותרו ${attemptsRemaining} ניסיונות.`
      : 'קוד שגוי. נסו שוב.';
    super(message, userMessage, { recoverable: true });
    this.name = 'PinError';
    this.attemptsRemaining = attemptsRemaining;
  }
}

/**
 * Error thrown when required data is not found
 */
export class NotFoundError extends AppError {
  readonly entityType: string;

  constructor(entityType: string, id?: string) {
    const message = id
      ? `${entityType} with id "${id}" not found`
      : `${entityType} not found`;

    super(
      message,
      'המידע המבוקש לא נמצא. נסו לרענן את הדף.',
      { recoverable: true }
    );
    this.name = 'NotFoundError';
    this.entityType = entityType;
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(
      message,
      'יש שגיאה בנתונים שהוזנו. בדקו ונסו שוב.',
      { recoverable: true }
    );
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Helper function to get user-friendly API error messages
function getApiErrorMessage(statusCode?: number): string {
  switch (statusCode) {
    case 401:
    case 403:
      return 'אין הרשאה לבצע פעולה זו.';
    case 404:
      return 'המידע המבוקש לא נמצא.';
    case 429:
      return 'יותר מדי בקשות. חכו רגע ונסו שוב.';
    case 500:
    case 502:
    case 503:
      return 'השרת לא זמין כרגע. נסו שוב בעוד רגע.';
    default:
      return 'משהו השתבש. נסו שוב.';
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Get a user-friendly message from any error
 */
export function getUserMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    // Don't expose technical messages to users
    return 'משהו השתבש. נסו שוב.';
  }
  return 'אירעה שגיאה לא צפויה.';
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverable(error: unknown): boolean {
  if (isAppError(error)) {
    return error.recoverable;
  }
  // Default to recoverable for unknown errors
  return true;
}
