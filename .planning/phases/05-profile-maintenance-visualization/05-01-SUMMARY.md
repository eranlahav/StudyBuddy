---
phase: 05-profile-maintenance-visualization
plan: 01
subsystem: learner-model
tags: [forgetting-curve, mastery-decay, time-based-learning, ebbinghaus, bayesian-knowledge-tracing]

# Dependency graph
requires:
  - phase: 04-multi-signal-integration
    provides: daysSince utility for recency calculation
provides:
  - Time-based mastery decay functions (Ebbinghaus forgetting curve)
  - Extended TopicMastery type with probe scheduling fields
  - Foundation for SM-2 spaced repetition scheduler (Plan 03)
affects: [05-03-sm2-probe-scheduler, 05-04-decay-integration, 05-06-analytics-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [exponential-decay, immutable-profile-transformation, feature-flag-pattern]

key-files:
  created:
    - lib/forgettingCurve.ts
  modified:
    - types.ts
    - lib/index.ts

key-decisions:
  - "Three-tier decay rates based on mastery level (95%/92%/88% weekly)"
  - "5% minimum pKnown floor to preserve residual knowledge"
  - "Immutable pattern: decay returns new objects, never mutates"
  - "Global ENABLED toggle for forgetting curve feature flag"

patterns-established:
  - "Read-only decay: applyForgettingCurve never modifies lastAttempt timestamp"
  - "Profile-level decay: applyForgettingCurveToProfile for visualization/recommendations"
  - "Selective decay by mastery: mastered topics decay slowest, weak topics fastest"

# Metrics
duration: 2min
completed: 2026-01-23
---

# Phase 05 Plan 01: Forgetting Curve Foundation Summary

**Time-based mastery decay with three-tier Ebbinghaus curve (95%/92%/88% weekly decay rates) achieving 66% retention for mastered topics after 8 weeks**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-01-23T18:21:37Z
- **Completed:** 2026-01-23T18:23:54Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Implemented Ebbinghaus forgetting curve with mastery-level-based decay rates
- Extended TopicMastery type with probe scheduling fields (nextProbeDate, probeIntervalDays)
- Math-verified decay: mastered (0.85) → 0.56 after 8 weeks (66% retention)
- Foundation ready for SM-2 spaced repetition scheduler in Plan 03

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend TopicMastery type with probe fields** - `a65b3f1` (feat) - *Pre-completed*
2. **Task 2: Create forgetting curve library** - `b92203f` (feat)

## Files Created/Modified
- `lib/forgettingCurve.ts` - Exponential decay functions for time-based mastery decay
- `types.ts` - Added nextProbeDate and probeIntervalDays fields to TopicMastery
- `lib/index.ts` - Export forgetting curve functions

## Decisions Made

**1. Three-tier decay rates by mastery level**
- Mastered (pKnown >= 0.8): 0.95/week (5% weekly decay)
- Learning (0.5 <= pKnown < 0.8): 0.92/week (8% weekly decay)
- Weak (pKnown < 0.5): 0.88/week (12% weekly decay)
- Rationale: Research shows strong knowledge decays slower than weak knowledge

**2. 5% minimum pKnown floor**
- Prevents complete knowledge loss (residual memory persists)
- Aligns with cognitive science research on long-term retention

**3. Immutable decay pattern**
- `applyForgettingCurve` returns new TopicMastery object
- Never modifies lastAttempt timestamp (decay is read-only operation)
- Rationale: Decay is for visualization/recommendations, not profile updates

**4. Global ENABLED toggle**
- `FORGETTING_CONFIG.ENABLED` feature flag
- Allows disabling decay system without code changes
- Useful for A/B testing or debugging

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Task 1 Pre-completion:**
Task 1 (extending TopicMastery) was already completed in commit `a65b3f1` (05-02 plan). The probe fields (nextProbeDate, probeIntervalDays) were present before this execution started. This is likely due to Plan 02 being executed first, which added the RegressionAlert type and probe fields together.

Resolution: Verified fields exist and TypeScript compiles, proceeded directly to Task 2.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Plan 02: Regression detection (uses forgetting curve for baseline comparison)
- Plan 03: SM-2 probe scheduler (uses probe fields and decay for interval calculation)
- Plan 04: Profile decay integration (uses applyForgettingCurveToProfile)

**Math Verification:**
- Mastered (0.85) after 8 weeks: 0.564 (66.3% retention) ✓
- Learning (0.65) after 8 weeks: 0.334 (51.3% retention) ✓
- Weak (0.35) after 8 weeks: 0.126 (36.0% retention) ✓

All success criteria met:
1. Mastered topics decay to ~66% after 8 weeks ✓
2. Learning topics decay faster (0.92 vs 0.95) ✓
3. Weak topics decay fastest (0.88) ✓
4. No topic drops below 5% floor ✓

---
*Phase: 05-profile-maintenance-visualization*
*Completed: 2026-01-23*
