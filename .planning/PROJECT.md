# Study Buddy - Adaptive Learning Profiles

## What This Is

An intelligent learning profile system for Study Buddy that builds a comprehensive, AI-powered profile for each child. The profile tracks knowledge gaps, progress over time, and prioritized next steps - learning from every quiz, evaluation, and interaction to personalize future learning. Parents have full control to guide, override, and shape their child's learning path.

## Core Value

Every child gets a personalized learning path that adapts to their actual needs - focusing on weaknesses, predicting mastery, and evolving with every interaction.

## Requirements

### Validated

<!-- Existing capabilities from codebase -->

- ✓ AI-powered quiz generation via Gemini API — existing
- ✓ Multi-tenant family system with parent/child accounts — existing
- ✓ School evaluation OCR and analysis — existing
- ✓ Quiz session tracking with answers and scores — existing
- ✓ Child gamification (stars, streaks, avatars) — existing
- ✓ Parent dashboard with analytics — existing
- ✓ Hebrew games for early readers (6 game types) — existing
- ✓ Upcoming test scheduling — existing
- ✓ Real-time Firestore sync — existing

### Active

<!-- New capabilities for this milestone -->

- [ ] Learning Profile: Comprehensive profile per child showing gaps, progress, next steps
- [ ] Profile Analytics: Knowledge gap detection across subjects and topics
- [ ] Progress Tracking: Trend visualization showing improvement over time
- [ ] AI Recommendations: Prioritized next steps based on profile data
- [ ] Quiz Adaptation: Quiz generator uses profile to focus on weaknesses
- [ ] Mastery Prediction: AI predicts topic mastery and identifies prerequisites
- [ ] Personalized Curriculum: AI-generated learning path per child
- [ ] Parent Override: Parents can override AI priorities
- [ ] Parent Context: Parents can add notes/observations that inform the profile
- [ ] Parent Goals: Parents can set learning targets (e.g., "master fractions by June")
- [ ] Profile Signals: Profile learns from quiz performance (answers, timing, patterns)
- [ ] Evaluation Integration: Profile learns from scanned school evaluations
- [ ] Engagement Signals: Profile detects avoidance patterns, session behavior
- [ ] Parent Observations: Parent notes feed into profile (e.g., "she guessed on #3")
- [ ] Profile Editing: Parents can directly edit profile entries and priorities

### Out of Scope

- Profile visible to children — Keep kids in gamified experience, avoid showing "weaknesses"
- Bootstrap from history — Profile starts fresh, learns from new interactions only
- Teacher/school integration — Future consideration, not v1
- Cross-family insights — Privacy: each family's data isolated
- Automated parent notifications — Manual review preferred for v1

## Context

**Existing Codebase:**
- React 18 SPA with TypeScript, Firebase backend (Firestore, Auth, Storage)
- Gemini AI integration for quiz generation and evaluation analysis
- Multi-tenant architecture with family-scoped data
- Service layer pattern with comprehensive error handling and retry logic
- 7-phase refactoring completed through Phase 3 (Foundation, Services, Hooks)

**Technical Foundation:**
- Quiz sessions already store answers, scores, timing
- Evaluations already analyzed by AI (OCR, proficiency extraction)
- Children have per-subject proficiency levels (easy/medium/hard)
- Parent dashboard exists with analytics charts (recharts)

**Key Insight:**
The app already collects the data needed - quiz answers, evaluation results, engagement. The profile system connects these signals into a coherent learning model that drives future quiz generation.

## Constraints

- **Tech Stack**: Must use existing Firebase/Gemini/React stack — consistency with codebase
- **Privacy**: All profile data family-scoped, no cross-family access — multi-tenant requirement
- **Performance**: Profile updates should not block UI — async processing required
- **AI Costs**: Gemini API calls for profile analysis should be efficient — batch where possible
- **Hebrew First**: All UI in Hebrew (RTL), profile insights must be Hebrew-friendly

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh profile start (no history bootstrap) | Cleaner data, avoid noise from old sessions | — Pending |
| Parents only see analytics | Protect child motivation, avoid "weakness" framing | — Pending |
| Focus quizzes on weaknesses | Most efficient learning path | — Pending |
| Full parent control over AI | Parent authority over child's education | — Pending |
| Full learning model (not simple tracking) | Maximize value of AI, predict mastery | — Pending |

---
*Last updated: 2026-01-22 after initialization*
