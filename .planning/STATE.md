# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Every child gets a personalized learning path that adapts to their actual needs - focusing on weaknesses, predicting mastery, and evolving with every interaction.

**Current focus:** Phase 1 Complete - Ready for Phase 2

## Current Position

Phase: 1 of 5 (Profile Foundation) — COMPLETE
Plan: 4 of 4 in current phase
Status: Phase complete, verified
Last activity: 2026-01-22 — Completed Phase 1 verification (6/6 must-haves)

Progress: [██████████] 100% (Phase 1)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 2.5 minutes
- Total execution time: 0.17 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 - Profile Foundation | 4 | 10 min | 2.5 min |

**Recent Trend:**
- Last 4 plans: 01-01 (2 min), 01-02 (2 min), 01-03 (2 min), 01-04 (4 min)
- Trend: Consistent velocity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Key decisions affecting current work:
- Fresh profile start (no history bootstrap) — Cleaner data, avoid noise from old sessions
- Parents only see analytics — Protect child motivation, avoid "weakness" framing
- Focus quizzes on weaknesses — Most efficient learning path
- Full parent control over AI — Parent authority over child's education
- Full learning model (not simple tracking) — Maximize value of AI, predict mastery

**New from 01-01:**
- Grade-band-specific BKT parameters (1-3, 4-6, 7-8) — Different age groups need different learning/slip rates
- Mastery thresholds: weak (<0.5), learning (0.5-0.8), mastered (>=0.8) — Standard educational research thresholds
- 10-attempt performance window with 6-attempt minimum for trends — Balance responsiveness with statistical validity

**New from 01-02:**
- Subcollection storage at /children/{childId}/learnerProfile/main — Prevents bloating children queries, enables independent subscriptions
- Fire-and-forget pattern for profile updates — Update failures never block quiz completion flow
- Lazy profile initialization (null until first quiz) — Avoids unnecessary writes for inactive children
- Chronological replay for bootstrapProfile — Order-sensitive BKT requires correct session sequencing

**New from 01-03:**
- useLearnerProfile hook accepts full ChildProfile object (not just childId) — Enables access to familyId and grade for bootstrap
- Auto-bootstrap one-time attempt per child tracked via ref — Prevents infinite loops if bootstrap fails
- Hook helper functions (getTopicsByMastery, getConfidenceLevel) — UI-ready profile data filtering and quality indicators

**New from 01-04:**
- TopicMasterySection with React.memo for performance — Prevents unnecessary re-renders when profile data unchanged
- Weak topics displayed first (priority ordering) — Focus parent attention on areas needing improvement
- Summary stats grid with mastered/learning/weak counts — Quick overview before detailed cards
- Subject filter affects topic display — Consistent with existing AnalysisTab filtering

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 2 Readiness:**
- BKT parameters (pKnown, pLearn, pGuess, pSlip) need calibration with real usage data after implementation
- Gemini API cost monitoring required (batch API calls, implement caching)

**Phase 3 Readiness:**
- Gemini prompt engineering for Hebrew educational context may need iteration
- User testing with 5-10 Israeli parent families recommended before broader rollout

**Phase 5 Readiness:**
- Forgetting curve decay rates (0.95-0.98/week) may need tuning after 30-60 days of data collection
- Prerequisite relationship accuracy unknown for Israeli curriculum variations

## Session Continuity

Last session: 2026-01-22
Stopped at: Phase 1 complete, ready for BTP deployment and user testing
Resume file: None

---
*Last updated: 2026-01-22*
