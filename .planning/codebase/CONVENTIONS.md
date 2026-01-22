# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- TypeScript source files use `.ts` or `.tsx` extensions
- React components: PascalCase (e.g., `Button.tsx`, `ErrorBoundary.tsx`)
- Services/utilities: camelCase (e.g., `geminiService.ts`, `authService.ts`)
- Test files: Same name as source with `.test.ts` suffix (e.g., `utils.test.ts`)
- Configuration: lowercase with extension (e.g., `vite.config.ts`, `tsconfig.json`)
- Index files: `index.ts` or `index.tsx` for module re-exports

**Functions:**
- Services: camelCase verbs (e.g., `generateQuizQuestions`, `signInWithGoogle`, `subscribeToAuthState`)
- React hooks: camelCase with `use` prefix (e.g., `useErrorHandler`, `useQuizSession`, `useSpeechSynthesis`)
- React components: PascalCase (e.g., `Button`, `Layout`, `AvatarPicker`)
- Utility functions: camelCase verbs (e.g., `shuffle`, `formatHebrewDate`, `calculatePercentage`)

**Variables:**
- camelCase for local variables (e.g., `mockQuestions`, `userAnswers`, `correctCount`)
- camelCase for constants with specific values (e.g., `googleProvider`, `mockState`)
- UPPER_SNAKE_CASE for exported constants (e.g., `SUPER_ADMIN_EMAIL`, `DEFAULT_RECOMMENDATIONS`)
- Descriptive names: `AI_RETRY_OPTIONS`, `DEFAULT_OPTIONS`

**Types:**
- PascalCase for interfaces/types (e.g., `ChildProfile`, `QuizQuestion`, `Parent`, `Family`)
- PascalCase for enums (e.g., `GradeLevel`, `InviteStatus`)
- Literal types: lowercase (e.g., `'easy' | 'medium' | 'hard'`)
- Type suffixes: `Props` for React component props, `Options` for configuration objects, `Return` for hook return types

## Code Style

**Formatting:**
- No formatter detected (no `.prettierrc` or `.eslintrc` found)
- Indentation: 2 spaces (observed in all source files)
- String quotes: Single quotes for imports and strings, double quotes in JSX attributes
- Semicolons: Used consistently
- Line length: Not enforced, but typically under 100 characters

**Linting:**
- No linter configuration detected
- TypeScript strict mode not enforced (see `tsconfig.json`)
- `skipLibCheck: true` in TypeScript config

## Import Organization

**Order:**
1. External libraries (React, Firebase, third-party packages)
2. Type imports (using `type` keyword when importing types only)
3. Internal modules (services, lib, hooks)
4. Relative imports (components, utilities)
5. Type definitions

**Examples:**
```typescript
// External
import { useState, useCallback } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// Type imports
import type { ChildProfile, Subject } from '../types';

// Internal lib
import { logger, retry, QuizGenerationError } from '../lib';

// Services
import { generateQuizQuestions } from '../services/geminiService';
```

**Path Aliases:**
- `@/*` alias configured in `tsconfig.json` and `vite.config.ts`
- Points to project root: `@/` resolves to `/Users/i306072/Documents/GitHub/Study Buddy/`
- Rarely used in practice; most imports use relative paths

## Error Handling

**Patterns:**
- Custom error hierarchy extending `AppError` base class
- All custom errors include:
  - Hebrew `userMessage` for display to users
  - Optional `cause` for error chaining
  - `recoverable` flag to indicate if user can retry
- Error classes: `QuizGenerationError`, `TopicExtractionError`, `AuthenticationError`, `DatabaseError`, `ValidationError`, `NotFoundError`, `PinError`, `InviteError`

**Service Layer:**
```typescript
// Services throw typed errors
throw new QuizGenerationError('Failed to generate', { cause: error });
throw new AuthenticationError('Sign-in failed', { cause: error as Error });
```

**UI Layer:**
```typescript
// UI uses getUserMessage() for Hebrew messages
import { getUserMessage, isRecoverable } from '../lib/errors';

const errorMessage = getUserMessage(error);
const canRetry = isRecoverable(error);
```

**Hooks Pattern:**
```typescript
// useErrorHandler provides declarative error handling
const { data, isLoading, error, errorMessage, execute, retry } = useErrorHandler(
  () => generateQuizQuestions(subject, topic, grade),
  { logContext: 'QuizSession' }
);
```

## Logging

**Framework:** Custom logger in `lib/logger.ts`

**Patterns:**
```typescript
// Structured logging with context
logger.info('Quiz started', { childId: '123', topic: 'fractions' });
logger.error('Failed to generate quiz', { subject, topic }, error);

// Child logger for component-scoped logging
const log = logger.child({ component: 'QuizSession', childId: '123' });
log.info('Quiz started'); // Automatically includes component and childId
```

**Log Levels:**
- `logger.debug()` - Only shown in development
- `logger.info()` - General events
- `logger.warn()` - Potential issues, includes optional error
- `logger.error()` - Failures, includes optional error
- `logger.logError()` - Convenience for catch blocks

**Output:**
- Development: Colorful console output with collapsible error details
- Production: Structured JSON for log aggregation

## Comments

**When to Comment:**
- File-level JSDoc blocks describing module purpose
- Complex algorithms (e.g., exponential backoff in `lib/retry.ts`)
- Business logic explanations (e.g., AI prompt construction in `services/geminiService.ts`)
- Public API documentation for exported functions
- Configuration rationale (e.g., Firebase setup in `firebaseConfig.ts`)

**JSDoc/TSDoc:**
```typescript
/**
 * Generate quiz questions using Gemini AI
 *
 * @throws {QuizGenerationError} If question generation fails after retries
 *
 * @example
 * const questions = await generateQuizQuestions('מתמטיקה', 'שברים', GradeLevel.Grade4, 5, 'medium');
 */
export async function generateQuizQuestions(
  subject: string,
  topic: string,
  grade: GradeLevel,
  count: number = 5,
  difficultyLevel: DifficultyLevel = 'medium'
): Promise<QuizQuestion[]> {
  // Implementation
}
```

**Inline Comments:**
- Used sparingly for non-obvious logic
- Hebrew comments occasionally used in prompts sent to AI
- Prefer self-documenting code over comments

## Function Design

**Size:**
- Services: 50-150 lines typical for main functions
- Helpers: 10-30 lines
- React components vary widely (some needing decomposition per `REFACTORING_PROGRESS.md`)

**Parameters:**
- Positional parameters for required values
- Options objects for 3+ optional parameters
- Default parameter values inline or in const objects
```typescript
// Default options pattern
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'context' | 'shouldRetry'>> = {
  maxRetries: 2,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};
```

**Return Values:**
- Explicit return types on all exported functions
- Async functions return `Promise<T>`
- Hooks return objects with named properties (not tuples)
```typescript
// Hook return type pattern
export interface UseErrorHandlerReturn<T> extends AsyncState<T> {
  execute: () => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}
```

## Module Design

**Exports:**
- Named exports preferred over default exports
- Barrel files (`index.ts`) re-export from modules
```typescript
// lib/index.ts
export * from './utils';
export * from './errors';
export * from './logger';
export * from './retry';
export * from './env';
```

**Organization:**
- Services in `services/` directory
- Hooks in `hooks/` directory
- Shared utilities in `lib/` directory
- Components in `components/` directory
- Types in root `types.ts` file

**Barrel Files:**
- Used in `lib/`, `hooks/`, `constants/` for convenient importing
- Allow `import { logger, retry, getUserMessage } from '../lib'`

## React Patterns

**Component Props:**
```typescript
// Extend HTML attributes for flexibility
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'fun';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

// Destructure with defaults
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  // Implementation
};
```

**Hooks Usage:**
- Custom hooks for reusable logic (`useErrorHandler`, `useQuizSession`)
- `useCallback` for stable function references
- `useRef` for mutable values that don't trigger re-renders
- `useState` with functional updates when based on previous state

## TypeScript Patterns

**Type Safety:**
- Interfaces for object shapes
- Type aliases for unions and primitives
- Enum for fixed string sets (`GradeLevel`)
- Generic types for reusable patterns (`AsyncState<T>`)

**Type Guards:**
```typescript
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
```

**Async/Await:**
- Preferred over promise chains
- Try-catch blocks for error handling
- Retry wrapper for transient failures

---

*Convention analysis: 2026-01-22*
