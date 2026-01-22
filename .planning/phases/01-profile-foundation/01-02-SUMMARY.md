---
phase: 01-profile-foundation
plan: 02
subsystem: database
tags: [firebase, firestore, bayesian-knowledge-tracing, learner-modeling]

# Dependency graph
requires:
  - phase: 01-01
    provides: "BKT algorithm and LearnerProfile type definitions"
provides:
  - "Profile CRUD operations for Firestore subcollections"
  - "Quiz signal processing with fire-and-forget pattern"
  - "Profile bootstrapping from historical sessions"
affects: [01-03-integration, 02-quiz-selector, parent-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Firestore subcollection pattern for child data isolation"
    - "Fire-and-forget pattern for non-blocking profile updates"
    - "Signal processing with retry logic"

key-files:
  created:
    - services/profileService.ts
    - services/signalService.ts
  modified:
    - services/index.ts

key-decisions:
  - "Subcollection storage at /children/{childId}/learnerProfile/main prevents bloating children queries"
  - "Fire-and-forget pattern ensures profile update failures never block quiz flow"
  - "bootstrapProfile enables historical session replay for profile reconstruction"

patterns-established:
  - "Profile service: getProfile returns null for lazy initialization (no unnecessary writes)"
  - "Signal service: processQuizSignal uses try/catch with logging but throws ProfileUpdateError for testing"
  - "Topic performance extraction groups all questions by topic (session = single topic assumption)"

# Metrics
duration: 2min
completed: 2026-01-22
---

# Phase 01 Plan 02: Profile & Signal Services Summary

**Firestore-backed profile persistence with BKT-powered quiz signal processing using fire-and-forget updates**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-01-22T10:38:15Z
- **Completed:** 2026-01-22T10:40:04Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Profile CRUD operations with Firestore subcollection storage
- Quiz signal processing that applies BKT updates to topic mastery
- Fire-and-forget pattern ensures profile updates never block UI
- Bootstrap function reconstructs profiles from historical quiz sessions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Profile Service** - `380d06b` (feat)
2. **Task 2: Create Signal Service** - `22e7aac` (feat)
3. **Task 3: Update Services Index** - `419b99c` (feat)

## Files Created/Modified

### Created
- **`services/profileService.ts`** - Firestore operations for learner profiles
  - `getProfile()`: Fetches profile from `/children/{childId}/learnerProfile/main` subcollection
  - `updateProfile()`: Persists profile with merge:true for partial updates
  - `subscribeToProfile()`: Real-time subscription for dashboard display
  - `initializeProfile()`: Creates empty profile structure on first quiz

- **`services/signalService.ts`** - Quiz signal processing with BKT
  - `processQuizSignal()`: Main entry point for quiz completion events
  - `bootstrapProfile()`: Replays historical sessions through BKT algorithm
  - `extractTopicPerformance()`: Parses quiz results by topic
  - `updateTopicMastery()`: Applies BKT updates and trend calculation

### Modified
- **`services/index.ts`** - Added exports for profile and signal services

## Decisions Made

**1. Subcollection storage pattern**
- Store profiles at `/children/{childId}/learnerProfile/main` rather than in children document
- Rationale: Prevents profile data (growing topicMastery map) from bloating children queries
- Enables independent real-time subscriptions without re-fetching entire child profile

**2. Fire-and-forget error handling**
- `processQuizSignal()` catches errors, logs them, but throws ProfileUpdateError (for testing)
- Rationale: Profile update failures should NEVER break quiz completion flow
- User sees quiz success regardless of background profile update status

**3. Lazy profile initialization**
- `getProfile()` returns null if profile doesn't exist (no automatic creation)
- First quiz triggers `initializeProfile()` via signal processing
- Rationale: Avoids unnecessary writes for children who never take quizzes

**4. Chronological replay for bootstrapping**
- `bootstrapProfile()` sorts sessions by date before processing
- Rationale: BKT is order-sensitive - replaying in correct sequence ensures accurate mastery tracking

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed sessionsService.ts pattern with no blockers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 01-03 (Quiz Session Integration):**
- Profile services ready for import in quiz session components
- `processQuizSignal()` can be called after `addSession()` in quiz completion handlers
- `subscribeToProfile()` available for parent dashboard analytics

**Blockers/Concerns:**
- Fire-and-forget pattern means profile updates can silently fail - monitoring recommended
- BKT parameters (pKnown, pLearn) need calibration with real usage data
- No forgetting curve decay implemented yet (Phase 5)

---
*Phase: 01-profile-foundation*
*Completed: 2026-01-22*
