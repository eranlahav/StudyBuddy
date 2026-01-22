# Roadmap: Adaptive Learning Profiles

## Overview

Transform Study Buddy from a quiz generator into an adaptive learning system that builds comprehensive profiles tracking each child's knowledge, predicts mastery, and personalizes their learning path. The roadmap progresses from foundational data collection (Phase 1) through AI-powered personalization (Phase 2), transparent recommendations with parent control (Phase 3), multi-signal enrichment (Phase 4), and long-term profile accuracy maintenance (Phase 5).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Profile Foundation** - Data collection schema and BKT algorithm implementation
- [ ] **Phase 2: Profile-Aware Quiz Generation** - Personalize questions based on learner profiles
- [ ] **Phase 3: Recommendation Engine** - AI-powered topic suggestions with parent control
- [ ] **Phase 4: Multi-Signal Integration** - School tests and engagement tracking
- [ ] **Phase 5: Profile Maintenance & Visualization** - Forgetting curves, regression detection, analytics UI

## Phase Details

### Phase 1: Profile Foundation
**Goal**: Establish data collection and profile schema that learns from every quiz without cold-start assessment

**Depends on**: Nothing (first phase)

**Requirements**: PROF-01, PROF-02

**Success Criteria** (what must be TRUE):
1. Parent can view child's topic mastery list in AnalysisTab showing which topics are mastered/learning/weak
2. Profile automatically updates after each quiz completion without blocking UI
3. Profile bootstraps from existing quiz sessions (no upfront assessment required)
4. Each topic shows mastery probability, practice count, and last practice date
5. Profile schema supports future extensions (speed, consistency, question type breakdown)

**Plans**: 4 plans in 4 waves

Plans:
- [x] 01-01-PLAN.md — Core types and BKT algorithm (types.ts, lib/learnerModel.ts)
- [x] 01-02-PLAN.md — Profile and signal services (Firestore CRUD, signal processing)
- [x] 01-03-PLAN.md — Store integration and useLearnerProfile hook
- [x] 01-04-PLAN.md — UI integration in AnalysisTab with topic mastery display

### Phase 2: Profile-Aware Quiz Generation
**Goal**: Quiz questions adapt to child's profile, focusing on weaknesses while maintaining challenge balance

**Depends on**: Phase 1

**Requirements**: ADAPT-01, ADAPT-02

**Success Criteria** (what must be TRUE):
1. Child with 80% topic mastery receives harder questions than child with 40% mastery
2. Quiz includes difficulty mixing ratio: 20% review (mastered), 50% target (current level), 30% weak (capped)
3. Frustration circuit breakers trigger topic switch after 3 consecutive wrong answers
4. BKT parameters differ by grade level (grades 1-3 vs 4-6 vs 7-8)
5. Quiz stops early if child rushes through last 5 questions (fatigue detection)

**Plans**: 3 plans in 3 waves

Plans:
- [ ] 02-01-PLAN.md — Core types and adaptive quiz service (difficulty mixing, topic classification)
- [ ] 02-02-PLAN.md — Fatigue and frustration tracking in useQuizSession hook
- [ ] 02-03-PLAN.md — Profile-aware Gemini generation and integration

### Phase 3: Recommendation Engine
**Goal**: AI suggests prioritized next topics with transparent reasoning and full parent override control

**Depends on**: Phase 2

**Requirements**: REC-01, REC-03, PARENT-01, PARENT-02, PARENT-03, PARENT-04

**Success Criteria** (what must be TRUE):
1. Parent sees 3-5 recommended topics in dashboard with expandable "Why?" explanations
2. Recommendations show confidence levels ("Confident: 25+ questions" vs "Initial estimate: 1-7 questions")
3. Each recommendation displays reasoning: test urgency + topic weakness + parent goals
4. Parent can override any recommendation with captured rationale ("Too easy" / "Too hard" / "Wrong priority")
5. Recommendations balance weakness remediation (30%), growth (40%), and maintenance (30%)
6. Parent can set learning targets (e.g., "master fractions by June") that influence recommendations

**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 4: Multi-Signal Integration
**Goal**: Profile learns from school tests and engagement patterns, not just quiz performance

**Depends on**: Phase 3

**Requirements**: SIGNAL-01, SIGNAL-02, SIGNAL-03

**Success Criteria** (what must be TRUE):
1. School evaluation upload automatically updates topic mastery based on teacher-validated results
2. Evaluation signals weigh higher than quiz signals in profile calculations
3. Profile tracks engagement metrics: time spent per session, learning velocity, completion rate
4. Profile detects low engagement level and adjusts recommendations
5. Parent notes added during quiz ("she guessed on #3") feed into profile confidence calculations
6. Topic mastery displays multiple dimensions: accuracy, speed, consistency, question type breakdown

**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 5: Profile Maintenance & Visualization
**Goal**: Profiles stay accurate over time with forgetting curves, regression detection, and comprehensive analytics UI

**Depends on**: Phase 4

**Requirements**: PROF-03, REC-02

**Success Criteria** (what must be TRUE):
1. Mastered topics without practice for 8 weeks decay to 66% confidence (forgetting curve applied)
2. Probe questions verify mastery every 4-6 weeks (demote if wrong, refresh if right)
3. First session after 3+ week gap enters "Welcome back! Quick review" mode with 30% review questions
4. Parent receives alert if previously-mastered topic drops below 70% accuracy ("יעל נראית מתקשה בכפל")
5. Parent dashboard displays skill radar chart showing pKnown across all skills in subject
6. Parent dashboard shows progress timeline (line chart of mastery over time)
7. AI detects prerequisite relationships and shows "Fix X first, then Y will make sense" rationale

**Plans**: TBD

Plans:
- [ ] TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Profile Foundation | 4/4 | ✓ Complete | 2026-01-22 |
| 2. Profile-Aware Quiz Generation | 0/3 | Planned | - |
| 3. Recommendation Engine | 0/TBD | Not started | - |
| 4. Multi-Signal Integration | 0/TBD | Not started | - |
| 5. Profile Maintenance & Visualization | 0/TBD | Not started | - |

---
*Last updated: 2026-01-22*
