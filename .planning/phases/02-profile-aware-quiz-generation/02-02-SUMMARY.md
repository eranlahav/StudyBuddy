---
phase: 02-profile-aware-quiz-generation
plan: 02
subsystem: hooks
tags: [fatigue-detection, frustration-circuit-breaker, adaptive-quiz, react-hooks]

# Dependency graph
requires:
  - phase: 02-01
    provides: lib/encouragement.ts with getEncouragementMessage
provides:
  - FatigueState and FrustrationState types in types.ts
  - ADAPTIVE_QUIZ_CONSTANTS for configurable thresholds
  - Fatigue detection in useQuizSession (speed + accuracy)
  - Frustration circuit breaker in useQuizSession (per-topic)
  - Early quiz ending with encouraging Hebrew messages
affects: [02-03, ui-components, analytics]

# Tech tracking
tech-stack:
  added: []
  patterns: [rolling-window-state, early-exit-callback, dual-condition-detection]

key-files:
  created: []
  modified:
    - types.ts
    - hooks/useQuizSession.ts

key-decisions:
  - "Fatigue requires BOTH rushing AND accuracy drop - prevents false positives for smart fast kids"
  - "Frustration is per-topic, not global - child can continue with other topics"
  - "Silent topic switching - child never sees 'you are struggling' message"

patterns-established:
  - "Dual-condition fatigue detection: speed threshold (50% of baseline) AND accuracy threshold (40%)"
  - "Per-topic consecutive error tracking with automatic cooldown"
  - "Early exit from quiz with encouraging message instead of forcing completion"

# Metrics
duration: 4min
completed: 2026-01-22
---

# Phase 02 Plan 02: Fatigue Detection and Frustration Circuit Breaker Summary

**Adaptive quiz ending with fatigue detection (speed+accuracy) and per-topic frustration circuit breaker using Hebrew encouragement messages**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-22T14:40:39Z
- **Completed:** 2026-01-22T14:44:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added FatigueState interface tracking answer speed baseline and rolling accuracy window
- Added FrustrationState interface tracking consecutive errors per topic with cooldown
- Extended useQuizSession hook with real-time fatigue and frustration detection
- Quiz ends early with Hebrew encouragement message when thresholds are met

## Task Commits

Each task was committed atomically:

1. **Task 1: Add fatigue and frustration state types** - `9d5067b` (feat)
2. **Task 2: Extend useQuizSession with fatigue and frustration tracking** - `5339975` (feat)

## Files Created/Modified

- `types.ts` - Added FatigueState, FrustrationState interfaces and ADAPTIVE_QUIZ_CONSTANTS
- `hooks/useQuizSession.ts` - Added fatigue/frustration tracking, early quiz ending

## Decisions Made

- **Dual-condition fatigue detection:** Requires both rushing (<50% baseline) AND accuracy drop (<40%) to avoid false positives for naturally fast learners
- **Per-topic frustration tracking:** Consecutive errors are tracked per topic, not globally - allows child to continue with other topics after struggling with one
- **Added topic field to QuizQuestion:** Enables per-question topic tracking for accurate frustration detection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added topic field to QuizQuestion interface**
- **Found during:** Task 2 (Frustration tracking implementation)
- **Issue:** QuizQuestion didn't have a topic field, needed for per-question frustration tracking
- **Fix:** Added optional `topic?: string` field to QuizQuestion interface
- **Files modified:** types.ts
- **Verification:** TypeScript compiles, frustration tracking can access question.topic
- **Committed in:** 5339975 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor type addition necessary for per-question topic tracking. No scope creep.

## Issues Encountered

None - plan executed smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Fatigue and frustration state are now tracked and exposed via useQuizSession hook
- Ready for 02-03: UI integration to display encouraging messages when quiz ends early
- earlyEndReason field enables analytics tracking of why quizzes end

---
*Phase: 02-profile-aware-quiz-generation*
*Plan: 02*
*Completed: 2026-01-22*
