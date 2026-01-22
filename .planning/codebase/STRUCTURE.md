# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
Study Buddy/
├── .claude/               # Claude Code configuration
├── .firebase/             # Firebase deployment artifacts
├── .github/               # GitHub Actions workflows
├── .planning/             # Planning documents (REFACTORING_PROGRESS.md, codebase/)
├── components/            # Reusable UI components
├── constants/             # Static data (avatars, default subjects)
├── coverage/              # Test coverage reports
├── dist/                  # Production build output (generated)
├── games/                 # Hebrew learning games module
├── hooks/                 # Custom React hooks
├── lib/                   # Shared utilities and error handling
├── node_modules/          # Dependencies (generated)
├── pages/                 # Page components (routes)
├── public/                # Static assets
├── services/              # Business logic and external integrations
├── tests/                 # Test setup and mocks
├── App.tsx                # Root component with routing
├── index.tsx              # Application entry point
├── store.tsx              # Global state management (Context API)
├── types.ts               # TypeScript type definitions
├── firebaseConfig.ts      # Firebase initialization
├── constants.ts           # App-wide constants (moved to constants/)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
└── firebase.json          # Firebase hosting configuration
```

## Directory Purposes

**`components/`:**
- Purpose: Reusable UI components used across multiple pages
- Contains: Button, Layout, ErrorBoundary, LoadingSkeleton, AvatarPicker, PINPad, FamilyEditModal, ErrorFallback
- Key files: `Button.tsx` (styled button variants), `Layout.tsx` (app shell with navigation), `ErrorBoundary.tsx` (error catching)

**`pages/`:**
- Purpose: Top-level page components mapped to routes
- Contains: Home, LoginPage, SignupPage, ParentDashboard, ChildDashboard, QuizSession, AdminDashboard, InviteManager, ChildDetails/, ParentSettings/
- Key files: `QuizSession.tsx` (quiz interface), `ParentDashboard.tsx` (family overview), `ChildDashboard.tsx` (child subject selection)
- Subdirectories: `ChildDetails/` (tabs for child analysis), `ParentSettings/` (family settings pages)

**`pages/ChildDetails/`:**
- Purpose: Child detail page with tab-based views (1,066 LOC in `index.tsx` - needs decomposition per Phase 4)
- Contains: `index.tsx` (container), `AnalysisTab.tsx`, `PlanTab.tsx`, `GamesTab.tsx`, `HistoryTab.tsx`, `EvaluationsTab.tsx`, `SettingsTab.tsx`, `types.ts`, `components/` (sub-components)
- Key files: `index.tsx` (lazy-loads tabs), `EvaluationsTab.tsx` (OCR analysis), `PlanTab.tsx` (test scheduling)

**`pages/ParentSettings/`:**
- Purpose: Family settings and child management
- Contains: `index.tsx` (settings hub), `AddChildPage.tsx`, `EditChildPage.tsx`
- Key files: `index.tsx` (family profile, parent management), `AddChildPage.tsx` (child creation form)

**`services/`:**
- Purpose: Business logic, Firebase operations, external API integrations
- Contains: 14 service modules + tests (authService, geminiService, childrenService, sessionsService, testsService, subjectsService, evaluationsService, familyService, parentService, inviteService, pinService, storageService, dictationService, statsService)
- Key files: `geminiService.ts` (AI quiz generation), `authService.ts` (Google OAuth), `childrenService.ts` (child CRUD), `index.ts` (barrel exports)

**`hooks/`:**
- Purpose: Custom React hooks for reusable stateful logic
- Contains: `useQuizSession.ts`, `useErrorHandler.ts`, `useSpeechSynthesis.ts`, `useConfetti.ts`, `index.ts`
- Key files: `useQuizSession.ts` (quiz state machine with 300+ LOC), `useErrorHandler.ts` (async error wrapper)

**`lib/`:**
- Purpose: Pure utility functions and shared infrastructure
- Contains: `utils.ts`, `errors.ts`, `retry.ts`, `logger.ts`, `env.ts`, `index.ts`
- Key files: `errors.ts` (typed error classes with Hebrew messages), `retry.ts` (exponential backoff), `utils.ts` (shuffle, date formatting)

**`games/`:**
- Purpose: Hebrew reading mini-games for early learners
- Contains: `HebrewGame/` (main game module), `hebrewData.ts` (word lists)
- Key files: `HebrewGame/index.tsx` (581 LOC - needs decomposition per Phase 4), `HebrewGame/generators.ts` (question generation), `HebrewGame/audio.ts` (sound effects)

**`games/HebrewGame/`:**
- Purpose: Self-contained game engine with 6 game types
- Contains: `index.tsx`, `types.ts`, `generators.ts`, `audio.ts`, `hooks/useGameState.ts`
- Key files: `generators.ts` (game question generation), `useGameState.ts` (game state management)

**`constants/`:**
- Purpose: Static configuration data
- Contains: `avatars.ts` (child avatar emoji list), `index.ts`
- Key files: `avatars.ts` (exported as `AVATARS` array)

**`tests/`:**
- Purpose: Test infrastructure
- Contains: `setup.ts` (Vitest config), `mocks/firebase.ts`, `mocks/gemini.ts`
- Key files: `setup.ts` (global test setup with jsdom)

**`.planning/`:**
- Purpose: Project planning and refactoring documentation
- Contains: `REFACTORING_PROGRESS.md`, `codebase/` (this directory)
- Key files: `REFACTORING_PROGRESS.md` (7-phase refactoring tracker)

## Key File Locations

**Entry Points:**
- `index.tsx`: React root mount point
- `App.tsx`: Application shell with routing and ErrorBoundary
- `store.tsx`: Global state provider

**Configuration:**
- `firebaseConfig.ts`: Firebase app initialization (hardcoded config)
- `vite.config.ts`: Build configuration with Gemini API key injection
- `tsconfig.json`: TypeScript compiler options
- `package.json`: Dependencies and npm scripts
- `.env.local`: Gemini API key (not committed, see `.env.local.example`)

**Core Logic:**
- `services/geminiService.ts`: AI-powered quiz generation (primary business logic)
- `services/authService.ts`: Google authentication wrapper
- `hooks/useQuizSession.ts`: Quiz session state machine
- `types.ts`: All TypeScript interfaces and enums

**Testing:**
- `*.test.ts` files: Vitest unit tests (co-located with services/hooks/lib)
- `tests/setup.ts`: Test environment configuration
- `vitest.config.ts`: Test runner configuration (referenced in `vite.config.ts`)

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `ParentDashboard.tsx`, `Button.tsx`)
- Services/hooks/utilities: `camelCase.ts` (e.g., `geminiService.ts`, `useQuizSession.ts`)
- Test files: `*.test.ts` pattern (e.g., `geminiService.test.ts`)
- Type definitions: `types.ts` (central file at root)
- Barrel exports: `index.ts` (in `services/`, `hooks/`, `lib/`)

**Directories:**
- Lowercase with hyphens for multi-word: Not used (single-word directories preferred)
- PascalCase for component subdirectories: `ChildDetails/`, `ParentSettings/`, `HebrewGame/`
- lowercase for utility directories: `services/`, `hooks/`, `lib/`, `components/`, `pages/`

**Components:**
- Page components: `{Name}Page.tsx` or `{Name}Dashboard.tsx` (e.g., `LoginPage.tsx`, `ParentDashboard.tsx`)
- Reusable components: `{Name}.tsx` (e.g., `Button.tsx`, `Layout.tsx`)
- Tab components: `{Name}Tab.tsx` (e.g., `AnalysisTab.tsx`, `PlanTab.tsx`)

**Services:**
- Service files: `{domain}Service.ts` (e.g., `authService.ts`, `geminiService.ts`)
- Export functions as named exports (not default)

**Hooks:**
- Hook files: `use{Name}.ts` (e.g., `useQuizSession.ts`, `useErrorHandler.ts`)
- Export hook as named export

## Where to Add New Code

**New Feature:**
- Primary code: `pages/{FeatureName}.tsx` for new route, or extend existing page
- Business logic: `services/{featureName}Service.ts` if Firebase/API integration needed
- Reusable UI: `components/{ComponentName}.tsx` if used in multiple pages
- Tests: Co-locate `*.test.ts` next to service/hook/lib file

**New Component/Module:**
- Implementation: `components/{ComponentName}.tsx` for shared UI
- Page-specific: `pages/{PageName}/{ComponentName}.tsx` for single-use components
- Complex modules: Create subdirectory `pages/{Feature}/` with `index.tsx` + sub-components

**Utilities:**
- Shared helpers: `lib/utils.ts` (add function + export in `lib/index.ts`)
- Error types: `lib/errors.ts` (create new error class extending `AppError`)
- Constants: `constants/{category}.ts` or `constants.ts` (deprecated, use subdirectory)

**New Service:**
- Firebase operations: `services/{domain}Service.ts`
- Export functions in `services/index.ts` for convenience
- Add corresponding test file: `services/{domain}Service.test.ts`

**New Hook:**
- Custom hook: `hooks/use{Name}.ts`
- Export in `hooks/index.ts`
- Add tests: `hooks/use{Name}.test.ts`

**New Type:**
- Global types: Add to `types.ts` (single source of truth)
- Module-specific: Create `{module}/types.ts` if very specific (e.g., `pages/ChildDetails/types.ts`)

**New Game:**
- Game logic: `games/{GameName}/` subdirectory with `index.tsx`, `types.ts`, `generators.ts`
- Integrate into: `games/HebrewGame/index.tsx` or create new route

## Special Directories

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes (via `npm run build`)
- Committed: No (in `.gitignore`)
- Contents: Bundled JS/CSS, optimized assets, `index.html`

**`node_modules/`:**
- Purpose: npm package dependencies
- Generated: Yes (via `npm install`)
- Committed: No (in `.gitignore`)

**`coverage/`:**
- Purpose: Test coverage reports (HTML + JSON)
- Generated: Yes (via `npm run test:coverage`)
- Committed: No (in `.gitignore`)
- View: Open `coverage/index.html` in browser

**`.firebase/`:**
- Purpose: Firebase deployment cache
- Generated: Yes (via `firebase deploy`)
- Committed: No

**`.claude/`:**
- Purpose: Claude Code local configuration
- Generated: By Claude Code CLI
- Committed: Partial (`settings.local.json` in `.gitignore`, `CLAUDE.md` committed)

**`.planning/`:**
- Purpose: Development planning documents
- Generated: Manually or via GSD commands
- Committed: Yes
- Contents: `REFACTORING_PROGRESS.md`, `codebase/` (architecture docs)

**`.github/`:**
- Purpose: GitHub Actions CI/CD workflows
- Generated: Manually or via GitHub tools
- Committed: Yes
- Contents: `workflows/` (e.g., code review automation)

---

*Structure analysis: 2026-01-22*
