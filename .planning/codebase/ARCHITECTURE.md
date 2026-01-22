# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Multi-Tenant React SPA with Context-Based State Management and Real-Time Sync

**Key Characteristics:**
- Single-page application using React 18 with HashRouter for client-side routing
- Firebase Firestore for multi-tenant data persistence with real-time subscriptions
- Centralized state management via React Context API (`store.tsx`)
- Service layer pattern isolating business logic from UI components
- AI-powered features using Google Gemini API with retry/error handling

## Layers

**Presentation Layer:**
- Purpose: React components rendering UI and handling user interactions
- Location: `pages/`, `components/`, `games/`
- Contains: Page components, reusable UI components, game modules
- Depends on: Store Context (via `useStore` hook), custom hooks, services indirectly
- Used by: React Router navigation system

**State Management Layer:**
- Purpose: Centralized application state with Firebase real-time synchronization
- Location: `store.tsx`
- Contains: React Context Provider, Firestore subscription management, action dispatchers
- Depends on: Services layer for all data operations, Firebase SDK
- Used by: All page and component consumers via `useStore()` hook
- Pattern: Context API with real-time listeners (`onSnapshot`)

**Business Logic Layer (Services):**
- Purpose: Domain logic, external integrations, data transformations
- Location: `services/`
- Contains: Firebase CRUD operations, AI generation, authentication, file storage
- Depends on: Firebase SDK, Gemini AI SDK, utility libraries (`lib/`)
- Used by: Store layer for data operations, custom hooks for specific features
- Modules: `authService`, `geminiService`, `childrenService`, `sessionsService`, `testsService`, `subjectsService`, `evaluationsService`, `familyService`, `parentService`, `inviteService`, `pinService`, `storageService`, `dictationService`, `statsService`

**Custom Hooks Layer:**
- Purpose: Reusable React logic encapsulating stateful behavior
- Location: `hooks/`
- Contains: `useQuizSession`, `useErrorHandler`, `useSpeechSynthesis`, `useConfetti`
- Depends on: Services layer (directly calls Gemini/dictation services), utilities
- Used by: Page components needing complex state management

**Utility Layer:**
- Purpose: Pure functions, error handling, retry logic, configuration
- Location: `lib/`
- Contains: `utils.ts` (date formatting, shuffling), `errors.ts` (typed errors), `retry.ts` (exponential backoff), `logger.ts` (structured logging), `env.ts` (environment validation)
- Depends on: Nothing (pure utilities)
- Used by: All other layers for shared functionality

**Infrastructure Layer:**
- Purpose: External service configuration and initialization
- Location: `firebaseConfig.ts`, environment variables
- Contains: Firebase app initialization, Firestore/Auth instances
- Depends on: Firebase SDK
- Used by: Services layer for database/auth access

## Data Flow

**Initial App Load:**

1. `index.tsx` renders `<App />` wrapped in `<StoreProvider>`
2. Store subscribes to Firebase Auth state via `subscribeToAuthState()`
3. On auth change, store fetches parent/family documents from Firestore
4. Store sets up real-time subscriptions to family-scoped collections (children, sessions, tests, evaluations) and global subjects
5. Components read data from store via `useStore()` hook

**Quiz Generation Flow:**

1. User navigates to `/session/:childId/:subjectId/:topic`
2. `QuizSession` component uses `useQuizSession` hook
3. Hook calls `generateQuizQuestions()` from `geminiService` (with retry logic)
4. Gemini API returns JSON-formatted questions
5. Hook manages local state (current question, answers, score)
6. On completion, hook saves session via `store.addSession()`
7. Store calls `sessionsService.addSession()` which writes to Firestore
8. Store updates child stats via `childrenService.awardPoints()`
9. Firestore real-time listener propagates changes back to all connected clients

**Multi-Tenant Auth Flow:**

1. User clicks "Sign in with Google" → `authService.signInWithGoogle()`
2. Firebase Auth popup returns FirebaseUser
3. Store checks if Parent document exists in Firestore
4. If existing: Load parent and family data
5. If new: Check if super admin (auto-bootstrap) or invite-based (redirect to signup)
6. Store subscribes to family-scoped data using `familyId` filter
7. All operations include `familyId` for tenant isolation

**State Management:**
- Unidirectional data flow: User actions → Store actions → Service calls → Firestore → Real-time listeners → Store state → Component re-render
- No local state mutations of global data (Firestore is source of truth)
- Optimistic updates not implemented (waits for Firestore confirmation)

## Key Abstractions

**StoreContext:**
- Purpose: Global state container with Firebase synchronization
- Examples: `store.tsx` (provider), `useStore()` (consumer hook)
- Pattern: React Context API with real-time subscriptions
- Lifecycle: Subscriptions created on family change, cleaned up on unmount

**Service Functions:**
- Purpose: Encapsulate Firebase operations as pure async functions
- Examples: `addChild()`, `addSession()`, `generateQuizQuestions()`
- Pattern: Async functions returning Promises, throwing typed errors
- Error Handling: All service calls wrapped in try/catch, throw `AppError` subclasses

**Custom Hooks:**
- Purpose: Stateful logic reuse with React lifecycle integration
- Examples: `useQuizSession` (quiz state machine), `useErrorHandler` (async error boundaries)
- Pattern: Return state + actions object interface
- Composition: Hooks can call services directly or other hooks

**Typed Errors:**
- Purpose: Structured error handling with Hebrew user messages
- Examples: `QuizGenerationError`, `AuthenticationError`, `DatabaseError`
- Pattern: Extend `AppError` base class with context metadata
- Usage: `getUserMessage(error)` extracts Hebrew message for UI display

## Entry Points

**Application Entry:**
- Location: `index.tsx`
- Triggers: Browser loads `index.html`
- Responsibilities: Mount React root, wrap app in StrictMode

**App Root:**
- Location: `App.tsx`
- Triggers: Rendered by `index.tsx`
- Responsibilities: Set up ErrorBoundary, provide StoreContext, configure routing

**Router Entry:**
- Location: `App.tsx` → `<Router>` → `<Routes>`
- Triggers: URL changes (browser navigation, Link clicks)
- Responsibilities: Render appropriate page component based on route

**Protected Routes:**
- Location: `App.tsx` → `<ProtectedRoute>` wrapper
- Triggers: Navigation to `/parent/*` or `/admin/*` routes
- Responsibilities: Check auth state, redirect to `/login` if unauthenticated, verify super admin role if required

**Quiz Session Entry:**
- Location: `pages/QuizSession.tsx`
- Triggers: Navigation to `/session/:childId/:subjectId/:topic`
- Responsibilities: Initialize quiz via `useQuizSession`, manage question flow, save results

**Parent Dashboard Entry:**
- Location: `pages/ParentDashboard.tsx`
- Triggers: Navigation to `/parent` (after authentication)
- Responsibilities: Display family overview, child stats, navigation to child details

**Child Dashboard Entry:**
- Location: `pages/ChildDashboard.tsx`
- Triggers: Navigation to `/child` (no auth required)
- Responsibilities: Display child selector (PIN authentication), navigate to subjects/games

## Error Handling

**Strategy:** Layered error handling with graceful degradation

**Patterns:**
- **Service Layer:** All async functions use `try/catch`, throw typed `AppError` subclasses with Hebrew messages
- **Retry Logic:** AI service calls wrapped in `retry()` with exponential backoff (2 retries, 1s initial delay)
- **Error Boundary:** Top-level `<ErrorBoundary>` in `App.tsx` catches unhandled React errors, displays `ErrorFallback` UI
- **Hook-Level:** `useErrorHandler` hook provides `handleAsyncError` wrapper for component-level error handling
- **Fallback Behavior:** Gemini AI failures for non-critical features (recommendations, topic extraction) return default/empty values instead of throwing

**Error Propagation:**
1. Service throws `AppError` subclass (e.g., `QuizGenerationError`)
2. Hook/component catches error, calls `getUserMessage(error)` for Hebrew text
3. UI displays error message in Hebrew with retry/cancel options
4. Critical errors (quiz generation) block progress; non-critical (recommendations) show warnings

## Cross-Cutting Concerns

**Logging:** Structured logging via `logger` (info/warn/error levels), context objects for debugging

**Validation:**
- Type safety enforced via TypeScript interfaces (`types.ts`)
- Firestore security rules provide server-side validation (tenant isolation via `familyId`)
- PIN validation via `pinService.isValidPinFormat()` (4-digit check)
- Invite code validation via `inviteService.validateInviteCode()` (expiry, status checks)

**Authentication:**
- Google OAuth via Firebase Auth (`authService`)
- Real-time auth state subscription in store
- Multi-tenant parent/family association
- Super admin detection via email (`SUPER_ADMIN_EMAIL` constant)
- Child access control via PIN hash (bcrypt) in `pinService`

**Authorization:**
- Protected routes check `parent` state (null = unauthorized)
- Super admin routes check `parent.isSuperAdmin` flag
- Firestore rules enforce tenant isolation (all operations filtered by `familyId`)
- Parent blocking via `parent.blocked` flag (checked in rules)

**Internationalization:**
- Hebrew-first UI (RTL layout throughout)
- English content uses `dir="ltr"` override
- All user-facing strings hardcoded in Hebrew
- Error messages in Hebrew via `getUserMessage()`

**Multi-Tenancy:**
- Every entity (children, sessions, tests, evaluations) has `familyId` field
- Store filters all subscriptions by current family
- Services auto-inject `familyId` from store context
- Family created on parent signup or super admin bootstrap

---

*Architecture analysis: 2026-01-22*
