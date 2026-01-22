# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- TypeScript 5.8.2 - All application code (.ts, .tsx files)
- Hebrew (עברית) - Primary UI language with RTL layout

**Secondary:**
- JavaScript (ES2022) - Build target and runtime environment

## Runtime

**Environment:**
- Node.js v20.19.0
- Target: ES2022 with DOM libraries

**Package Manager:**
- npm (lockfileVersion 3)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.2.0 - UI component library
- React Router DOM 6.22.3 - Client-side routing
- Firebase 12.7.0 - Backend-as-a-Service (Firestore, Auth, Storage, Hosting)

**Testing:**
- Vitest 4.0.17 - Test runner with globals mode
- @testing-library/react 16.3.1 - Component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM assertion matchers
- @vitest/coverage-v8 4.0.17 - Coverage reporting
- jsdom 27.4.0 - Browser environment simulation

**Build/Dev:**
- Vite 6.2.0 - Build tool and dev server (port 3000)
- @vitejs/plugin-react 5.0.0 - React Fast Refresh support
- TypeScript compiler 5.8.2 - Type checking (noEmit mode, Vite handles transpilation)

## Key Dependencies

**Critical:**
- @google/genai 1.34.0 - Google Gemini AI integration for quiz generation
- firebase 12.7.0 - Database, authentication, file storage, and hosting

**Infrastructure:**
- react-router-dom 6.22.3 - Navigation and protected routes
- nanoid 5.1.6 - Unique ID generation for entities

**UI Components:**
- lucide-react 0.344.0 - Icon library
- recharts 2.12.2 - Analytics charts for parent dashboard
- react-confetti 6.1.0 - Gamification visual effects

**Security:**
- bcryptjs 3.0.3 - PIN hashing for child authentication
- @types/bcryptjs 2.4.6 - TypeScript definitions

## Configuration

**Environment:**
- `.env` and `.env.production` files for API key storage
- `GEMINI_API_KEY` - Required for AI quiz generation (injected as `process.env.API_KEY` via Vite define)
- Vite environment validation in `lib/env.ts` with fallback warnings
- Firebase config hardcoded in `firebaseConfig.ts` (public client config)

**Build:**
- `vite.config.ts` - Build configuration with:
  - React plugin enabled
  - Path alias: `@/*` maps to project root
  - Test configuration (jsdom environment, coverage on `lib/**`, `hooks/**`, `services/**`)
  - Environment variable injection via `define` config
- `tsconfig.json` - TypeScript configuration:
  - Target: ES2022
  - Module: ESNext with bundler resolution
  - JSX: react-jsx (automatic runtime)
  - Path alias: `@/*`
  - Experimental decorators enabled

**Deployment:**
- `firebase.json` - Firebase Hosting configuration (serves `dist/`, SPA rewrites)
- `.firebaserc` - Project: `study-buddy-lahav`

## Platform Requirements

**Development:**
- Node.js v20.x
- npm package manager
- Gemini API key (optional - app works without AI features)

**Production:**
- Firebase Hosting (configured, static site deployment)
- Firebase Firestore (NoSQL database)
- Firebase Authentication (Google OAuth)
- Firebase Storage (file uploads)
- HTTPS required for Web Speech API and Web Audio API

**Browser APIs:**
- Web Speech API - Text-to-speech for Hebrew words (`speechSynthesis` in `hooks/useSpeechSynthesis.ts` and `games/HebrewGame/audio.ts`)
- Web Audio API - Sound effects in Hebrew games (`AudioContext`, `OscillatorNode` in `games/HebrewGame/audio.ts`)
- FileReader API - Base64 conversion for image uploads (`services/storageService.ts`)

---

*Stack analysis: 2026-01-22*
