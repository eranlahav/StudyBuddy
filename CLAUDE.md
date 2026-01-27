# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ✅ v1.0 Shipped — Ready for v1.1

**Current Status:** v1.0 "Adaptive Learning Profiles" complete (2026-01-24)

The project has completed both the 7-phase refactoring AND the v1.0 milestone. See `.planning/` for details:
- `.planning/STATE.md` - Current project state
- `.planning/MILESTONES.md` - Shipped milestones
- `.planning/milestones/v1.0-AUDIT.md` - Full audit report

**Suggested v1.1 enhancements** (from tech debt):
- Parent notes UI (`processParentNoteSignal` exists but no UI)
- Prerequisite display (`detectPrerequisites` exists but not wired to UI)
- Mobile responsiveness improvements

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

### Library Structure

```
lib/                        # Shared utilities & algorithms
├── utils.ts                # shuffle, formatHebrewDate, generateId, etc.
├── errors.ts               # Typed errors with Hebrew messages
├── env.ts                  # Environment validation
├── logger.ts               # Structured logging
├── retry.ts                # Exponential backoff
├── learnerModel.ts         # BKT algorithm (Bayesian Knowledge Tracing)
├── forgettingCurve.ts      # Ebbinghaus decay + SM-2 scheduling
├── signalWeights.ts        # Evidence hierarchy (eval/quiz/engagement/parent)
├── engagementDetector.ts   # Session behavior analysis (rushing, avoidance)
├── analytics.ts            # Profile analytics computations
├── encouragement.ts        # Hebrew encouragement messages
├── ocrUtils.ts             # Image text extraction utilities
└── index.ts                # Re-exports

hooks/                      # Custom React hooks
├── useErrorHandler.ts      # Async error handling
├── useSpeechSynthesis.ts   # TTS wrapper
├── useQuizSession.ts       # Quiz state management
├── useConfetti.ts          # Celebration effects
├── useLearnerProfile.ts    # Profile state with real-time subscription
├── useRecommendations.ts   # Multi-factor topic recommendations
└── index.ts                # Re-exports

services/                   # Business logic & Firebase CRUD
├── profileService.ts       # LearnerProfile CRUD (Firestore subcollection)
├── signalService.ts        # Multi-signal profile updates (quiz, eval, engagement)
├── goalsService.ts         # Parent learning goals (30% recommendation weight)
├── alertService.ts         # Regression detection with 14-day cooldown
├── adaptiveQuizService.ts  # Difficulty mixing (20/50/30 review/target/weak)
├── recommendationService.ts # Multi-factor scoring (mastery/urgency/goals)
├── probeScheduler.ts       # SM-2 spaced repetition for mastered topics
├── prerequisiteService.ts  # AI-powered topic dependency detection
├── geminiService.ts        # AI quiz generation
├── dictationService.ts     # Hebrew word exercises
├── childrenService.ts      # Child profile CRUD
├── sessionsService.ts      # Quiz session history
├── testsService.ts         # Upcoming test management
└── ...                     # Additional Firebase services
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
