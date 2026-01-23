---
phase: 05-profile-maintenance-visualization
plan: 02
subsystem: learning-signals
tags: [regression-detection, alerts, bayesian-knowledge-tracing, parent-dashboard]

# Dependency graph
requires:
  - phase: 04-multi-signal-integration
    provides: Signal weights and multi-signal fusion for profile updates
provides:
  - RegressionAlert type for parent notifications
  - Regression detection logic (mastered -> below threshold)
  - 14-day cooldown mechanism to prevent alert fatigue
  - Hebrew alert message formatting
affects: [05-03-profile-visualization, 05-04-forgetting-curve, parent-dashboard-alerts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regression detection: mastered (>=0.8) -> below threshold (0.7)"
    - "14-day cooldown per topic to prevent alert fatigue"
    - "10% minimum drop threshold to reduce noise from minor fluctuations"

key-files:
  created:
    - services/alertService.ts
  modified:
    - types.ts
    - services/index.ts

key-decisions:
  - "Regression threshold set at 0.7 (70% confidence) - below typical learning/mastery boundary"
  - "Mastery threshold at 0.8 (80%) matches Phase 1 BKT mastery definition"
  - "14-day cooldown prevents repeated alerts for same topic"
  - "10% minimum drop (e.g., 0.85 -> 0.75 insufficient) reduces noise from normal variance"

patterns-established:
  - "Alert service pattern: detect, cooldown check, format message, create object"
  - "Hebrew message format: '[child name] נראה/ת מתקשה ב[topic] ([subject])'"
  - "Alert ID format: 'alert_{childId}_{topic}_{timestamp}' for uniqueness"

# Metrics
duration: 1min
completed: 2026-01-23
---

# Phase 5 Plan 02: Alert Service Summary

**Regression detection service identifies mastered topics dropping below 70% with 14-day cooldown and Hebrew parent messages**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-23T18:21:42Z
- **Completed:** 2026-01-23T18:22:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created alert service for detecting mastery regression (>=0.8 -> <0.7)
- Implemented 14-day cooldown per topic to prevent alert fatigue
- 10% minimum drop threshold reduces noise from normal variance
- Hebrew message formatting for parent dashboard display

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RegressionAlert type** - `a65b3f1` (feat)
2. **Task 2: Create alert service** - `950207c` (feat)

## Files Created/Modified
- `types.ts` - Added RegressionAlert interface with dismissed flag and cooldown tracking
- `services/alertService.ts` - Regression detection, cooldown logic, Hebrew message formatting
- `services/index.ts` - Export alert service functions

## Decisions Made

**1. Regression threshold at 0.7 (70% confidence)**
- Rationale: Below typical learning/mastery boundary (0.5-0.8), indicates significant concern
- Matches educational research on critical knowledge retention thresholds

**2. Previous mastery threshold at 0.8 (80%)**
- Rationale: Matches Phase 1 BKT mastery definition, ensures "mastered" label was accurate
- Only alert when truly mastered content regresses, not borderline cases

**3. 14-day cooldown per topic**
- Rationale: Prevents alert fatigue while allowing intervention time
- Two-week window gives parent and child time to address issue before re-alerting

**4. 10% minimum drop threshold**
- Rationale: Reduces noise from normal BKT variance and measurement uncertainty
- Example: 0.85 -> 0.78 won't alert (only 7% drop, still above threshold)
- Example: 0.85 -> 0.65 will alert (20% drop, below threshold)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 05-03 (Profile Visualization):**
- RegressionAlert type defined and ready for UI display
- Detection logic available for real-time profile monitoring
- Hebrew messages ready for parent dashboard integration

**Integration points:**
- Plan 05-03 will call `detectRegression()` after profile updates
- Plan 05-03 will call `shouldAlertForRegression()` before creating alerts
- Plan 05-03 will call `createRegressionAlert()` to generate alert objects
- Parent dashboard will display alerts and allow dismissal

**No blockers.**

---
*Phase: 05-profile-maintenance-visualization*
*Completed: 2026-01-23*
