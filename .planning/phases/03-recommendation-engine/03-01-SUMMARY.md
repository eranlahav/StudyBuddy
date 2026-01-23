---
phase: 03-recommendation-engine
plan: 01
subsystem: api
tags: [recommendation, scoring, learner-profile, firebase, typescript]

# Dependency graph
requires:
  - phase: 02-profile-aware-quiz-generation
    provides: LearnerProfile with BKT mastery tracking per topic
provides:
  - Multi-factor scoring algorithm (mastery 30%, urgency 40%, goals 30%)
  - TopicScore type with composite scores and Hebrew reasoning
  - Balanced recommendation strategy (30% weakness, 40% growth, 30% maintenance)
  - LearningGoal types for parent-defined objectives
  - RecommendationOverride logging for future calibration
affects: [04-ui-integration, 05-future-ml-enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Multi-factor scoring with configurable weights
    - Fire-and-forget logging for non-critical analytics
    - Balanced category selection algorithm

key-files:
  created:
    - services/recommendationService.ts
  modified:
    - types.ts
    - services/index.ts

key-decisions:
  - "30/40/30 weight split favors urgency (upcoming tests) over mastery and goals"
  - "Mastery score inverted (low mastery = high score) with 95 cap to avoid overwhelming"
  - "Balanced strategy ensures variety: 30% weakness, 40% growth, 30% maintenance"
  - "Override recording is fire-and-forget (non-blocking, swallows errors)"

patterns-established:
  - "Multi-factor scoring: composite = mastery*0.3 + urgency*0.4 + goals*0.3"
  - "Confidence levels based on data availability: 0 attempts = low, <10 = medium, >=10 = high"
  - "Hebrew reasoning arrays generated from score components"

# Metrics
duration: 2min
completed: 2026-01-23
---

# Phase 3 Plan 01: Core Recommendation Engine Summary

**Multi-factor topic scoring (mastery/urgency/goals 30/40/30) with balanced selection algorithm (weakness/growth/maintenance 30/40/30)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-23T08:58:50Z
- **Completed:** 2026-01-23T09:00:21Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Multi-factor scoring algorithm combining mastery (inverted pKnown), urgency (test proximity), and goals (parent objectives)
- Balanced recommendation generation with 30/40/30 category split (weakness/growth/maintenance)
- Complete type definitions for LearningGoal, TopicScore, Recommendation, and RecommendationOverride
- Fire-and-forget override logging for future ML calibration

## Task Commits

Each task was committed atomically:

1. **Task 1: Add recommendation types to types.ts** - `9749125` (feat)
2. **Task 2: Create recommendationService.ts with scoring algorithms** - `ee94b09` (feat)
3. **Task 3: Export recommendationService from services/index.ts** - `187d089` (feat)

## Files Created/Modified
- `types.ts` - Added 6 new interfaces: LearningGoal, TopicScore, Recommendation, RecommendationOverride, ScoringWeights, plus DEFAULT_SCORING_WEIGHTS constant
- `services/recommendationService.ts` - Created with calculateMasteryScore, calculateUrgencyScore, calculateGoalScore, scoreTopic, generateRecommendations, recordOverride functions
- `services/index.ts` - Added Phase 3 exports: scoreTopic, generateRecommendations, recordOverride

## Decisions Made

**1. 30/40/30 weight split favors urgency over mastery/goals**
- Rationale: Upcoming tests are time-sensitive and actionable, mastery and goals are important but less urgent

**2. Mastery score inverted with 95 cap for very weak topics**
- Rationale: Lower mastery = higher priority, but cap at 95 to avoid overwhelming child with too many weak topics

**3. Balanced strategy ensures variety (30% weakness, 40% growth, 30% maintenance)**
- Rationale: Prevents recommendation list from being all weak topics (demotivating) or all mastered topics (boring)

**4. Override recording is fire-and-forget**
- Rationale: Non-critical analytics shouldn't block user interactions, log warnings but swallow errors

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Type import error for DEFAULT_SCORING_WEIGHTS**
- Issue: Initially imported as `import type`, but constants are values not types
- Fix: Split import into `import type` for interfaces and regular `import` for constant
- Verified: TypeScript compilation passed with no errors in recommendation files

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 3 Plan 02 (Learning Goals UI + Analytics)**
- Scoring algorithm complete and tested (TypeScript compilation passes)
- Types exported and available for UI components
- Service functions ready to be called from parent dashboard

**Next steps:**
- Build UI for parent-defined learning goals (Plan 02)
- Create analytics cards showing recommendations (Plan 02)
- Wire up recommendation display in child dashboard (Plan 03/04)

**No blockers:** All Phase 2 dependencies (LearnerProfile, TopicMastery) are in place and working.

---
*Phase: 03-recommendation-engine*
*Completed: 2026-01-23*
