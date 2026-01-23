# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Every child gets a personalized learning path that adapts to their actual needs - focusing on weaknesses, predicting mastery, and evolving with every interaction.

**Current focus:** Phase 2 Complete - Ready for Phase 3

## Current Position

Phase: 3 of 5 (Recommendation Engine) — IN PROGRESS
Plan: 2 of 4 in current phase
Status: Goals service complete
Last activity: 2026-01-23 — Completed 03-02-PLAN.md (learning goals CRUD)

Progress: [███████████████████████░] 100% (9/9 plans total across all phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 2.6 minutes
- Total execution time: 0.39 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 - Profile Foundation | 4 | 10 min | 2.5 min |
| 02 - Profile-Aware Quiz | 3 | 10 min | 3.3 min |
| 03 - Recommendation Engine | 2 | 3 min | 1.5 min |

**Recent Trend:**
- Last 5 plans: 02-02 (4 min), 02-03 (4 min), 03-01 (2 min), 03-02 (1 min)
- Trend: Excellent velocity, Phase 3 showing sub-2-min average

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

**New from 02-01:**
- Topic classification thresholds: 0.5 weak, 0.8 mastered — Matches Phase 1 BKT thresholds
- Difficulty ratio: 20/50/30 (review/target/weak) — Research-based ratio from Phase 2 context
- Frustrated ratio: 20/70/10 when frustrated — Reduce weak topics to 10% when frustration detected

**New from 02-02:**
- Fatigue detection requires BOTH rushing AND accuracy drop — Prevents false positives for fast learners
- Frustration tracking is per-topic, not global — Child can continue with other topics
- Silent topic switching — Child never sees "you are struggling" message

**New from 02-03:**
- hasProfileData check (3+ topics) for adaptive enablement — Ensures sufficient data for meaningful mixing
- Final review mode uses static generation — Even topic coverage more appropriate than adaptive mixing
- Weak/review topics get easy difficulty, learning gets medium — Scaffolding and review vs zone of proximal development

**New from 03-01:**
- 30/40/30 weight split favors urgency (upcoming tests) over mastery and goals — Time-sensitive deadlines are most actionable
- Mastery score inverted with 95 cap — Low mastery = high priority, but cap prevents overwhelming child with too many weak topics
- Balanced recommendation strategy (30% weakness, 40% growth, 30% maintenance) — Ensures variety, prevents all-weak or all-mastered lists
- Override recording is fire-and-forget — Non-critical analytics shouldn't block user interactions

**New from 03-02:**
- Optional targetDate for learning goals (null allowed) — Some goals are aspirational without hard deadlines
- getGoalsBySubject separate query — Enables pre-filtering in UI dropdowns for better UX
- Real-time goals subscription — Parents can add/edit goals in one tab, recommendations update immediately

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 2 Complete:**
- BKT parameters (pKnown, pLearn, pGuess, pSlip) need calibration with real usage data after implementation
- Gemini API cost monitoring required (batch API calls, implement caching)

**Phase 3 Readiness:**
- Gemini prompt engineering for Hebrew educational context may need iteration
- User testing with 5-10 Israeli parent families recommended before broader rollout

**Phase 5 Readiness:**
- Forgetting curve decay rates (0.95-0.98/week) may need tuning after 30-60 days of data collection
- Prerequisite relationship accuracy unknown for Israeli curriculum variations

## Session Continuity

Last session: 2026-01-23T06:24:06Z
Stopped at: Completed 03-02-PLAN.md (Learning Goals Service)
Resume file: None

---
*Last updated: 2026-01-23*
