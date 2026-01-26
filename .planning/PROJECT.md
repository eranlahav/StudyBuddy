# Study Buddy - Adaptive Learning Profiles

## What This Is

An intelligent learning profile system for Study Buddy that builds comprehensive, AI-powered profiles for each child. The profile tracks knowledge gaps, progress over time, and prioritized next steps - learning from every quiz, evaluation, and interaction to personalize future learning. Parents have full control to guide, override, and shape their child's learning path.

**Current State:** v1.0 shipped with 31,138 lines of TypeScript/TSX.

## Core Value

Every child gets a personalized learning path that adapts to their actual needs - focusing on weaknesses, predicting mastery, and evolving with every interaction.

## Requirements

### Validated

<!-- Shipped in v1.0 -->

- ✓ AI-powered quiz generation via Gemini API — existing
- ✓ Multi-tenant family system with parent/child accounts — existing
- ✓ School evaluation OCR and analysis — existing
- ✓ Quiz session tracking with answers and scores — existing
- ✓ Child gamification (stars, streaks, avatars) — existing
- ✓ Parent dashboard with analytics — existing
- ✓ Hebrew games for early readers (6 game types) — existing
- ✓ Upcoming test scheduling — existing
- ✓ Real-time Firestore sync — existing
- ✓ Learning Profile: Comprehensive profile per child showing gaps, progress, next steps — v1.0
- ✓ Profile Analytics: Knowledge gap detection across subjects and topics — v1.0
- ✓ Progress Tracking: Trend visualization showing improvement over time — v1.0
- ✓ AI Recommendations: Prioritized next steps based on profile data — v1.0
- ✓ Quiz Adaptation: Quiz generator uses profile to focus on weaknesses — v1.0
- ✓ Mastery Prediction: AI predicts topic mastery and identifies prerequisites — v1.0
- ✓ Personalized Curriculum: AI-generated learning path per child — v1.0
- ✓ Parent Override: Parents can override AI priorities — v1.0
- ✓ Parent Context: Parents can add notes/observations that inform the profile — v1.0
- ✓ Parent Goals: Parents can set learning targets (e.g., "master fractions by June") — v1.0
- ✓ Profile Signals: Profile learns from quiz performance (answers, timing, patterns) — v1.0
- ✓ Evaluation Integration: Profile learns from scanned school evaluations — v1.0
- ✓ Engagement Signals: Profile detects avoidance patterns, session behavior — v1.0
- ✓ Parent Observations: Parent notes feed into profile (e.g., "she guessed on #3") — v1.0
- ✓ Profile Editing: Parents can directly edit profile entries and priorities — v1.0

### Active

<!-- v1.1 UI Enhancements -->

- [ ] Parent Notes UI — Connect processParentNoteSignal to a UI component for parent observations
- [ ] Prerequisite Display — Wire detectPrerequisites service to show topic dependencies in UI
- [ ] Mobile Responsiveness — Improve responsive design across all pages

### Out of Scope

- Profile visible to children — Keep kids in gamified experience, avoid showing "weaknesses"
- Bootstrap from history — Profile starts fresh, learns from new interactions only
- Teacher/school integration — Future consideration, not v1
- Cross-family insights — Privacy: each family's data isolated
- Automated parent notifications — Manual review preferred for v1

## Context

**Codebase State (v1.0):**
- React 18 SPA with TypeScript, Firebase backend (Firestore, Auth, Storage)
- Gemini AI integration for quiz generation, evaluation analysis, and prerequisite detection
- Multi-tenant architecture with family-scoped data
- Service layer pattern with comprehensive error handling and retry logic
- 31,138 lines of TypeScript/TSX across 96 files

**Technical Foundation:**
- BKT-based learner profiles with grade-specific parameters
- Multi-signal fusion (quiz 70%, evaluation 95%, engagement 60%, parent notes 40%)
- Ebbinghaus forgetting curves with three-tier decay rates
- SM-2 spaced repetition for probe scheduling
- Adaptive quiz generation with 20/50/30 difficulty mixing

**v1.0 Architecture:**
```
lib/
  learnerModel.ts      — BKT algorithm
  signalWeights.ts     — Confidence weighting, Bayesian fusion
  engagementDetector.ts — Session behavior analysis
  forgettingCurve.ts   — Time-based mastery decay
  encouragement.ts     — Hebrew messages for fatigue/frustration

services/
  profileService.ts    — Firestore CRUD for learner profiles
  signalService.ts     — Signal processors (quiz, eval, engagement, notes)
  recommendationService.ts — Topic scoring and recommendations
  goalsService.ts      — Learning goals CRUD
  alertService.ts      — Regression detection
  probeScheduler.ts    — SM-2 mastery verification
  adaptiveQuizService.ts — Topic classification and difficulty mixing
  prerequisiteService.ts — AI prerequisite detection

hooks/
  useLearnerProfile.ts — Profile subscription with regression alerts
  useQuizSession.ts    — Adaptive quiz flow with engagement tracking
  useRecommendations.ts — Recommendation orchestration

pages/ChildDetails/
  AnalysisTab.tsx      — Topic mastery display, radar chart, timeline
  PlanTab.tsx          — Recommendations panel, goals form
  RecommendationsPanel.tsx — AI recommendations with override
  SkillRadarChart.tsx  — Recharts RadarChart
  ProgressTimeline.tsx — Recharts AreaChart
  AlertNotificationBanner.tsx — Regression alerts
  ReviewModeBanner.tsx — Welcome back message
```

## Constraints

- **Tech Stack**: Must use existing Firebase/Gemini/React stack — consistency with codebase
- **Privacy**: All profile data family-scoped, no cross-family access — multi-tenant requirement
- **Performance**: Profile updates should not block UI — async processing required
- **AI Costs**: Gemini API calls for profile analysis should be efficient — batch where possible
- **Hebrew First**: All UI in Hebrew (RTL), profile insights must be Hebrew-friendly

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh profile start (no history bootstrap) | Cleaner data, avoid noise from old sessions | ✓ Good |
| Parents only see analytics | Protect child motivation, avoid "weakness" framing | ✓ Good |
| Focus quizzes on weaknesses | Most efficient learning path | ✓ Good |
| Full parent control over AI | Parent authority over child's education | ✓ Good |
| Full learning model (not simple tracking) | Maximize value of AI, predict mastery | ✓ Good |
| Grade-band-specific BKT parameters (1-3, 4-6, 7-8) | Different age groups need different learning/slip rates | ✓ Good |
| Fire-and-forget for profile updates | Non-blocking, never disrupt quiz flow | ✓ Good |
| Signal weights: 95% eval, 70% quiz, 60% engagement, 40% notes | Evidence hierarchy from ITS research | ✓ Good |
| Three-tier forgetting decay (0.95/0.92/0.88 weekly) | Strong knowledge decays slower | ✓ Good |
| SM-2 probe intervals (28-168 days) | Research-backed spaced repetition | ✓ Good |
| Regression threshold at 0.7 with 14-day cooldown | Balance alert visibility with fatigue | ✓ Good |

## Current Milestone: v1.1 UI Enhancements

**Goal:** Surface existing backend capabilities to users and improve mobile experience.

**Target features:**
- Parent Notes UI — Allow parents to add observations that feed into learning profiles
- Prerequisite Display — Show topic dependencies to help parents understand learning paths
- Mobile Responsiveness — Ensure the app works well on phones and tablets

---
*Last updated: 2026-01-26 after v1.1 milestone start*

