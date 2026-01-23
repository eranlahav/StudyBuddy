---
phase: 05-profile-maintenance-visualization
plan: 03
subsystem: quiz-engine
tags: [sm-2, spaced-repetition, probe-scheduling, review-mode, adaptive-quiz]

# Dependency graph
requires:
  - phase: 05-01
    provides: forgetting curve decay and TopicMastery nextProbeDate/probeIntervalDays fields
  - phase: 02-03
    provides: adaptive quiz generation with classifyTopics and mixDifficulty
provides:
  - SM-2 based probe scheduling (needsProbeQuestion, scheduleNextProbe, processProbeResult)
  - Review mode detection and topic selection (shouldEnterReviewMode, selectReviewTopics)
  - Probe topic selection for mastery verification (selectProbeTopics)
  - Wired useQuizSession with isReviewMode state
affects: [profile-dashboard, quiz-analytics, mastery-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns: [SM-2 spaced repetition, review mode detection, probe scheduling]

key-files:
  created:
    - services/probeScheduler.ts
  modified:
    - services/adaptiveQuizService.ts
    - services/index.ts
    - hooks/useQuizSession.ts

key-decisions:
  - "Initial probe interval 28 days (4 weeks) - matches standard SM-2 initial interval"
  - "Probe interval doubles on success up to 168 days (24 weeks) - prevents over-spacing"
  - "Failed probe demotes pKnown to 0.75 - significant penalty but recoverable"
  - "Review mode threshold 21 days (3 weeks) - balances retention and session frequency"
  - "Review questions 30% of quiz in review mode - significant but not overwhelming"
  - "Max 2 probe topics and 3 review topics per quiz - avoids quiz overload"

patterns-established:
  - "SM-2 interval doubling: 4w -> 8w -> 16w -> 24w (capped)"
  - "Probe eligibility: pKnown >= 0.8 AND nextProbeDate passed"
  - "Review eligibility: pKnown >= 0.65 AND lastAttempt >= 21 days ago"

# Metrics
duration: 4min
completed: 2026-01-23
---

# Phase 5 Plan 3: Probe Scheduling & Review Mode Summary

**SM-2 based probe scheduling with 4-24 week intervals, review mode after 3+ week gaps with 30% review question mix**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-23T18:28:57Z
- **Completed:** 2026-01-23T18:33:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created probe scheduler service implementing SM-2 spaced repetition algorithm
- Extended adaptive quiz service with review mode detection and topic selection
- Wired probe and review mode into useQuizSession hook with isReviewMode state
- Probe topics automatically included in quiz for mastery verification
- Review mode adjusts question mix to 30% review topics for returning children

## Task Commits

Each task was committed atomically:

1. **Task 1: Create probe scheduler service** - `3c0a7f4` (feat)
2. **Task 2: Extend adaptive quiz service with review mode** - `5aa0e3e` (feat)
3. **Task 3: Wire probe and review mode into useQuizSession** - `1afa86a` (feat)

## Files Created/Modified
- `services/probeScheduler.ts` - SM-2 based probe scheduling with PROBE_CONFIG, needsProbeQuestion, scheduleNextProbe, processProbeResult
- `services/adaptiveQuizService.ts` - Added REVIEW_MODE_CONFIG, shouldEnterReviewMode, selectReviewTopics, selectProbeTopics
- `services/index.ts` - Exports for probe scheduler and review mode functions
- `hooks/useQuizSession.ts` - Integrated review mode detection and probe topic selection, exposed isReviewMode state

## Decisions Made
- Initial probe interval set to 28 days (4 weeks) per SM-2 standard
- Interval doubles on successful probe (4w -> 8w -> 16w -> 24w max)
- Failed probes demote pKnown to 0.75 (below mastered threshold but recoverable)
- Review mode triggers at 21+ day gap (3 weeks) between sessions
- Review questions comprise 30% of quiz in review mode
- Maximum 2 probe topics per quiz to avoid overload
- Maximum 3 review topics selected (oldest first for priority refresh)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Probe scheduling ready for integration with profile update flow
- Review mode detection ready for UI banner display
- isReviewMode state available for "Welcome back" UI experience
- Ready for Phase 5 Plan 4: Prerequisite Detection

---
*Phase: 05-profile-maintenance-visualization*
*Completed: 2026-01-23*
