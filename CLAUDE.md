# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚧 Active Refactoring - See REFACTORING_PROGRESS.md

**Current Status:** Phase 3 Complete, Phase 4 Next (Component Decomposition)

The codebase is undergoing a 7-phase refactoring. See `REFACTORING_PROGRESS.md` for:
- Completed phases (1-3): Foundation, Services, Hooks
- Next: Phase 4 - Split ChildDetails.tsx (1,066 LOC) and HebrewGame.tsx (581 LOC)
- Key patterns established (error handling, hooks, retry)

## Project Overview

Study Buddy (לומדים-בבית) is a Hebrew educational app for Israeli children (grades 1-8). It generates AI-powered quizzes using Google's Gemini API and stores data in Firebase Firestore. The app supports parent dashboards and child learning interfaces with gamification features.

## Development Commands

```bash
npm install    # Install dependencies
npm run dev    # Start development server (Vite)
npm run build  # Production build
npm run preview # Preview production build
npx tsc --noEmit  # TypeScript check
```

## Environment Setup

Create `.env.local` with your Gemini API key:
```
GEMINI_API_KEY=your_gemini_api_key
```

Firebase config is hardcoded in `firebaseConfig.ts` (public Firebase client config).

## Architecture

### New Library Structure (Phase 1-3)

```
lib/                      # Shared utilities
├── utils.ts              # shuffle, formatHebrewDate, generateId, etc.
├── errors.ts             # Typed errors with Hebrew messages
├── env.ts                # Environment validation
├── logger.ts             # Structured logging
├── retry.ts              # Exponential backoff
└── index.ts              # Re-exports

hooks/                    # Custom React hooks
├── useErrorHandler.ts    # Async error handling
├── useSpeechSynthesis.ts # TTS wrapper
├── useQuizSession.ts     # Quiz state management
├── useConfetti.ts        # Celebration effects
└── index.ts              # Re-exports
```

### State Management
- **`store.tsx`** - React Context-based global state with Firestore real-time subscriptions
- Uses `onSnapshot` listeners for live data sync across: children, subjects, sessions, upcomingTests
- Mock authentication (hardcoded admin/admin) with localStorage persistence
- Auto-seeds default subjects and sample children if Firestore is empty

### Data Flow
```
Firebase Firestore ←→ store.tsx (Context) ←→ Pages/Components
                          ↓
                   Gemini AI Service (with retry logic)
```

### Key Services

**`services/geminiService.ts`** - AI-powered quiz generation (refactored):
- Uses `retry()` for exponential backoff
- Throws `QuizGenerationError` / `TopicExtractionError` on failure
- `generateQuizQuestions()` - Creates grade-appropriate Hebrew questions
- `generateExamRecommendations()` - Post-quiz study tips (falls back gracefully)
- `analyzeMistakesAndGenerateTopics()` - Identifies weak areas (falls back gracefully)
- `extractTopicsFromInput()` - Multimodal topic extraction

**`services/dictationService.ts`** - Offline Hebrew word exercises:
- Uses shared `shuffle` from lib
- Recognition mode (audio → pick word)
- Spelling mode (fill missing letter)

### Routing Structure
- `/` - Home
- `/login` - Parent authentication
- `/parent` - Protected parent dashboard
- `/parent/child/:id` - Individual child management (ChildDetails.tsx - 1,066 LOC, needs split)
- `/child` - Child dashboard (no auth required)
- `/session/:childId/:subjectId/:topic` - Quiz session (refactored with useQuizSession hook)

### Hebrew Games Module (`games/`)
`HebrewGame.tsx` (581 LOC - needs split) provides 6 mini-games for early readers:
- Similar vowels (ניקוד matching)
- Picture-word matching
- Missing letter completion
- Opening/closing sound identification
- Speed challenge

Uses Web Audio API for sound effects and Web Speech API for TTS.

### Type Definitions (`types.ts`)
Core interfaces: `ChildProfile`, `Subject`, `QuizQuestion`, `StudySession`, `UpcomingTest`
- Children have per-subject `proficiency` levels (easy/medium/hard)
- `GameSettings` controls vowel filtering, TTS, and speed challenge duration

## UI Patterns

- RTL layout throughout (Hebrew-first)
- Tailwind CSS for styling
- `lucide-react` for icons
- `recharts` for analytics charts
- `react-confetti` for gamification rewards
- English subject content uses `dir="ltr"` override
- ErrorBoundary wraps entire app for graceful error handling

## Firebase Collections

- `children` - Child profiles with stars/streak gamification
- `subjects` - Available subjects with topics
- `sessions` - Completed study sessions with questions/answers
- `upcomingTests` - Scheduled tests (quiz or dictation type)

## Key Patterns

### Error Handling
```typescript
// Services throw typed errors
throw new QuizGenerationError('message', { cause: error });

// UI uses getUserMessage() for Hebrew messages
const message = getUserMessage(error);
```

### Hooks Pattern
```typescript
const quiz = useQuizSession({ child, subject, topic, ... });
// Returns: questions, score, handleAnswer, nextQuestion, loadQuestions, etc.
```

### Retry Pattern
```typescript
return retry(async () => {
  // API call that might fail
}, { maxRetries: 2, context: 'functionName' });
```
