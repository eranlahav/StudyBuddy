<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Study Buddy (לומדים-בבית)

A Hebrew educational app for Israeli children (grades 1-8) featuring AI-powered quizzes, interactive Hebrew games, and parent dashboards with analytics.

## Features

- **AI-Powered Quizzes**: Generate grade-appropriate questions using Google Gemini API
- **Hebrew Games**: 6 mini-games for early readers (vowels, phonics, vocabulary)
- **Parent Dashboard**: Track progress, schedule tests, analyze performance
- **Child Dashboard**: Fun learning interface with gamification (stars, streaks)
- **Real-time Sync**: Firebase Firestore for live data updates

## Quick Start

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Set your Gemini API key
echo "GEMINI_API_KEY=your_key_here" > .env.local

# Start development server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |

## Architecture

### Directory Structure

```
/Study Buddy/
├── lib/                        # Core utilities
│   ├── utils.ts               # Shuffle, date formatting, IDs
│   ├── errors.ts              # Custom error classes with Hebrew messages
│   ├── logger.ts              # Structured logging
│   ├── retry.ts               # Exponential backoff for API calls
│   └── env.ts                 # Environment validation
│
├── hooks/                      # Custom React hooks
│   ├── useQuizSession.ts      # Quiz state management
│   ├── useConfetti.ts         # Celebration effects
│   ├── useSpeechSynthesis.ts  # Text-to-speech wrapper
│   └── useErrorHandler.ts     # Declarative error handling
│
├── services/                   # Data layer
│   ├── geminiService.ts       # AI quiz generation (with retry)
│   ├── dictationService.ts    # Offline dictation exercises
│   ├── childrenService.ts     # Children CRUD + Firestore
│   ├── sessionsService.ts     # Study sessions CRUD
│   ├── testsService.ts        # Upcoming tests CRUD
│   └── subjectsService.ts     # Subjects CRUD
│
├── pages/                      # Page components
│   ├── ChildDetails/          # Split into lazy-loaded tabs
│   │   ├── index.tsx          # Container with Suspense
│   │   ├── AnalysisTab.tsx    # Performance charts (memoized)
│   │   ├── PlanTab.tsx        # Test scheduling
│   │   ├── GamesTab.tsx       # Hebrew game settings
│   │   ├── HistoryTab.tsx     # Session history
│   │   └── SettingsTab.tsx    # Child settings
│   ├── QuizSession.tsx        # Quiz interface
│   ├── ChildDashboard.tsx     # Child learning hub
│   └── ParentDashboard.tsx    # Parent management
│
├── games/                      # Hebrew games
│   └── HebrewGame/            # Modular game system
│       ├── index.tsx          # Game orchestrator
│       ├── generators.ts      # Question generators
│       ├── audio.ts           # Sound effects
│       └── hooks/useGameState.ts
│
├── components/                 # Shared UI
│   ├── ErrorBoundary.tsx      # React error boundary
│   ├── ErrorFallback.tsx      # Hebrew error UI
│   ├── LoadingSkeleton.tsx    # Loading states
│   ├── Button.tsx             # Reusable button
│   └── Layout.tsx             # Page layout
│
├── tests/                      # Test infrastructure
│   ├── setup.ts               # Vitest setup
│   └── mocks/                 # Firebase & Gemini mocks
│
├── store.tsx                  # React Context + Firestore subscriptions
├── types.ts                   # TypeScript interfaces
└── firebaseConfig.ts          # Firebase initialization
```

### Key Patterns

**Error Handling**
```typescript
// Services throw typed errors
throw new QuizGenerationError('message', { cause: originalError });

// Components use getUserMessage() for Hebrew UI
const message = getUserMessage(error); // "אופס! לא הצלחנו ליצור שאלות כרגע."
```

**Retry Logic**
```typescript
// Automatic retry with exponential backoff
return retry(async () => {
  const response = await ai.models.generateContent({...});
  return JSON.parse(response.text);
}, { maxRetries: 2, context: 'generateQuiz' });
```

**Lazy Loading**
```typescript
// Tab components are code-split
const AnalysisTab = lazy(() => import('./AnalysisTab'));

// With loading skeleton
<Suspense fallback={<TabSkeleton />}>
  {activeTab === 'analysis' && <AnalysisTab {...props} />}
</Suspense>
```

**Memoization**
```typescript
// Expensive chart components are memoized
const ProgressChart = React.memo<Props>(({ data }) => (
  <ResponsiveContainer>
    <LineChart data={data} />
  </ResponsiveContainer>
));
```

### Data Flow

```
Firebase Firestore
       ↓
   Services (CRUD + subscriptions)
       ↓
   store.tsx (React Context)
       ↓
   Pages/Components
       ↓
   Gemini AI (quiz generation)
```

## Testing

Tests use **Vitest** with jsdom environment:

```bash
# Run all tests
npm run test:run

# Watch mode
npm test

# Coverage report
npm run test:coverage
```

**Coverage targets:**
- `lib/` - 82%+ (utilities, errors, retry logic)
- `hooks/` - Core hooks tested (useConfetti: 100%)

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build**: Vite 6
- **Database**: Firebase Firestore
- **AI**: Google Gemini API
- **Charts**: Recharts
- **Testing**: Vitest, Testing Library
- **Icons**: Lucide React

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features |

Firebase config is in `firebaseConfig.ts` (public client config).

## Firebase Collections

| Collection | Description |
|------------|-------------|
| `children` | Child profiles with gamification stats |
| `subjects` | Available subjects with topics |
| `sessions` | Completed study sessions |
| `upcomingTests` | Scheduled tests (quiz or dictation) |

## License

Private project - All rights reserved
