---
phase: 03-recommendation-engine
plan: 02
subsystem: database
tags: [firestore, learning-goals, crud, real-time-subscription]

# Dependency graph
requires:
  - phase: 03-01
    provides: LearningGoal type, DEFAULT_SCORING_WEIGHTS (30% goal weight)
provides:
  - Learning goals CRUD operations in Firestore 'learningGoals' collection
  - Parent-defined learning targets with topic, targetDate, description
  - Real-time subscription for UI updates
  - Goals queryable by childId and subjectId
affects: [03-03-ui, 03-04-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Learning goals as first-class entities in recommendation engine"
    - "Fire-and-forget pattern for goals (no blocking on recommendations)"

key-files:
  created:
    - services/goalsService.ts
  modified:
    - services/index.ts

key-decisions:
  - "Goals support optional targetDate (null allowed) for flexible deadline management"
  - "Real-time subscription via subscribeToGoals enables reactive UI updates"
  - "Query by subject enables filtering in topic selection dropdowns"

patterns-established:
  - "Service pattern: CRUD + subscription + filter helpers"
  - "Error handling: logger.info/error + DatabaseError with cause"

# Metrics
duration: 1min
completed: 2026-01-23
---

# Phase 3 Plan 2: Learning Goals Service Summary

**Parent-defined learning goals stored in Firestore with CRUD operations and real-time subscriptions, feeding 30% goal weight in recommendations**

## Performance

- **Duration:** 1 min 8 sec
- **Started:** 2026-01-23T06:22:58Z
- **Completed:** 2026-01-23T06:24:06Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Full CRUD operations for learning goals (add, query, delete)
- Real-time subscription support for reactive UI
- Dual query methods: all goals by child, or filtered by subject
- Goals include topic, targetDate (nullable), description, and parent attribution

## Task Commits

Each task was committed atomically:

1. **Task 1: Create goalsService.ts with CRUD operations** - `e0c776d` (feat)
2. **Task 2: Export goalsService from services/index.ts** - `4cfc4d3` (feat)

## Files Created/Modified
- `services/goalsService.ts` - Learning goals CRUD with Firestore collection 'learningGoals'
- `services/index.ts` - Re-exports addLearningGoal, getLearningGoals, getGoalsBySubject, deleteLearningGoal, subscribeToGoals

## Decisions Made

**1. Optional targetDate field (null allowed)**
- Rationale: Some parent goals are aspirational without hard deadlines ("master fractions eventually")
- Implementation: targetDate: number | null in LearningGoal type
- Impact: UI must handle both dated and undated goals gracefully

**2. getGoalsBySubject separate from getLearningGoals**
- Rationale: Enables pre-filtering in UI dropdowns (only show goals for selected subject)
- Alternative: Filter in memory after getLearningGoals
- Tradeoff: Two functions vs single function + client-side filtering
- Chosen: Two functions for clarity and performance (composite Firestore query)

**3. subscribeToGoals for real-time updates**
- Rationale: Parents may add/edit goals in one tab, recommendations UI should update immediately
- Pattern: Matches existing service patterns (subscribeToChildren, subscribeToSessions)
- Implementation: onSnapshot with where clause filtering by childId

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward CRUD service following established patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 03-03 (Goals UI):**
- CRUD operations available via `import { addLearningGoal } from '@/services'`
- Real-time subscription enables reactive form/list updates
- getGoalsBySubject supports subject-filtered dropdowns

**Ready for Plan 03-04 (Recommendation Integration):**
- getLearningGoals provides all goals for scoring algorithm
- Goals include subjectId and topic for matching against recommendations
- targetDate field available for urgency calculations

**No blockers.** Goals service is a pure data layer with no external dependencies beyond Firestore.

---
*Phase: 03-recommendation-engine*
*Completed: 2026-01-23*
