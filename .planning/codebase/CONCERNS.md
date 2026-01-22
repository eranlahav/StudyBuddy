# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Multi-tenant Security Implementation:**
- Issue: Family-scoped data filtering relies on client-side filters as backup to Firestore rules
- Files: `store.tsx` lines 240-266, 285-288
- Impact: Client-side filtering (e.g., `childrenData.filter(c => c.familyId === familyId)`) is a secondary defense. If Firestore rules are misconfigured, data could leak between families
- Fix approach: Audit Firestore security rules to ensure server-side enforcement is primary defense. Add integration tests verifying cross-family isolation

**Hardcoded Firebase Credentials:**
- Issue: Firebase API keys and project config hardcoded in source
- Files: `firebaseConfig.ts` lines 7-14
- Impact: API keys exposed in version control and client bundles. While Firebase client keys are public by design, best practice is environment-based config
- Fix approach: Move config to environment variables, use Vite's import.meta.env pattern

**Exposed Gemini API Key:**
- Issue: API key committed to repository
- Files: `.env` line 1, `.env.production`
- Impact: Critical security issue - API key visible in Git history, could be used maliciously
- Fix approach: Immediately rotate API key, add .env* to .gitignore, use CI/CD secrets for production

**Super Admin Hardcoded:**
- Issue: Super admin email hardcoded in types
- Files: `types.ts` line 57 - `export const SUPER_ADMIN_EMAIL = 'lahavfamily02@gmail.com'`
- Impact: Cannot change admin without code deployment, admin email visible in client bundle
- Fix approach: Move to environment variable or Firestore config, implement role-based admin system

**Web Speech API Browser Compatibility:**
- Issue: No graceful degradation for browsers lacking speech synthesis
- Files: `hooks/useSpeechSynthesis.ts` lines 61-72, `games/HebrewGame/audio.ts`
- Impact: Hebrew TTS fails silently on Safari iOS < 14.5, older Firefox. Users get no feedback when audio doesn't work
- Fix approach: Add visual fallback (text display), show browser compatibility warning, provide audio file alternatives

**Web Audio API Context Suspension:**
- Issue: AudioContext may be suspended by browser autoplay policies
- Files: `games/HebrewGame/audio.ts`
- Impact: Sound effects fail silently on initial load until user interaction resumes context
- Fix approach: Implement AudioContext resume on user gesture, show "unmute" prompt when suspended

**Missing Test Coverage for UI Components:**
- Issue: Pages and components have no unit tests
- Files: All files in `pages/`, `components/`, `games/`
- Impact: UI regressions undetected, refactoring risky, no safety net for visual components
- Fix approach: Add React Testing Library tests for critical flows (quiz taking, test creation, child dashboard navigation)

**Skipped Tests in useQuizSession:**
- Issue: 3 tests marked as TODO/skipped
- Files: `hooks/useQuizSession.test.ts` lines 446+ (comment indicates investigation needed)
- Impact: Hook's loadQuestions callback behavior not fully verified
- Fix approach: Complete test investigation, fix async behavior verification

**Console.log Usage:**
- Issue: Console statements scattered across codebase instead of using logger
- Files: 12 files including `pages/LoginPage.tsx` line 49, `pages/ChildDetails/PlanTab.tsx`, `components/FamilyEditModal.tsx`
- Impact: Inconsistent logging, hard to filter/disable in production, no structured log data
- Fix approach: Replace all console.* with logger.* from `lib/logger.ts`

---

## Known Bugs

**Math RTL Display Issues (Fixed but Fragile):**
- Symptoms: Math equations display incorrectly in RTL layout (operands reversed)
- Files: `pages/QuizSession.tsx` (fixed with dir="ltr" for math)
- Trigger: Hebrew RTL context affects mathematical notation rendering
- Workaround: Specific `dir="ltr"` applied to math content, but pattern must be manually maintained

**Session Saving Race Condition:**
- Symptoms: Quiz completion may not save if user navigates away too quickly
- Files: `pages/QuizSession.tsx`, `hooks/useQuizSession.ts` finishSession
- Trigger: User clicks "finish" then immediately navigates, Firestore write doesn't complete
- Workaround: Await session save before navigation, but no loading indicator shown to user during save

---

## Security Considerations

**Client-Side API Key Exposure:**
- Risk: Gemini API key injected into client bundle via Vite define
- Files: `vite.config.ts` lines 15-18, `services/geminiService.ts` line 26
- Current mitigation: None - API key accessible via browser DevTools
- Recommendations: Move to serverless function (Cloud Functions, Vercel Edge), proxy API calls through backend

**Firebase Rules Coverage Unknown:**
- Risk: No evidence of Firestore security rules testing
- Files: Security rules not in repository
- Current mitigation: Client-side filtering as backup (store.tsx)
- Recommendations: Add `firestore.rules` to repo, add Firebase emulator tests for rule validation

**Invite System Authorization Gaps:**
- Risk: Invite creation only checked via super admin email constant
- Files: `types.ts` line 57, invite-related services
- Current mitigation: Email comparison in client
- Recommendations: Server-side admin role verification via Custom Claims or Firestore-based RBAC

**PIN Hash Storage:**
- Risk: Child PIN hashes stored in Firestore with bcrypt but no password policy
- Files: `services/pinService.ts`, `types.ts` ChildProfile.pinHash
- Current mitigation: bcrypt hashing with rounds=10
- Recommendations: Enforce minimum PIN length, add rate limiting to PIN verification, consider time-based PINs

**File Upload Validation:**
- Risk: File type validation only on client
- Files: `services/storageService.ts` lines 44-56
- Current mitigation: MIME type check before upload
- Recommendations: Add server-side validation via Cloud Function trigger, scan uploaded files for malware

---

## Performance Bottlenecks

**Firestore Real-time Listeners:**
- Problem: 5 concurrent real-time listeners active per family
- Files: `store.tsx` lines 222-296 (subscribeToSubjects, subscribeToChildren, subscribeToSessions, subscribeToTests, subscribeToEvaluations)
- Cause: onSnapshot listeners continuously poll for changes
- Improvement path: Implement pagination for sessions/evaluations (only load recent), use single query with compound indexes where possible

**Gemini API Retry Logic:**
- Problem: Synchronous retries with exponential backoff block UI
- Files: `lib/retry.ts`, `services/geminiService.ts` all generation functions
- Cause: 2 retries × 1000ms+ delay = 3-5 second freeze on failures
- Improvement path: Move AI generation to background worker, show loading states, implement request cancellation

**Large Image Uploads:**
- Problem: Base64 encoding 10MB images doubles memory usage during evaluation uploads
- Files: `services/storageService.ts` lines 173-185, `services/geminiService.ts` analyzeEvaluationDocument
- Cause: FileReader.readAsDataURL converts binary to base64 in memory
- Improvement path: Use Blob URLs for preview, implement image compression before upload, resize images client-side

**Quiz Generation Latency:**
- Problem: 3-8 second wait for AI question generation
- Files: `services/geminiService.ts` generateQuizQuestions
- Cause: Cold start + model inference time for Gemini API
- Improvement path: Pregenerate common questions, cache by topic+grade+difficulty, show estimated wait time

---

## Fragile Areas

**ChildDetails Tab Splitting:**
- Files: `pages/ChildDetails/index.tsx`, `pages/ChildDetails/*Tab.tsx` (6 tab files)
- Why fragile: Recent refactor (Phase 4) split 1,066 LOC into 6+ files. Props threading is complex, shared state between tabs
- Safe modification: Always update `types.ts` interface when changing tab props, verify lazy loading still works
- Test coverage: No integration tests for tab navigation, prop passing untested

**Multi-parent Family System:**
- Files: `store.tsx` lines 144-175, family/parent services
- Why fragile: New feature (commit 4de87c1) supporting 2nd parent invite flow. Auto-bootstrap logic for super admin, invite-based signup paths
- Safe modification: Test with both new user (invite) and existing user (direct login) flows. Verify parent.familyId consistency
- Test coverage: Family/parent services have unit tests (100% coverage), but no E2E flow tests

**Game State Management:**
- Files: `games/HebrewGame/hooks/useGameState.ts` (~150 LOC state hook), `games/HebrewGame/generators.ts`
- Why fragile: Complex state machine (menu → game → end screens), 6 game modes with different question generators
- Safe modification: Always test all 6 game modes after changes to useGameState. Verify audio cleanup on unmount
- Test coverage: No tests for game components or hooks

**Evaluation Analysis Pipeline:**
- Files: `services/geminiService.ts` analyzeEvaluationDocument (lines 467-700), `pages/ChildDetails/UploadEvaluationModal.tsx`
- Why fragile: Complex multimodal AI analysis (image OCR + structured extraction). Multiple document types (rubric, proficiency, test). Subject matching logic
- Safe modification: Mock Gemini responses in tests, validate all 4 evaluation types separately, test subject matching edge cases
- Test coverage: Service has 73.5% coverage but missing tests for analyzeEvaluationDocument function

---

## Scaling Limits

**Firestore Query Limits:**
- Current capacity: Real-time listeners scale to ~1000 concurrent connections per DB
- Limit: With 100+ families × 5 listeners = 500+ connections. Approaching limit at ~200 active families
- Scaling path: Implement connection pooling, paginate data queries, consider read-only replicas for analytics

**Gemini API Quota:**
- Current capacity: Free tier - 15 requests/minute, 1500 requests/day
- Limit: 10 concurrent quiz generations exhaust minute quota. ~150 quizzes/day max
- Scaling path: Upgrade to paid tier, implement request queue with priority, cache generated questions aggressively

**Firebase Storage Bandwidth:**
- Current capacity: 1GB/day download, 10GB/month
- Limit: 100 families × 10 evaluations × 5MB = 5GB/month. Near limit with moderate usage
- Scaling path: Implement CDN caching, compress images before storage, paginate evaluation loading

**Client Bundle Size:**
- Current capacity: Main bundle ~500KB (estimated from dependencies)
- Limit: Recharts (150KB), Firebase SDK (100KB), React libraries add up. Mobile performance degrades
- Scaling path: Code splitting already implemented for tabs, add dynamic imports for Recharts, lazy load Hebrew game module

---

## Dependencies at Risk

**@google/genai - Unreleased SDK:**
- Risk: Using v1.34.0 which may have breaking changes before stable 2.0
- Impact: API changes could break quiz generation, no migration guide available
- Migration plan: Monitor SDK releases, pin exact version, add integration tests to detect breaking changes early

**React 18.2.0 - Old Version:**
- Risk: Using React 18.2.0 (released 2022), latest is 19.x
- Impact: Missing concurrent features, security patches, performance improvements
- Migration plan: Upgrade to React 19 when stable, test Suspense boundaries and transitions, verify recharts compatibility

**Firebase 12.7.0 - Modular SDK:**
- Risk: Rapid Firebase updates, occasional breaking changes in minor versions
- Impact: Auth, Firestore, Storage APIs could change behavior
- Migration plan: Pin exact version in package.json, review Firebase release notes before upgrades, maintain comprehensive service layer tests

---

## Missing Critical Features

**Error Monitoring:**
- Problem: No Sentry/Rollbar integration for production error tracking
- Blocks: Cannot diagnose user-reported bugs, no visibility into client errors
- Priority: High - needed before production launch

**Analytics:**
- Problem: No usage tracking (mixpanel, GA) for feature adoption
- Blocks: Cannot measure quiz completion rates, identify unused features, track engagement
- Priority: Medium - valuable for product decisions

**Offline Support:**
- Problem: App requires constant internet connection
- Blocks: Cannot use in schools with poor connectivity, quiz progress lost on disconnect
- Priority: Medium - PWA + Service Worker could cache quizzes

**Parent-Child PIN Setup:**
- Problem: Child PIN optional, no enforcement
- Blocks: Children can access any profile without authentication
- Priority: High - security issue for multi-child families

**Audit Logging:**
- Problem: No record of who changed child settings, deleted tests, etc.
- Blocks: Cannot trace data modifications, no accountability
- Priority: Low - nice to have for admin purposes

---

## Test Coverage Gaps

**Services Layer (95.22% coverage) - Excellent:**
- What's not tested: evaluationsService edge cases, storageService file deletion failures
- Files: `services/evaluationsService.ts`, `services/storageService.ts` lines 145-168
- Risk: File deletion errors silently ignored (logged but not thrown)
- Priority: Low - graceful degradation acceptable for cleanup operations

**Hooks Layer (81.09% coverage) - Good:**
- What's not tested: useQuizSession error paths (lines 255-323), useSpeechSynthesis browser events (lines 78-91)
- Files: `hooks/useQuizSession.ts`, `hooks/useSpeechSynthesis.ts`
- Risk: Quiz session error recovery untested, speech synthesis edge cases (rate limiting, voice unavailable) not covered
- Priority: Medium - add tests for network failures during loadQuestions

**Lib Layer (87.5% coverage) - Good:**
- What's not tested: env.ts validation functions (lines 41-45, 92-106), logger creation in test environments
- Files: `lib/env.ts`, `lib/logger.ts`
- Risk: Environment validation edge cases, logger child creation untested
- Priority: Low - mostly initialization code

**UI Components (0% coverage) - Critical Gap:**
- What's not tested: All pages and components
- Files: `pages/**/*.tsx`, `components/**/*.tsx`, `games/**/*.tsx`
- Risk: Visual regressions undetected, user flows not verified, accessibility issues unknown
- Priority: High - add tests for critical paths (quiz taking, test scheduling, child dashboard)

---

*Concerns audit: 2026-01-22*
