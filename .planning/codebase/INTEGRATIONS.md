# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**AI/ML:**
- Google Gemini API (gemini-2.0-flash model) - AI-powered quiz generation and analysis
  - SDK/Client: `@google/genai` 1.34.0
  - Auth: `GEMINI_API_KEY` environment variable (injected as `process.env.API_KEY`)
  - Usage: `services/geminiService.ts`
  - Features:
    - `generateQuizQuestions()` - Generate Hebrew quiz questions by grade/subject/topic
    - `generateExamRecommendations()` - Post-quiz study tips based on performance
    - `analyzeMistakesAndGenerateTopics()` - Identify weak areas from errors
    - `extractTopicsFromInput()` - Multimodal topic extraction from text/images
    - `analyzeEvaluationDocument()` - OCR and analysis of school test documents (rubrics, proficiency summaries, traditional tests)
  - Retry logic: Exponential backoff (2 retries, 1s initial delay) via `lib/retry.ts`
  - Graceful degradation: Falls back to defaults for non-critical features (recommendations, topic analysis)

## Data Storage

**Databases:**
- Firebase Firestore (NoSQL)
  - Project: `study-buddy-lahav`
  - Connection: Hardcoded config in `firebaseConfig.ts` (public client config)
  - Client: `firebase/firestore` 12.7.0
  - Collections:
    - `parents` - Parent profiles with family associations
    - `families` - Family groups (multi-tenant)
    - `children` - Child profiles with PIN authentication and gamification stats
    - `subjects` - Available subjects with topics (global, seeded from `constants.ts`)
    - `sessions` - Completed study sessions with questions/answers (family-scoped)
    - `upcomingTests` - Scheduled tests (quiz or dictation type, family-scoped)
    - `evaluations` - Uploaded school test documents with AI analysis (family-scoped)
    - `invites` - Family invite codes for second parent signup
  - Real-time subscriptions: `onSnapshot` listeners in `store.tsx`
  - Security: `firestore.rules` - Family-scoped access control with super admin override

**File Storage:**
- Firebase Storage
  - Client: `firebase/storage` 12.7.0
  - Usage: `services/storageService.ts`
  - Path structure: `evaluations/{familyId}/{childId}/{timestamp}_{filename}`
  - Supported formats: JPG, PNG, HEIC, HEIF, PDF (10MB max)
  - Features:
    - `uploadEvaluationFiles()` - Upload school test documents
    - `deleteEvaluationFiles()` - Cleanup on evaluation deletion
    - `fileToBase64()` - Convert files for Gemini AI processing
  - Security: `storage.rules` (not reviewed in detail)

**Caching:**
- None - Uses Firestore real-time listeners for live data sync

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication
  - Client: `firebase/auth` 12.7.0
  - Implementation: `services/authService.ts`
  - Methods:
    - Google OAuth - `signInWithGoogle()` using popup flow
    - Email/Password - Available but not used in UI
    - Sign out - `signOut()`
  - Session persistence: `browserLocalPersistence`
  - Auth state subscription: `onAuthStateChanged` in `store.tsx`
  - User flow:
    1. Sign in with Google
    2. Check if parent exists in Firestore (`parents/{uid}`)
    3. If super admin (`eran.lahav@gmail.com`), auto-bootstrap family and parent
    4. If new user, redirect to invite-based signup
    5. Update `lastLoginAt` for existing users

**Child Authentication:**
- Custom PIN system (not Firebase Auth)
  - Implementation: `services/pinService.ts`
  - Hashing: bcryptjs (10 rounds)
  - Storage: `pinHash` field in `children` collection
  - No session management - PIN verified per child dashboard access

## Monitoring & Observability

**Error Tracking:**
- None - Uses custom logger only

**Logs:**
- Custom structured logging via `lib/logger.ts`
  - Levels: info, warn, error
  - Context: Includes metadata objects with each log
  - Output: `console.log`/`console.warn`/`console.error`
  - Categories: Service name as prefix (e.g., "geminiService:", "store:")

## CI/CD & Deployment

**Hosting:**
- Firebase Hosting
  - Project: `study-buddy-lahav`
  - Config: `firebase.json`
  - Public directory: `dist/`
  - SPA routing: All routes rewrite to `/index.html`

**CI Pipeline:**
- GitHub Actions
  - Workflows:
    - `.github/workflows/claude-code-review.yml` - Claude AI code review on PRs
    - `.github/workflows/claude.yml` - Additional Claude automation (not reviewed in detail)
  - Secrets required:
    - `ANTHROPIC_API_KEY` - For Claude code review plugin

## Environment Configuration

**Required env vars:**
- `GEMINI_API_KEY` - Google Gemini API key (optional - app works without AI)

**Optional env vars:**
- None - Firebase config is hardcoded (public safe)

**Secrets location:**
- `.env` (development)
- `.env.production` (production build)
- GitHub Secrets (CI/CD)

**Note:** API key validation in `lib/env.ts` warns if missing but doesn't crash app. AI features throw `QuizGenerationError` or return fallbacks when API key is not configured.

## Webhooks & Callbacks

**Incoming:**
- None - Firebase Authentication handles OAuth callbacks internally

**Outgoing:**
- None - All integrations are client-initiated (no server-side webhooks)

## Browser APIs (Built-in)

**Speech Synthesis:**
- Web Speech API (`window.speechSynthesis`)
  - Usage: `hooks/useSpeechSynthesis.ts`, `games/HebrewGame/audio.ts`
  - Language: Hebrew (he-IL)
  - Rate: 0.8x (80% speed)
  - Use case: Text-to-speech for quiz questions and Hebrew word exercises

**Audio:**
- Web Audio API (`AudioContext`, `OscillatorNode`)
  - Usage: `games/HebrewGame/audio.ts`
  - Sounds: Win, loss, click tones
  - Fallback: Safari WebKit compatibility (`webkitAudioContext`)

**File Handling:**
- FileReader API
  - Usage: `services/storageService.ts`
  - Purpose: Convert images to base64 for Gemini multimodal API

---

*Integration audit: 2026-01-22*
