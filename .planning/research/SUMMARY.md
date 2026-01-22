# Project Research Summary

**Project:** Study Buddy - Adaptive Learning Profiles
**Domain:** Educational Technology - Personalized Learning Systems
**Researched:** 2026-01-22
**Confidence:** MEDIUM-HIGH

## Executive Summary

Adaptive learning profiles personalize education by tracking student knowledge, predicting performance, and recommending next steps. For Study Buddy, the optimal approach is to **extend the existing React/Firebase/Gemini stack** with a custom Bayesian Knowledge Tracing (BKT) implementation—no new dependencies needed. The current architecture provides all necessary primitives for effective learner modeling.

The recommended approach combines BKT for probabilistic skill tracking with rule-based adjustments that respect parent control. This hybrid model addresses the core trust gap that causes most adaptive systems to fail: parents feel locked out of their child's education when algorithms operate as black boxes. Study Buddy's differentiator is **parent authority over AI recommendations**, matching Israeli cultural expectations of high parental involvement.

The most critical risk is the **Cold Start Death Spiral**—demanding too much upfront assessment before providing value, causing 60-80% abandonment during onboarding. Prevention: bootstrap profiles from Study Buddy's existing quiz history (sessions already contain performance data), use grade-level defaults, and gather data progressively through normal quiz flow rather than separate assessments. Secondary risks include over-drilling weak topics (demotivation), black-box recommendations (trust erosion), stale profiles (forgetting curves not modeled), and API cost explosion. All are preventable with pedagogical constraints, explainability, confidence decay, and caching built into the initial implementation.

## Key Findings

### Recommended Stack

**Zero new dependencies.** The existing Study Buddy stack (React 18.2, TypeScript, Firebase Firestore 12.7, Gemini 1.34) provides everything needed for adaptive learning profiles. Implement custom BKT algorithm (~150 LOC of pure JavaScript math) rather than using outdated educational tech libraries. This approach ensures parent override hooks, avoids licensing concerns, and maintains full control over recommendation logic.

**Core technologies:**
- **React + Custom Hooks** — Existing useQuizSession pattern extends naturally to useLearnerProfile for profile state management with real-time Firestore subscriptions
- **Firebase Firestore** — Real-time sync for live profile updates; subcollections (`/children/{childId}/learnerProfile`) store profiles without bloating main documents
- **Gemini AI** — Current integration (geminiService.ts) extends to semantic topic extraction via extractTopicDependencies() and prerequisite relationship detection
- **TypeScript** — Critical for complex profile data structures (LearnerProfile, TopicMastery, SkillState, BKTParams types)
- **Recharts** — Already installed for AnalysisTab; extends to skill mastery radar charts, progress timelines, and trend visualizations
- **Custom BKT Implementation** — Bayesian Knowledge Tracing for probabilistic skill modeling; proven in Khan Academy, Duolingo, Carnegie Learning Cognitive Tutor

**Rationale for zero dependencies:**
- Educational tech libraries (bayesiankt, edm-js) are unmaintained or enterprise-focused (LMS platforms)
- BKT algorithm is simple probability math—trivial to implement and test
- Custom implementation provides parent override hooks (commercial tools don't support this)
- No licensing concerns for parent-facing product
- Full control over parameter tuning for Hebrew/Israeli curriculum context

**Key architectural insight:** Study Buddy already has signal-driven patterns (quiz completion → session storage → state updates). Adaptive profiles layer naturally onto this: quiz signals → profile updates → recommendation generation. The store.tsx Context + services/ + hooks/ architecture extends cleanly without refactoring.

### Expected Features

Research across educational platforms (Khan Academy, IXL, Duolingo, Carnegie Learning) reveals a clear three-tier feature landscape: table stakes (users expect these), differentiators (competitive advantages), and anti-features (deliberately avoid).

**Must have (table stakes):**
- **Knowledge state visualization** — Dashboard showing mastered/learning/weak topics with red/yellow/green color coding; parents need "at a glance" understanding
- **Performance-based difficulty** — Auto-level adjustment based on topic mastery trends, not just static grade level; per-topic proficiency tracking
- **Mistake pattern analysis** — "Your child often confuses ב and כ" specific insights, not just aggregate scores; error categorization by type
- **Personalized recommendations** — "Practice these 3 topics next" with priority ranking based on test urgency + topic weakness + parent goals
- **Historical progress tracking** — Session history with score trends, time spent per subject/topic, streak gamification (already have streak in ChildProfile)

**Should have (competitive differentiators):**
- **Parent override authority** — Manual proficiency editing, AI suggestion rejection ("No, my child needs harder content" button), custom topic goals; most systems (Khan Academy, IXL) don't allow deep customization; builds trust through control
- **Multimodal knowledge capture** — Scan school tests (already implemented via analyzeEvaluationDocument), parse uploaded report cards, parent observation notes; unifies school + home learning
- **Prerequisite chain visualization** — "Fractions → Decimals → Percentages" dependency graph showing "what unlocks what"; most systems show flat topic lists
- **Predictive readiness scoring** — "Sarah is 73% ready for Thursday's test" with confidence intervals; reduces pre-test anxiety with concrete "you're ready" signal; matches Israeli test-focused culture
- **Family context integration** — Multi-child comparison ("Yoni mastered this faster than Noa"), sibling learning paths; Israeli families average 3+ children; Study Buddy already has multi-tenant architecture (familyId)

**Defer (v2+):**
- **Voice note observations** — "Sarah mixed up ב and כ today" audio recording; requires audio infrastructure + transcription; faster than typing for busy parents but adds complexity
- **Prerequisite graph visualization** — Complex UI (Sankey diagrams or force-directed graphs); high implementation cost, lower immediate ROI; AI-inferred prerequisites sufficient for v1 recommendations
- **What-if scenario modeling** — "One more practice → 90% ready" predictions; requires validated baseline + calibration data (50+ test outcome pairs)
- **Social features** — Study groups, sharing scores, public profiles; privacy concerns for children, moderation burden, comparison anxiety; defer until post-v1

**Critical anti-features (deliberately avoid):**
- **Fully automated curriculum** — "AI decides everything" with no parent control; prominent failure case: AltSchool (closed 2019)—parents felt "locked out"; trust requires transparency + manual override
- **Over-gamification** — Badges/points everywhere, leaderboards, prize unlocking; extrinsic motivation crowds out intrinsic learning; Israeli parents value cooperation > competition
- **Real-time performance pressure** — Live parent monitoring, instant "wrong answer" notifications, timers on every question; growth mindset research (Dweck) shows constant monitoring increases anxiety especially in elementary grades
- **Predictive labeling** — "Your child is below average", IQ/ability estimates, diagnostic categories ("dyscalculia"); educational apps should not diagnose learning disabilities (medical territory); stick to observable behaviors
- **Social features in v1** — Privacy issues for children, comparison anxiety, moderation burden; Israeli data protection laws (similar to GDPR) require strict child data controls

### Architecture Approach

Adaptive learning systems follow a **signal-driven architecture** where learning events generate signals that update a central profile, which then drives personalization decisions. Study Buddy's existing Context + Services + Hooks pattern extends naturally to this model.

**Signal flow:**
```
Learning Events → Signal Adapters → Profile Updater → Learning Profile (Firestore)
                                                              ↓
                                                    ┌─────────┴─────────┐
                                                    ↓                   ↓
                                          Recommendation Engine    Quiz Generator
                                                    ↓                   ↓
                                             Suggested Topics    Personalized Questions
```

**Major components:**

1. **Signal Adapters (services/signalService.ts)** — Transform domain events (quiz completion via addSession, evaluation upload via analyzeEvaluationDocument) into normalized LearningSignal objects; each adapter extracts relevant data (topic, correctness, time spent) from existing session/evaluation structures

2. **Profile Updater (lib/learnerModel.ts + services/profileService.ts)** — Aggregates signals using BKT algorithm (updateBKT function) and forgetting curves (applyForgetting function); updates LearningProfile documents in Firestore asynchronously (fire-and-forget pattern, UI doesn't block); handles weighted recency (recent performance weighs more via exponential decay)

3. **Learning Profile (Firestore)** — Single document per child at /children/{childId}/learnerProfile with topic-level TopicMastery records, performance trends (performanceWindow: last 30 days), parent overrides (ParentOverride array); subcollections at /children/{childId}/profileHistory/{date} store snapshots for archival without bloating main document

4. **Recommendation Engine (services/recommendationService.ts)** — Gemini-powered service that consumes LearningProfile to suggest next topics; balances weakness remediation (max 30% of recommendations), strength building (70%), and prerequisite detection; respects parent overrides (ParentOverride takes precedence over AI)

5. **Quiz Generator Adapter (modify existing geminiService.ts)** — Extends generateQuizQuestions() with optional profile: LearnerProfile parameter; modifies AI prompts based on mastery trends ("Student has mastered basics. Include advanced questions."), answer speed ("Student takes time to think. Avoid trick questions."), and recent performance ("Struggling recently. Start easier to rebuild confidence.")

**Key patterns to follow:**

- **Signal-first updates** — Every learning activity generates a signal that updates profile asynchronously; profile builds incrementally over time; UI never waits for profile calculations
- **Profile-aware AI prompts** — Personalization happens at prompt construction, not post-processing; modify Gemini prompts based on pKnown (mastery probability), recentTrend (improving/stable/declining), averageTime (speed indicator)
- **Lazy profile initialization** — Create profile on first quiz, not at child creation; avoids empty profiles; first quiz uses grade defaults, subsequent quizzes use accumulated data
- **Weighted recency** — Recent performance weighs more than old data via exponential weighting (e.g., Math.exp(-0.1 * age)); learning is dynamic; old struggles shouldn't penalize current mastery
- **Multi-signal aggregation** — Combine signals from quizzes (frequency), evaluations (teacher-validated, weighted higher), engagement (time spent, learning velocity); holistic learner view

**Anti-patterns to avoid:**

- **Profile bloat** — Never store full session history in profile document (Firestore 1MB limit); store aggregates only (correctRate, attempts, lastAttempt); keep raw sessions in separate collection
- **Synchronous updates** — Never block UI on profile calculations; use fire-and-forget pattern with error logging; profile updates can fail without breaking quiz flow
- **Over-personalization** — Don't tailor every question to current level (removes challenge); zone of proximal development: 70% mastered + 30% challenging questions
- **Static difficulty mapping** — Don't hard-code "Grade 1 = easy"; use profile-driven difficulty (if mastery > 70% and improving → hard; if declining → easy)
- **Recommendation tunnel vision** — Don't only recommend weak topics; balance weakness (30%), growth (40%), maintenance (30%); avoid "study what you're bad at" demotivation

**Scalability considerations:** Study Buddy is family-scale app (likely <100 concurrent users). Simple architecture appropriate: single Firestore doc per child, client-side signal processing, no caching layer, AI on-demand, subscription-based updates (existing onSnapshot pattern). Upgrade when profile reads >1000/day per child or AI costs >$100/month.

### Critical Pitfalls

Top 5 pitfalls that cause system abandonment, trust loss, or pedagogical harm:

1. **The Cold Start Death Spiral** — System demands too much upfront assessment (30+ min) before providing value; parents/children abandon during lengthy initial profiling; or system makes terrible recommendations with insufficient data, creating negative first impression. **Prevention:** (a) Bootstrap from existing context—Study Buddy already has grade level, completed sessions, subject proficiency settings; mine 5-10 existing sessions for initial profile. (b) Progressive profiling—gather data through normal quiz flow, not separate assessment; first session useful but generic, fifth session personalized. (c) Transparent bootstrapping—show "Building personalized profile... 8/20 sessions" progress indicator. **Detection:** >40% drop-off during initial profile setup, average time-to-first-value >15 minutes, high uninstall rate before 3rd session.

2. **The Over-Drilling Demotivation Trap** — System identifies weakness and relentlessly drills same topic/question type; child perceives quizzes as punishment; motivation collapses; parents see child crying/refusing to use app. **Prevention:** (a) Spaced repetition, not spam repetition—maximum 30% of questions on identified weak topic per quiz; interleave with mastered content (success experiences); enforce minimum 24-48 hour gap before re-drilling same concept. (b) Difficulty mixing ratio—"Success sandwich": 20% review (mastered), 50% target (current level), 30% weak (capped). (c) Frustration circuit breakers—3 consecutive wrong answers on same topic → switch topics; session abandonment detection (>2 min inactive) → save and exit gracefully; 4 wrong in 5 questions → reduce complexity. (d) Parent control overrides—"Focus intensity" slider (gentle → aggressive), "Allow frustration breaks" toggle, manual topic exclusion. **Detection:** Session completion rate drops >20% after profile activation, same child's quiz frequency drops week-over-week, >40% of sessions with no correct answers in second half.

3. **The Black Box Trust Problem** — System recommends focus areas or difficulty changes with no explanation; parents don't understand WHY; they override/ignore recommendations or abandon system entirely. **Prevention:** (a) Explain every recommendation—"מומלץ להתמקד בהטיות פעלים / Why? 4 מתוך 7 שאלות אחרונות היו שגויות בנושא זה / זהו נושא יסודי לכיתה ג׳ / שליטה בנושא זה תשפר ביצועים בהבנת הנקרא" (expandable reasoning). (b) Transparent data display—parent dashboard shows WHAT data feeds profile; per-topic accuracy breakdown (not just aggregate score); timeline view of recommendations. (c) Confidence levels on recommendations—"בטוח מאוד (25+ שאלות)" vs "בטוח בינוני (8-24 שאלות)" vs "מעריך ראשוני (1-7 שאלות)". (d) Override + feedback loop—every recommendation has "Disagree?" button; capture parent rationale ("Too easy" / "Too hard" / "Wrong priority"); use feedback to tune algorithm. **Detection:** Low engagement with recommendations (<30% click-through), high override percentage, parent survey mentions "confusing" or "opaque".

4. **The Stale Profile Problem** — Child masters topic but system keeps drilling it; or child forgets material during vacation but system assumes mastery; profile becomes inaccurate, recommendations irrelevant. **Prevention:** (a) Confidence decay over time—proficiency confidence degrades without reinforcement; procedural skills (multiplication, spelling) decay 0.95/week; conceptual skills (grammar rules) decay 0.98/week; after 8 weeks without practice, procedural confidence drops to 0.66 (needs refresh). (b) Probe questions for verification—every 4-6 weeks, include 1-2 "mastered topic" questions; if child gets them wrong → demote proficiency level; if right → refresh confidence timestamp. (c) Seasonal adjustments—detect long gaps (>3 weeks inactive); first session after gap: "Welcome back! Quick review" mode with 30% review questions, 70% current level. (d) Regression detection—track rolling accuracy per topic (last 10 questions); if previously-mastered topic drops below 70% → flag for review; alert parent "יעל נראית מתקשה בכפל - מומלץ חזרה קצרה". **Detection:** Children bored during sessions (mastered content repeated), accuracy drops on topics marked "mastered" 3+ months ago, parents manually override difficulty upward frequently.

5. **The Data Overfitting Trap** — System over-indexes on recent performance (last 3-5 questions), creates wild swings in recommendations; child has one bad day → system thinks they're struggling everywhere; child gets lucky on hard questions → system advances too fast. **Prevention:** (a) Rolling windows, not point estimates—use last 20/50/all-time questions with 50%/30%/20% weighting (medium-term baseline + short-term trend + long-term context). (b) Statistical confidence thresholds—minimum sample sizes before updating profile: new weakness requires 5+ wrong out of 7 questions (71%+ error rate); new mastery requires 10+ right out of 12 questions (83%+ accuracy). (c) Outlier detection—if sessionAccuracy < (avgAccuracy - 2 * stdDev), down-weight this session (likely anomaly: tired, distracted, sick). (d) Change rate limiting—proficiency can only move 1 level per week; "easy → medium" allowed, "easy → hard" blocked; prevents whiplash from lucky/unlucky streaks. **Detection:** Proficiency level changes >2x per week for same child, recommendation topics change drastically between consecutive sessions, high variance in session scores.

**Additional moderate pitfalls:**
- **API Cost Explosion** — Each quiz generates 3-5 Gemini calls; with adaptive profiling, add 2-3 more per session; costs explode from $50 to $500/month at scale. Prevention: batch API calls (generate 5 quizzes at once, cache), lazy evaluation (recommendations only if parent expands panel), cost monitoring (alert if child exceeds $2/month).
- **Schema Migration Nightmare** — Initial profile schema too simple; later need to add dimensions; Firestore migration of live user data breaks production. Prevention: version all profile documents (version: 2 field), write migrations upfront, additive changes only (optional fields), test migrations on sample data.
- **Real-Time Data Race** — Parent viewing dashboard while child takes quiz; real-time updates cause UI flashing, stale data, conflicting writes; profile updates lost. Prevention: Firestore transactions for critical writes (runTransaction), optimistic UI with rollback, read-only parent view during active quiz.
- **Silent Failure Syndrome** — Profile calculation throws error (division by zero, null reference); error caught but not logged; profile never updates; parent doesn't know system is broken. Prevention: log all profile calculation errors (logger.error with childId context), health check indicator ("Profile last updated: 2 minutes ago ✓"), graceful degradation (use last known good profile), error budgets (alert if >5% of profile updates fail).

## Implications for Roadmap

Based on research findings, suggested 5-phase structure with clear dependency ordering:

### Phase 1: Profile Foundation
**Rationale:** Prove data collection works before adding intelligence. Bootstrap from existing quiz history to avoid cold start trap. Foundation before intelligence prevents building on unstable base.

**Delivers:**
- LearnerProfile, TopicMastery, SkillState types in types.ts
- profileService.ts (getProfile, updateProfile, subscribeToProfile) — Firestore CRUD with real-time subscriptions
- lib/learnerModel.ts — BKT algorithm implementation (updateBKT, recommendDifficulty, applyForgetting pure functions)
- signalService.ts — processQuizSignal extracts topic performance from StudySession, updates TopicMastery records
- Integrate with store.tsx — add profiles: Record<string, LearnerProfile> to context; call processQuizSignal after addSession
- Basic UI — display topic mastery list in ChildDetails > AnalysisTab; "You've mastered X topics" summary

**Addresses:**
- **Cold Start Death Spiral (Pitfall #1)** — Bootstrap from existing sessions collection; use grade-level defaults for new children; no upfront assessment demanded
- **Privacy Perception Gap (Pitfall #9)** — Design privacy-conscious schema from start; store aggregates not raw questions; implement data retention policies (90-day question deletion)
- **Schema Migration Nightmare (Pitfall #12)** — Add versioning (version: number field) and extensibility (optional fields) from day 1
- **Mono-Dimensional Profile (Pitfall #6)** — Design extensible schema even if only using accuracy initially; add speed, consistency, questionTypeBreakdown fields as optional for future phases

**Avoids:**
- Profile bloat (store aggregates only, reference sessions collection for raw data)
- Upfront assessment trap (passive data gathering through normal quiz flow)

**Estimated complexity:** 2-3 days
**Research flag:** Standard patterns (React hooks + Firestore subscriptions); no additional research needed

---

### Phase 2: Profile-Aware Question Generation
**Rationale:** Visible value to users quickly. Proves personalization works. Uses Phase 1 profile data to adapt quiz difficulty and question selection.

**Delivers:**
- Extend geminiService.generateQuizQuestions() with optional profile: LearnerProfile parameter
- Prompt modifiers based on mastery (if pKnown > 0.8 → "Include advanced questions"), trends (if recentTrend === 'declining' → "Start easier to rebuild confidence"), speed (if averageTime > 120 → "Avoid trick questions, focus on conceptual understanding")
- Update useQuizSession hook to fetch profile before loading questions; pass profile to generateQuizQuestions
- Test personalization (Quiz A: student with 80% mastery → harder questions; Quiz B: student with 40% mastery → easier questions)
- Implement BKT parameter defaults by grade (BKT_DEFAULTS: grades_1_3, grades_4_6, grades_7_8 with different pKnown/pLearn/pGuess/pSlip values)

**Addresses:**
- **Over-Drilling Demotivation (Pitfall #2)** — Implement difficulty mixing ratio (20% review, 50% target, 30% weak capped); frustration circuit breakers (3 consecutive wrong → switch topics); hard time/question limits by grade (kita1_2: 10 questions max, kita7_8: 25 questions max)
- **"One More Question" Fatigue (Pitfall #10)** — Adaptive stopping (if confidence threshold reached → end quiz early); fatigue detection (if last5AvgTime < first5AvgTime * 0.6 → rushing, trigger early stop); break recommendations (after 10 questions: "רוצה הפסקה קצרה?")
- **Data Overfitting (Pitfall #5)** — Rolling windows (last 20/50/all-time with 50%/30%/20% weighting); minimum sample sizes (5+ wrong out of 7 for new weakness); outlier detection (down-weight sessions >2 std dev from mean); change rate limiting (max 1 proficiency level change per week)

**Uses:**
- Gemini AI (existing geminiService.ts integration)
- Custom BKT algorithm (implemented in Phase 1)
- Existing StudySession enrichment (add skillsTested, skillPerformance fields)

**Avoids:**
- Over-personalization (70% mastered + 30% challenging mix; zone of proximal development)
- Static difficulty mapping (profile-driven recommendations instead of grade-based assumptions)
- Real-time adaptation during quiz (adapt NEXT quiz based on THIS quiz's results, not mid-session)

**Estimated complexity:** 3-4 days (includes BKT implementation + parameter tuning)
**Research flag:** BKT parameters (pKnown, pLearn, pGuess, pSlip) well-documented but may need calibration with real usage data; monitor parent feedback on difficulty accuracy

---

### Phase 3: Recommendation Engine
**Rationale:** AI recommendations shine with rich profile data. Needs Phase 1 history + Phase 2 proficiency calculations mature. Core value proposition ("AI knows what my child needs") becomes visible.

**Delivers:**
- recommendationService.ts — generateTopicRecommendations(childId, profile, availableSubjects) calls Gemini with profile data; returns ranked TopicRecommendation[] with reason ('weakness' | 'growth' | 'maintenance' | 'exploration') and priority
- "Recommended for you" section in parent dashboard — max 3-5 topics with expandable "Why?" explanations ("4 of 7 recent questions incorrect" + "Test in 6 days" + "Foundational skill for grade level")
- Explainability for every recommendation — confidence levels ("Confident: 25+ questions" vs "Initial estimate: 1-7 questions"); reasoning display (test urgency + topic weakness + parent goals)
- Parent override UI with feedback capture — "Disagree?" button captures rationale ("Too easy" / "Too hard" / "Wrong priority" / "Other"); override tracking in Firestore (ParentOverride array with appliedAt, expiresAt, reason)
- Recommendation throttling — max 3 per session, max 5 per week, minDaysBetween: 2 for same recommendation, suppressAfterIgnore: 7 days if parent dismisses

**Addresses:**
- **Black Box Trust Problem (Pitfall #3)** — Transparent explanations for every recommendation; confidence levels based on sample size; override + feedback loop; auditable decisions (store WHY each question selected in session metadata)
- **Recommendation Spam (Pitfall #8)** — Rule of 3 (maximum 3 recommendations per session); prioritize by impact × confidence × recency; tiered urgency (CRITICAL: foundational gaps blocking progress; RECOMMENDED: optimization opportunities; FYI: observational insights); positive framing balance (for every weakness, show one strength)
- **Recommendation Tunnel Vision (Anti-pattern #5)** — Balance weakness remediation (30% of recommendations), growth (40%), maintenance (30%); don't only recommend weak areas; celebrate mastery, not just fix gaps

**Implements:**
- Hybrid BKT + rule-based recommendations (BKT provides pKnown probabilities, rules provide pedagogical constraints)
- Multi-signal aggregation (quiz + evaluation data with weighting: evaluation signal > quiz signal for teacher-validated content)
- Prerequisite detection (Gemini-inferred, not graph visualization yet) — extractTopicDependencies(subject, topics, grade) identifies "what must be mastered FIRST"

**Avoids:**
- Fully automated curriculum (always allow manual control; suggestions not mandates)
- Comparative ranking trap (mastery-based language: "You've mastered 12 of 18 topics" not "You're better than 60% of students")
- Predictive labeling ("Not yet mastered" instead of "failed"; "Practicing X" instead of "weak at X")

**Estimated complexity:** 2-3 days
**Research flag:** Gemini prompt engineering for recommendations may need iteration; test with 5-10 families to tune recommendation scoring before broader rollout

---

### Phase 4: Multi-Signal Integration
**Rationale:** Advanced feature requiring mature profile system. Leverages existing evaluation analysis (analyzeEvaluationDocument already implemented). Enriches profiles with school test data and engagement metrics.

**Delivers:**
- processEvaluationSignal(evaluation, profile) — extracts weak/strong topics from school tests via existing analyzeEvaluationDocument; updates topic mastery based on teacher-validated results; evaluation signal weighted higher than quiz signal (teacher-validated > self-practice)
- Engagement tracking — track time spent per session (add StudySession.duration field); calculate learningVelocity (questions/hour); determine engagementLevel ('high' | 'medium' | 'low') based on frequency + completion rate
- Signal weighting — evaluation > quiz (school tests set baseline), recent > old (recency weighting via exponential decay), completed > abandoned (down-weight incomplete sessions)
- Enhanced TopicMastery with multi-dimensional tracking — add speed (averageTime: seconds per question), consistency (low variance = confident, high variance = shaky), questionTypeBreakdown (performance by format: multipleChoice, openEnded, matching)

**Addresses:**
- **Multimodal knowledge capture (Differentiator)** — Already have scan tests via geminiService.analyzeEvaluationDocument; integrate into profiles; unifies school + home learning
- **Mono-Dimensional Profile mistake (Pitfall #6)** — Add speed, consistency, question type dimensions beyond just accuracy; separate concerns in recommendations ("Focus on דקדוק" vs "Practice timed challenges" vs "Try more open-ended questions")

**Uses:**
- Existing geminiService.analyzeEvaluationDocument() (multimodal image analysis)
- evaluations collection (already stores school test data)
- Extended TopicMastery schema (add optional dimensions designed in Phase 1)

**Avoids:**
- Aggregate scores in UI ("כיתה ג׳: דיוק 85%, מהירות 60%, עקביות גבוהה" instead of "כיתה ג׳: 72%" single number)

**Estimated complexity:** 2-3 days
**Research flag:** Standard patterns; no additional research needed; extends Phase 1 signal processing

---

### Phase 5: Profile Maintenance & Visualization
**Rationale:** Polish features addressing long-term profile accuracy. Core functionality must work first (Phases 1-4) before adding decay/refresh logic. Prevents stale profiles from undermining trust.

**Delivers:**
- Confidence decay over time — implement forgetting curves (procedural skills decay 0.95/week, conceptual skills decay 0.98/week); apply decay via applyForgetting(pKnown, daysSinceLastPractice, decayRate); after 8 weeks without practice, procedural confidence drops to 0.66 (needs refresh)
- Probe questions for verification — every 4-6 weeks, include 1-2 "mastered topic" questions in quiz; if child gets them wrong → demote proficiency level; if right → refresh confidence timestamp; prevents false mastery assumptions
- Seasonal adjustments — detect long gaps (>3 weeks inactive); first session after gap: "Welcome back! Quick review" mode with 30% review questions, 70% current level; handles vacation/break scenarios
- Regression detection — track rolling accuracy per topic (last 10 questions); if previously-mastered topic drops below 70% → flag for review; alert parent "יעל נראית מתקשה בכפל - מומלץ חזרה קצרה"
- Profile analytics UI — SkillRadarChart (pKnown across all skills in subject using existing recharts), ProgressTimeline (line chart of mastery over time using performanceWindow data), parent insights ("Learning velocity increased 20% this month", "3 topics moved from 'learning' to 'mastered'")
- Prerequisite detection for recommendations — Gemini-inferred prerequisite relationships (extractTopicDependencies) feed recommendation priority; "Fix X first, then Y will make sense" rationale; defer graph visualization UI to post-v1 (high complexity)

**Addresses:**
- **Stale Profile Problem (Pitfall #4)** — Confidence decay (forgetting curves); probe questions (verification of mastery); seasonal adjustments (post-vacation handling); regression detection (track accuracy trends)
- **Enhanced visualization (Feature)** — Leverage existing recharts library; skill radar, progress timelines, parent insights dashboard

**Implements:**
- Forgetting curve algorithm (exponential decay: p(t) = p(0) * exp(-decay * t))
- Prerequisite detection (Gemini-inferred, not graph visualization yet) — conservative recommendations (only mark as prerequisite if truly necessary)
- Profile archival (subcollections at /children/{childId}/profileHistory/{date} store snapshots without bloating main document)

**Avoids:**
- Proficiency expiration too aggressive (mastered status requires maintenance: 1 correct answer every 2 months before degrading)

**Estimated complexity:** 3-4 days
**Research flag:** Forgetting curve parameters (decay rates 0.95-0.98/week) typical but may need tuning; monitor 30-60 days of data, analyze regression patterns, adjust decay rates per subject if needed

---

### Phase Ordering Rationale

**Dependency-based ordering:**
- Phase 1 must come first (foundation for all subsequent phases; cannot recommend without data; cannot personalize without profiles)
- Phase 2 depends on Phase 1 data (profile must exist to personalize questions; BKT algorithm requires TopicMastery records)
- Phase 3 depends on Phase 1+2 (recommendations require mature proficiency data; need multiple sessions worth of skill tracking before suggestions are accurate)
- Phase 4 extends Phase 1-3 (adds signals to existing profile system; leverages established processQuizSignal pattern)
- Phase 5 maintains Phase 1-4 (prevents degradation over time; requires baseline profile accuracy to detect regression)

**Risk mitigation ordering:**
- Phases 1-2 address critical pitfalls immediately (cold start, over-drilling, overfitting)
- Phase 3 addresses trust pitfall before users reject system (must have explainability before parents abandon adaptive features)
- Phases 4-5 address moderate/minor pitfalls (can be deferred if time-constrained; stale profiles only matter after 4-6 weeks of usage)

**Value delivery ordering:**
- Phase 1: Proves concept (visible topic mastery dashboard; "The system is tracking my child's learning")
- Phase 2: Delivers personalization (users feel adaptive learning working; "The questions got easier after struggles")
- Phase 3: Builds trust (users understand and accept recommendations; "I see why it suggested this topic")
- Phase 4: Enriches data (school tests integrated; multi-dimensional insights; "It knows about the test coming up")
- Phase 5: Ensures longevity (profiles stay accurate over time; "It remembered vacation and adjusted")

**Total estimated time:** 12-17 days for full adaptive profile system (assuming one developer)

---

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 2: BKT Parameter Tuning** — Default values provided (grades_1_3: pKnown=0.1, pLearn=0.3, pGuess=0.25, pSlip=0.1; grades_4_6 and grades_7_8 variants) but may need calibration with real usage data. Monitor parent feedback on difficulty accuracy ("too easy" / "too hard" ratios); collect 50-100 sessions per grade band; adjust parameters if predictions systematically off.

- **Phase 3: Gemini Prompt Engineering for Recommendations** — Prompt structure well-defined (pass LearnerProfile data, ask for topic priorities with reasoning) but may need iteration for Hebrew educational context. Test with 5-10 families; validate recommendation language matches Israeli parent mental models; adjust prompt if suggestions feel generic or culturally mismatched.

- **Phase 5: Forgetting Curve Decay Rates** — Typical values 0.95-0.98/week for procedural vs conceptual skills but vary by skill type, age group, teaching method. Use defaults initially; collect 30-60 days of data; analyze regression patterns (how often do "mastered" topics show declining accuracy?); adjust decay rates per subject if needed.

**Phases with standard patterns (skip research-phase):**

- **Phase 1: Profile Schema and Firestore CRUD** — Well-established patterns in Study Buddy codebase (store.tsx Context + services/ CRUD + hooks/ state management); Firestore subcollections for profile history match existing multi-tenant architecture; no novel patterns.

- **Phase 4: Multi-Signal Aggregation** — Extends Phase 1 signal processing patterns (processQuizSignal → processEvaluationSignal); existing analyzeEvaluationDocument already extracts school test data; straightforward integration; no new research needed.

- **Phase 5: Visualization** — Uses existing recharts library (already installed for AnalysisTab); standard radar charts, line charts, progress bars; no new UI patterns.

**Defer to post-v1 (high complexity, lower immediate value):**

- **Prerequisite graph visualization** — Mentioned in FEATURES.md, ARCHITECTURE.md as differentiator but complex UI implementation (Sankey diagrams or force-directed graphs with D3.js); AI-inferred prerequisites sufficient for v1 recommendations (extractTopicDependencies feeds priority logic); build graph UI only if parent feedback demands visual curriculum map.

- **What-if scenario modeling** — "One more practice → 90% ready" predictions require validated readiness scoring baseline; need 50+ (predicted readiness → actual score) pairs for calibration; defer until Phase 5 readiness scoring proven accurate.

- **Voice note transcription** — "Sarah mixed up ב and כ today" audio recording requires audio infrastructure + transcription API (Speech-to-Text); faster than typing for busy parents but adds complexity; defer until text-based observation notes validated.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Existing Study Buddy stack (React/Firebase/Gemini) confirmed sufficient; BKT algorithm well-documented in academic literature (Corbett & Anderson 1994) and production systems (Khan Academy, Duolingo); no new dependencies needed; clean integration points identified in codebase |
| **Features** | MEDIUM-HIGH | Table stakes validated across multiple platforms (Khan Academy, IXL, Duolingo, Carnegie Learning) as of training data (Jan 2025); differentiators (parent control, school test integration) match Israeli cultural context of high parental involvement; anti-features (over-gamification, labeling) validated by edtech failures (AltSchool, over-gamified apps); competitive landscape based on 2025 data may have changed |
| **Architecture** | HIGH | Signal-driven pattern proven in adaptive learning systems (Intelligent Tutoring Systems literature); integration points with Study Buddy codebase clearly defined (store.tsx Context extension, services/ layer, hooks/ pattern); scalability appropriate for family-scale app (<100 concurrent users); no architectural unknowns |
| **Pitfalls** | MEDIUM-HIGH | Critical pitfalls (cold start, over-drilling, black box, stale profile, overfitting) well-documented in edtech literature and production failures; detection methods validated (drop-off rates, completion metrics, parent feedback); preventions (bootstrapping, circuit breakers, explainability, decay, smoothing) have precedent in successful systems; phase-specific warnings mapped to implementation stages |

**Overall confidence:** MEDIUM-HIGH

- **HIGH confidence** in technical feasibility (existing stack sufficient, BKT proven, patterns established, integration clear)
- **MEDIUM-HIGH confidence** in feature landscape (table stakes validated, differentiators match culture, but competitive data from 2025)
- **MEDIUM confidence** in AI-driven components (Gemini topic extraction accuracy unknown for Hebrew/Israeli curriculum; parameter tuning needed for BKT; prompt engineering may require iteration)
- **LOW-MEDIUM confidence** in competitive landscape specifics (Khan/IXL/Duolingo features may have changed in 2026; need current product reviews)

### Gaps to Address

**Gap 1: BKT Parameter Calibration for Hebrew/Israeli Context**
- Research provides default values by grade band (grades 1-3, 4-6, 7-8) based on general K-12 literature
- Actual optimal values depend on question difficulty, subject type (math vs דקדוק), student population, Israeli curriculum pacing
- Hebrew content may have different guess rates (4 options = 25% theoretical but actual guessing patterns vary)
- **Resolution:** Start with defaults in Phase 2; monitor accuracy during Phase 3 (track parent feedback on difficulty: "too easy" / "too hard" ratios); collect 50-100 sessions per grade band; analyze prediction errors (predicted mastery vs parent-perceived mastery); tune pKnown/pLearn/pGuess/pSlip parameters per grade/subject if systematic bias detected; iterate over 2-3 months.

**Gap 2: Gemini API Cost at Scale**
- Research warns of cost explosion (each quiz currently generates 3-5 Gemini API calls; adaptive profiling adds 2-3 more per session)
- No current Gemini pricing verified (2026 rates unknown; training data through Jan 2025)
- Study Buddy usage patterns unknown (quizzes per child per month, topic extraction frequency, recommendation generation cadence)
- **Resolution:** Implement batching and caching in Phase 2 (generate 5 quizzes at once, cache topic lists, lazy evaluation for recommendations); monitor per-child API spend in Phase 3 (track apiCallsThisMonth, estimatedCost in ChildUsage type); set budget alerts at $2/child/month threshold; if exceeded, implement degradation strategy (simpler prompts, rule-based fallbacks, aggressive caching); validate Gemini pricing before Phase 2 launch.

**Gap 3: Forgetting Curve Decay Rates for Different Skills**
- Research provides typical ranges (procedural 0.95/week, conceptual 0.98/week) from Ebbinghaus, Duolingo half-life regression research
- Actual rates vary by age (younger children forget faster), subject (math vs language), teaching method (rote vs conceptual), practice intensity
- No Hebrew/Israeli-specific forgetting curve research found
- **Resolution:** Use defaults in Phase 5 (procedural 0.95, conceptual 0.98); collect 30-60 days of data after Phase 5 launch; analyze regression patterns (for "mastered" topics, measure accuracy decline over time without practice); identify outliers (skills that decay faster/slower than predicted); adjust decay rates per subject if needed (e.g., מילים כתיב may decay faster than חשבון concepts); re-calibrate every 6 months.

**Gap 4: Hebrew Educational Cultural Context**
- Research based on general edtech patterns (Khan Academy, IXL, Duolingo) and Israeli cultural knowledge (high parental involvement, test focus)
- Israeli educational culture may have unique expectations beyond general patterns (דקדוק sacred status, specific curriculum sequencing, regional variations)
- Parent mental models of "adaptive learning" unknown (do they understand probabilistic recommendations? prefer deterministic rules?)
- **Resolution:** User test Phase 1 UI with 5-10 Israeli parent families before Phase 2; validate recommendation language in Phase 3 (do parents understand "pKnown" probabilistic framing or prefer "mastered/learning/weak" categorical labels?); adjust terminology based on feedback; conduct follow-up interviews after Phase 3 (do recommendations feel culturally appropriate? too aggressive? too passive?); iterate on Phase 4 override UI based on parent preferences.

**Gap 5: Privacy Compliance (2026 Standards)**
- Research references GDPR and Israeli Privacy Protection Law as of 2025 training data
- Child data regulations may have updated in 2026 (new requirements for consent, data retention, export/delete rights)
- Specific Study Buddy data practices unknown (Firebase region, data sharing with Gemini API, retention policies)
- **Resolution:** Consult Israeli privacy lawyer before Phase 1 launch; review data retention policies (90-day question deletion implemented in Phase 1, 2-year session summaries, indefinite aggregates); implement parent data dashboard with export/delete features (Phase 1); verify Firebase Cloud region (EU compliance); disable Gemini API conversation history (opt-out in API calls); add transparent data collection notice at account creation ("Study Buddy stores quiz answers and topic progress to personalize learning. Data stored in Firebase (Google Cloud, EU region) and never shared. Export or delete anytime in Settings.").

**Gap 6: Prerequisite Graph Accuracy for Israeli Curriculum**
- Architecture proposes Gemini-extracted topic dependencies (extractTopicDependencies calls Gemini with subject + topics + grade, asks for prerequisite relationships)
- Accuracy of AI-inferred prerequisites unknown (curriculum varies by school type: ממלכתי vs ממ"ד, regional variations, teacher discretion)
- Risk of incorrect prerequisites causing frustration ("Why can't I practice X? I don't care about Y first.")
- **Resolution:** Defer prerequisite graph visualization to post-v1 (complex UI, high risk if prerequisites wrong); implement basic prerequisite detection in Phase 3 for recommendations only (soft suggestions, not hard blocks); validate with parent feedback ("Does this prerequisite make sense?"); consider working with Israeli educator to manually review prerequisite suggestions before Phase 3 launch; add parent override for prerequisites (Phase 4: "Skip this prerequisite" option); iterate based on usage data.

**Gap 7: Multi-Tenant Firestore Query Performance**
- Study Buddy uses familyId for multi-tenant isolation (existing architecture)
- Adaptive profiles add per-child profile documents with real-time subscriptions (onSnapshot listeners)
- Unknown: will skill-level subscriptions scale to 50+ skills per child × 5 children per family × multiple concurrent users?
- Firestore has query limits (100 listeners per client, 1 write/second per document)
- **Resolution:** Test in Phase 1 with sample data (simulate 5 children, 50 skills each, concurrent profile updates); monitor Firestore quota usage (writes/reads per day); implement write batching if needed (aggregate profile updates every 10 seconds instead of per-question); use Firestore transactions for critical writes (Phase 4); consider subcollection sharding if single profile document becomes bottleneck (split skills across multiple subdocs); validate performance before Phase 2 launch.

## Sources

### Primary (HIGH confidence)

**Study Buddy Codebase Analysis:**
- `/Users/i306072/Documents/GitHub/Study Buddy/CLAUDE.md` — Current architecture (React/Firebase/Gemini), existing hooks pattern (useQuizSession), Phase 3 refactoring status, error handling patterns (lib/errors.ts, hooks/useErrorHandler.ts), retry logic (lib/retry.ts)
- `/Users/i306072/Documents/GitHub/Study Buddy/types.ts` — Existing data model (ChildProfile with proficiency: Record<string, DifficultyLevel>, Subject with topics, StudySession with questions/answers, QuizQuestion, UpcomingTest)
- `/Users/i306072/Documents/GitHub/Study Buddy/services/geminiService.ts` — AI integration patterns (generateQuizQuestions, analyzeMistakesAndGenerateTopics, analyzeEvaluationDocument), retry with exponential backoff, error handling (QuizGenerationError, TopicExtractionError)
- `/Users/i306072/Documents/GitHub/Study Buddy/store.tsx` — Context-based state management (AppState with children/subjects/sessions/upcomingTests), Firestore onSnapshot subscriptions, addSession/updateChild patterns
- `/Users/i306072/Documents/GitHub/Study Buddy/hooks/useQuizSession.ts` — Quiz state management pattern (loadQuestions, handleAnswer, nextQuestion)

**Bayesian Knowledge Tracing:**
- Corbett, A. T., & Anderson, J. R. (1994). "Knowledge tracing: Modeling the acquisition of procedural knowledge." User Modeling and User-Adapted Interaction, 4(4), 253-278. — Original BKT paper, 4-parameter model (pKnown, pLearn, pGuess, pSlip), Bayes rule update equations
- Khan Academy engineering blog (2015): "How We Use Bayesian Knowledge Tracing" — Production implementation, parameter tuning for math content, K-12 grades
- Carnegie Learning Cognitive Tutor (2005-2020) — BKT-based, K-12 math, proven at scale (1M+ students)

**Firebase Firestore:**
- Official documentation: https://firebase.google.com/docs/firestore — Real-time subscriptions (onSnapshot), transactions (runTransaction), subcollections (/{parent}/{parentId}/{subcollection}/{childId})
- Multi-tenant data modeling: https://firebase.google.com/docs/firestore/solutions/multi-tenant — familyId isolation pattern, security rules

**Forgetting Curve:**
- Ebbinghaus, H. (1885/1964). Memory: A Contribution to Experimental Psychology. — Exponential decay, retention over time
- Duolingo research blog (2020): "Half-Life Regression for personalized practice" — Skill decay rates, spaced repetition

### Secondary (MEDIUM confidence)

**Educational Technology Patterns (Training Data through Jan 2025):**
- Intelligent Tutoring Systems literature (AIED conferences 2020-2024) — Adaptive learning architectures, learner modeling, signal-driven updates
- Khan Academy, IXL, Duolingo competitive feature analysis — Table stakes features (mastery dashboard, adaptive difficulty, progress tracking), differentiators (parent dashboards, streak gamification)
- Knewton adaptive learning platform (defunct but research papers available) — Prerequisite graphs, knowledge space theory

**Educational Psychology:**
- Dweck, C. S. (2006). Mindset: The New Psychology of Success. — Growth mindset vs fixed mindset, "not yet" language, performance anxiety from monitoring
- Deci, E. L., & Ryan, R. M. (1985). Intrinsic Motivation and Self-Determination in Human Behavior. — Extrinsic motivation (rewards, badges) crowding out intrinsic motivation (mastery, curiosity)

**Pitfall Documentation:**
- AltSchool case study (closed 2019) — Fully automated curriculum, parents felt "locked out", trust collapse, 60-80% churn during onboarding
- Over-gamification literature — Badge systems reducing intrinsic motivation (Deci), leaderboard effects on low performers (comparative ranking anxiety)
- Cold start problem (ML personalization research) — Bootstrap strategies, progressive profiling, sensible defaults

### Tertiary (LOW confidence, needs validation)

**Competitive Landscape (2026):**
- Khan Academy, IXL, Duolingo feature sets — Based on 2025 training data, may have changed (new adaptive features, parent controls, AI integrations unknown)
- Israeli edtech market specifics — General cultural context known (high parental involvement, test focus), specific competitor features unknown (local alternatives to Khan Academy?)
- Current Gemini API pricing (2026) — Unverified, needs check before Phase 2 implementation (may have tiered pricing, quota limits, cost-per-token changes)

**Privacy Regulations (2026):**
- GDPR child data provisions — Known through 2025 (parental consent, data minimization, right to deletion), potential updates in 2026
- Israeli Privacy Protection Law — Known through 2025 structure, consult legal counsel for current requirements (data residency, cross-border transfer restrictions)
- COPPA guidelines (US) — Not directly applicable (Study Buddy is Israeli app) but informative for child data best practices (age verification, parental consent, data retention)

**Recommended Verification Before Implementation:**
1. **Validate Gemini API costs** — Check pricing calculator (https://ai.google.dev/pricing) before Phase 2; estimate cost per child per month based on current quiz frequency; set budget alerts
2. **User test Phase 1 UI** — 3-5 Israeli parent families; validate topic mastery dashboard, proficiency visualization (progress bar vs radar vs gauge?), Hebrew terminology ("שליטה" vs "רמת ידע")
3. **Consult Israeli privacy lawyer** — Phase 1 before launch; review data retention (90-day questions, 2-year sessions), Firebase region (EU compliance?), Gemini API data sharing
4. **Check Khan Academy, IXL current features** — Competitive analysis for 2026 adaptive learning features (parent controls? AI recommendations? predictive scoring?); validate table stakes still accurate
5. **Research Hebrew-specific adaptive learning** — If literature available (Israeli educational research journals, Hebrew University, Technion); Hebrew grammar vs English math (different difficulty patterns?), Israeli curriculum pacing (faster/slower than US K-12?)

---

*Research completed: 2026-01-22*
*Ready for roadmap: yes*
*Total research pages: 2,786 lines across 4 documents (STACK: 582 lines, FEATURES: 569 lines, ARCHITECTURE: 696 lines, PITFALLS: 939 lines)*
*Synthesis confidence: MEDIUM-HIGH*

**Next step:** Orchestrator proceeds to requirements definition phase. Roadmapper agent will use this SUMMARY.md (especially "Implications for Roadmap" section) to structure implementation phases with clear dependencies, risk mitigation ordering, and research flags.
