# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Every child gets a personalized learning path that adapts to their actual needs - focusing on weaknesses, predicting mastery, and evolving with every interaction.

**Current focus:** Phase 5 Complete - All phases complete!

## Current Position

Phase: 5 of 5 (Profile Maintenance & Visualization) - COMPLETE
Plan: 6 of 6 in current phase
Status: Complete
Last activity: 2026-01-23 — Completed 05-06-PLAN.md (Decay & Alert Wiring)

Progress: [████████████████████████████████] 100% (19/19 plans total across all phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Average duration: 2.26 minutes
- Total execution time: 0.72 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 - Profile Foundation | 4 | 10 min | 2.5 min |
| 02 - Profile-Aware Quiz | 3 | 10 min | 3.3 min |
| 03 - Recommendation Engine | 4 | 8 min | 2.0 min |
| 04 - Multi-Signal Integration | 4 | 7 min | 1.75 min |
| 05 - Profile Maintenance | 6 | 12 min | 2.0 min |

**Recent Trend:**
- Last 5 plans: 05-02 (1 min), 05-01 (2 min), 05-04 (2 min), 05-05 (3 min), 05-06 (3 min)
- Trend: Outstanding velocity maintained - ALL PHASES COMPLETE

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

**New from 03-03:**
- Hook returns 5 recommendations by default (3-5 after filtering) — Ensures variety even after overrides
- Overrides stored locally in Set — Optimistic UI updates for immediate feedback
- Override recording is fire-and-forget — Non-blocking analytics pattern, error swallowing
- Loading state reflects profile loading — Profile is the only long-loading dependency, calculation is instant

**New from 03-04:**
- RecommendationsPanel lives in PlanTab (not index.tsx) — Better fit with existing tab navigation structure
- HTML5 datalist combobox for goal topics — Allows both predefined suggestions AND manual entry
- Collapsible goals section with badge count — Clean UI, goals are secondary to recommendations
- Custom topic badge ("נושא מותאם") — Visual indicator for parent-defined topics not in standard list

**New from 04-01:**
- Signal types: quiz (70%), evaluation (95%), engagement (60%), parent_note (40%) — Evidence hierarchy from ITS research
- Recency decay: 50% at 30 days — Exponential decay to reduce stale evidence impact
- Sample size boost: 10 samples for ~63% confidence — More data = higher confidence in estimate
- fuseSignals uses confidence-weighted average — Bayesian fusion for multi-source integration

**New from 04-02:**
- Four engagement levels: high/medium/low/avoidance — Matches student engagement research
- Mastery adjustments: low=-0.05, avoidance=-0.10 — Conservative penalties to confidence, not mastery
- Minimum 3 questions for engagement analysis — Too few questions gives unreliable signal
- Hebrew reasoning strings for parent dashboard — Explains assessment in native language

**New from 04-03:**
- Strong topics from evaluations set to 90% pKnown — Teacher-validated mastery with room for verification
- Weak topics from evaluations set to 30% pKnown — Substantial remediation needed
- Parent note adjustments: -0.02 to -0.05 based on category — Conservative penalties match 40% base confidence
- Engagement signal skips update when impact is zero — Avoid unnecessary writes for medium/high engagement

**New from 04-04:**
- Engagement tracking in useQuizSession — Track answer times, fire signal on completion
- Early exit signal handling — Fire engagement signal on fatigue/frustration detection
- Evaluation signal after save — Only valid evaluations trigger profile updates
- Multi-dimensional display — Signal source, engagement level, accuracy/speed/consistency in AnalysisTab

**New from 05-01:**
- Three-tier decay rates based on mastery level (95%/92%/88% weekly) — Strong knowledge decays slower than weak knowledge
- 5% minimum pKnown floor to preserve residual knowledge — Complete forgetting is cognitively unrealistic
- Immutable decay pattern (returns new objects, never mutates) — Decay is for visualization/recommendations, not profile updates
- Global ENABLED toggle for forgetting curve — Allows A/B testing or disabling without code changes

**New from 05-02:**
- Regression threshold at 0.7 (70% confidence) — Below typical learning/mastery boundary, indicates significant concern
- Mastery threshold at 0.8 (80%) for regression alerts — Only alert when truly mastered content regresses
- 14-day cooldown per topic — Prevents alert fatigue while allowing intervention time
- 10% minimum drop threshold — Reduces noise from normal BKT variance (e.g., 0.85 -> 0.78 won't alert)

**New from 05-03:**
- Initial probe interval 28 days (4 weeks) per SM-2 standard — Research-backed spaced repetition timing
- Probe interval doubles on success up to 168 days (24 weeks) — Prevents over-spacing while rewarding consistent mastery
- Failed probes demote pKnown to 0.75 — Significant penalty but recoverable, triggers re-learning
- Review mode triggers at 21+ day gap (3 weeks) — Balances retention and session frequency
- Review questions 30% of quiz in review mode — Significant but not overwhelming refresh
- Max 2 probe topics per quiz — Avoids probe overload

**New from 05-04:**
- 0.7 minimum confidence threshold for AI prerequisite suggestions — Filters low-quality AI output
- gradeToNumber() extracts numeric grade (1-8) from Hebrew enum — Clearer AI prompts
- Graceful degradation returns empty array on API failure — Non-blocking feature
- Hebrew prompts with examples for Gemini — Better AI output for Israeli curriculum context

**New from 05-05:**
- Minimum 3 topics required for radar chart display — Radar needs 3+ points for meaningful polygon
- Maximum 8 topics in radar chart — More than 8 makes labels unreadable
- Session accuracy as historical mastery proxy — pKnown snapshots not stored (future enhancement)
- RTL tooltip and legend configuration for recharts — Proper Hebrew support

**New from 05-06:**
- decayedProfile computed via useMemo in hook — Auto-updates when profile changes without manual refresh
- 8 second auto-dismiss timeout for notifications — Balance between visibility and non-intrusiveness
- Subjects passed to useLearnerProfile — Enable subject name lookup for alert messages
- getProfileWithDecay wrapper in profileService — Read-only decay for recommendations/display

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 2 Complete:**
- BKT parameters (pKnown, pLearn, pGuess, pSlip) need calibration with real usage data after implementation
- Gemini API cost monitoring required (batch API calls, implement caching)

**Phase 3 Readiness:**
- Gemini prompt engineering for Hebrew educational context may need iteration
- User testing with 5-10 Israeli parent families recommended before broader rollout

**Phase 4 Complete:**
- Signal weights (70/95/60/40) based on ITS research, may need tuning with real data
- Engagement thresholds (30s per question, 70% completion) are initial estimates

**Phase 5 Complete:**
- Forgetting curve decay rates (0.95/0.92/0.88/week) are research-based estimates, may need tuning after 30-60 days of data collection
- Probe interval calibration for SM-2 algorithm (Plan 03) will require real user data
- Prerequisite relationship accuracy unknown for Israeli curriculum variations
- Visualization charts ready for integration into parent dashboard

## Session Continuity

Last session: 2026-01-23T19:00:00Z
Stopped at: Completed 05-06-PLAN.md (Decay & Alert Wiring) - ALL PHASES COMPLETE
Resume file: None

---
*Last updated: 2026-01-23*
