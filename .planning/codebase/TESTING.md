# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Runner:**
- Vitest 4.0.17
- Config: `vite.config.ts` (test section lines 24-35)

**Assertion Library:**
- Vitest built-in `expect`
- `@testing-library/jest-dom` 6.9.1 for DOM matchers

**Run Commands:**
```bash
npm test                  # Run tests in watch mode
npm run test:run          # Run tests once
npm run test:coverage     # Run with coverage report
```

## Test File Organization

**Location:**
- Co-located with source files (not in separate test directory)
- `lib/*.test.ts` - Library utility tests
- `hooks/*.test.ts` - React hook tests
- `services/*.test.ts` - Service layer tests

**Naming:**
- Pattern: `{sourceName}.test.ts` (e.g., `utils.test.ts`, `geminiService.test.ts`)
- All test files use `.test.ts` extension
- React hook tests use `.test.ts` (not `.test.tsx`)

**Structure:**
```
lib/
├── utils.ts
├── utils.test.ts
├── errors.ts
├── errors.test.ts
└── retry.ts
    └── retry.test.ts

hooks/
├── useErrorHandler.ts
├── useErrorHandler.test.ts
└── useQuizSession.ts
    └── useQuizSession.test.ts

services/
├── geminiService.ts
├── geminiService.test.ts
└── authService.ts
    └── authService.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
/**
 * Tests for lib/utils.ts
 *
 * Covers all utility functions with edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shuffle, formatHebrewDate, generateId } from './utils';

describe('shuffle', () => {
  it('returns an array of the same length', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const original = [...input];
    shuffle(input);
    expect(input).toEqual(original);
  });
});

describe('formatHebrewDate', () => {
  it('formats a date in Hebrew locale', () => {
    const timestamp = new Date(2026, 0, 15).getTime();
    const result = formatHebrewDate(timestamp);
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });
});
```

**Patterns:**
- One `describe` block per function/hook
- Descriptive test names using plain language
- Tests focus on behavior, not implementation
- Edge cases explicitly tested (empty arrays, null values, boundary conditions)

## Mocking

**Framework:** Vitest `vi` API

**Global Mocks:**
```typescript
// tests/setup.ts - Configured to run before all tests

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Web Speech API
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
  },
});

// Mock AudioContext for sound effects
class MockAudioContext {
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  // ... other methods
}
global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
```

**Module Mocking:**
```typescript
// Pattern 1: Mock with state for per-test control
const mockState = {
  generateContentResponse: null as unknown,
  generateContentError: null as Error | null,
};

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: vi.fn(async () => {
        if (mockState.generateContentError) {
          throw mockState.generateContentError;
        }
        return mockState.generateContentResponse;
      }),
    };
  }
  return { GoogleGenAI: MockGoogleGenAI };
});

// Pattern 2: Partial mock preserving real implementation
vi.mock('../lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib')>();
  return {
    ...actual,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});
```

**What to Mock:**
- External APIs (Gemini AI, Firebase)
- Browser APIs (localStorage, Web Speech, AudioContext)
- Logger (to reduce test output noise)
- Time-dependent functions (using `vi.useFakeTimers()`)

**What NOT to Mock:**
- Pure utility functions under test
- Simple type definitions
- Constants

## Fixtures and Factories

**Test Data:**
```typescript
// Inline test data at top of test file
const mockQuizQuestions: QuizQuestion[] = [
  {
    questionText: 'מה הוא 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctAnswerIndex: 1,
    explanation: '2 + 2 = 4',
    difficulty: 'easy',
  },
  // More questions...
];

const mockChild: ChildProfile = {
  id: 'child-1',
  familyId: 'family-1',
  name: 'דני',
  avatar: 'cat',
  grade: 'כיתה ג\'' as GradeLevel,
  stars: 10,
  subjects: ['math-1'],
  proficiency: { 'math-1': 'medium' },
  // ... other fields
};

// Factory pattern for variations
const createDefaultOptions = (overrides?: Partial<UseQuizSessionOptions>): UseQuizSessionOptions => ({
  child: mockChild,
  subject: mockSubject,
  topic: 'חיבור',
  upcomingTests: [],
  onComplete: vi.fn(),
  ...overrides
});
```

**Location:**
- Test fixtures defined at top of test file
- Shared mocks in `tests/mocks/` directory:
  - `tests/mocks/firebase.ts` - Firebase mock setup
  - `tests/mocks/gemini.ts` - Gemini API mocks

## Coverage

**Requirements:** No minimum enforced

**Configuration:**
```typescript
// vite.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['lib/**', 'hooks/**', 'services/**'],
  exclude: ['**/node_modules/**', '**/tests/**']
}
```

**View Coverage:**
```bash
npm run test:coverage
```

**Coverage Scope:**
- Includes: `lib/`, `hooks/`, `services/`
- Excludes: `node_modules/`, `tests/`, components (not yet tested)

## Test Types

**Unit Tests:**
- All current tests are unit tests
- Focus: Individual functions, hooks, services
- Mocks: External dependencies fully mocked
- Location: Co-located with source (`*.test.ts` files)
- Examples:
  - `lib/utils.test.ts` - Pure utility functions
  - `lib/retry.test.ts` - Retry logic with fake timers
  - `services/geminiService.test.ts` - AI service with mocked API

**Integration Tests:**
- Not currently implemented
- Would test: Service interactions, Firebase operations, multi-step workflows

**E2E Tests:**
- Not implemented
- No Playwright, Cypress, or similar framework configured

## Common Patterns

**Async Testing:**
```typescript
// Pattern 1: async/await with expect
it('generates quiz questions successfully', async () => {
  const questions = await generateQuizQuestions(
    'מתמטיקה',
    'חיבור',
    'כיתה ג' as GradeLevel,
    5,
    'medium'
  );

  expect(questions).toHaveLength(2);
  expect(questions[0].questionText).toBe('מה הוא 2 + 2?');
});

// Pattern 2: Testing rejected promises
it('throws QuizGenerationError when API key not configured', async () => {
  mockHasApiKey = false;

  await expect(
    generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
  ).rejects.toThrow(QuizGenerationError);
});
```

**Error Testing:**
```typescript
// Testing typed errors
it('throws QuizGenerationError on empty response', async () => {
  mockState.generateContentResponse = { text: '' };

  await expect(
    generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
  ).rejects.toThrow(QuizGenerationError);
});

// Testing error messages
it('returns user-friendly error message', async () => {
  mockState.generateContentError = new Error('API Error');

  await expect(
    generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
  ).rejects.toThrow('API key not configured');
});
```

**React Hook Testing:**
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';

it('executes async operation and updates state', async () => {
  const { result } = renderHook(() =>
    useErrorHandler(() => Promise.resolve('success'), {
      logContext: 'TestComponent'
    })
  );

  expect(result.current.isLoading).toBe(false);

  await act(async () => {
    await result.current.execute();
  });

  expect(result.current.data).toBe('success');
  expect(result.current.error).toBe(null);
});
```

**Time-Based Testing:**
```typescript
// Use fake timers for time-dependent code
beforeEach(() => {
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

it('resolves after specified time', async () => {
  const sleepPromise = sleep(1000);
  vi.advanceTimersByTime(1000);
  await sleepPromise;
  expect(true).toBe(true);
});
```

**Cleanup Patterns:**
```typescript
// Always clean up mocks and timers
beforeEach(() => {
  vi.clearAllMocks();
  mockHasApiKey = true;
  mockState.generateContentError = null;
});

afterEach(() => {
  mockState.generateContentResponse = null;
  mockState.generateContentError = null;
  vi.useRealTimers(); // If using fake timers
});
```

## Test Maintenance

**Setup File:**
- `tests/setup.ts` runs before all tests
- Sets up global mocks (localStorage, Web Speech, AudioContext)
- Imports `@testing-library/jest-dom` for DOM matchers
- Configured in `vite.config.ts`: `setupFiles: ['./tests/setup.ts']`

**Mock Organization:**
- Simple mocks: Inline at top of test file
- Complex mocks: Separate files in `tests/mocks/`
- Reusable mock state: Shared object pattern

**Test Isolation:**
- Each test is independent
- `beforeEach` resets mock state
- `vi.clearAllMocks()` clears call history
- Fake timers cleaned up in `afterEach`

---

*Testing analysis: 2026-01-22*
