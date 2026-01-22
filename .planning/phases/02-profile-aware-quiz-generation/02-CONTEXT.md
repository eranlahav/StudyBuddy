# Phase 2: Profile-Aware Quiz Generation - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Quiz questions adapt to child's profile, focusing on weaknesses while maintaining challenge balance. Uses learner profile data (from Phase 1) to personalize difficulty, detect frustration, and end quizzes when fatigue is detected. Does NOT include recommendation engine or multi-signal integration (those are later phases).

</domain>

<decisions>
## Implementation Decisions

### Difficulty Mixing Strategy
- Fixed 20/50/30 ratio: 20% review (mastered), 50% target (current level), 30% weak topics
- Dynamic cap on weak questions: reduce weak % if child shows frustration signs
- If no weak topics exist: shorter quiz instead of forcing questions
- Question order: start easy and build up (review → target → weak)

### Fatigue Detection
- Track BOTH signals: answer speed AND accuracy drop
- After 5 questions minimum, start monitoring for fatigue
- When fatigue detected: end quiz early with encouragement ("Great job! Let's take a break")
- Show fatigue patterns to parents in analytics (average session length before fatigue, optimal quiz times)

### Frustration Handling
- Circuit breaker triggers after 3 consecutive wrong answers on same topic
- Response: silent switch to different topic (no explanation to child)
- Allow return to difficult topic after 2-3 other questions
- If all topics trigger frustration: end quiz with encouragement

### Question Selection Logic
- AI (Gemini) generates all questions dynamically
- Provide Gemini BOTH mastery percentage AND desired difficulty level
- Profile influences question TYPE: low mastery = more multiple choice; high mastery = more free-form
- New/unpracticed topics: treat as neutral (50% mastery), start at medium difficulty

### Claude's Discretion
- Exact speed threshold for "too fast" detection
- Exact number of questions before returning to difficult topic
- How to phrase early-end encouragement messages in Hebrew
- Grade-level adjustments to BKT parameters (already defined in Phase 1)

</decisions>

<specifics>
## Specific Ideas

- The quiz should feel adaptive but not punishing - child shouldn't feel like they're being tested
- Encouragement messages should be natural Hebrew, appropriate for Israeli children
- Silent topic switching preserves child's confidence - they don't know they "failed"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-profile-aware-quiz-generation*
*Context gathered: 2026-01-22*
