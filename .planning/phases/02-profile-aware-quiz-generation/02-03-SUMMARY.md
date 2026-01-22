---
phase: 02
plan: 03
subsystem: quiz-generation
tags: [gemini, adaptive-quiz, profile-aware, difficulty-mixing]
dependency-graph:
  requires: [02-01, 02-02]
  provides: [profile-aware-question-generation, adaptive-quiz-flow]
  affects: [03-xx]
tech-stack:
  added: []
  patterns: [adaptive-generation, difficulty-mixing, topic-classification]
key-files:
  created: []
  modified:
    - services/geminiService.ts
    - hooks/useQuizSession.ts
decisions:
  - id: PROFILE-AWARE-001
    choice: "Use hasProfileData check (3+ topics) for adaptive enablement"
    rationale: "Ensures sufficient data for meaningful difficulty mixing"
  - id: PROFILE-AWARE-002
    choice: "Final review mode uses static generation"
    rationale: "Final reviews cover all topics evenly, adaptive mixing not appropriate"
  - id: PROFILE-AWARE-003
    choice: "Weak/review topics get easy difficulty, learning gets medium"
    rationale: "Weak needs scaffolding, mastered needs quick review, learning needs challenge"
metrics:
  duration: 4 min
  completed: 2026-01-22
---

# Phase 2 Plan 3: Profile-Aware Quiz Generation Summary

**One-liner:** Profile-aware question generation with 20/50/30 difficulty mixing using BKT mastery data from learner profiles.

## What Was Built

### generateProfileAwareQuestions Function
Added new Gemini API function that generates questions with per-topic mastery context:
- Accepts `QuestionRequest[]` with topic, masteryPercentage, and targetDifficulty
- Gemini prompt includes mastery level descriptors (struggling/learning/proficient)
- Response schema requires topic field for frustration tracking
- Uses retry logic with exponential backoff

### Adaptive Quiz Flow in useQuizSession
Enhanced quiz session hook to use learner profile for adaptive generation:
- Check `hasProfileData(profile)` to determine adaptive vs static mode
- Topic classification via `classifyTopics()` (weak/learning/mastered)
- Difficulty mixing via `mixDifficulty()` with 20/50/30 ratio
- Topic ordering via `orderTopics()` (easy to hard)
- Graceful fallback to static generation when profile unavailable

### Difficulty Mapping Strategy
```
Mastery Level -> Target Difficulty
- Weak topics (pKnown < 0.5): EASY (scaffolding)
- Mastered topics (pKnown >= 0.8): EASY (quick review)
- Learning topics (0.5-0.8): MEDIUM (zone of proximal development)
```

## Key Implementation Details

### Gemini Prompt Structure
```
ADAPTIVE DIFFICULTY INSTRUCTIONS:
Question 1: Topic "שברים", Student Mastery: 85% (proficient), Target Difficulty: EASY
Question 2: Topic "כפל", Student Mastery: 30% (struggling), Target Difficulty: EASY
Question 3: Topic "חיסור", Student Mastery: 60% (learning), Target Difficulty: MEDIUM
```

### Adaptive Flow Decision Tree
```
if (hasProfileData(profile) && !isFinalReview) {
  -> Use adaptive generation
  -> classifyTopics -> mixDifficulty -> orderTopics -> generateProfileAwareQuestions
} else {
  -> Fallback to static generateQuizQuestions
}
```

## Files Changed

| File | Change |
|------|--------|
| services/geminiService.ts | +152 lines - Added generateProfileAwareQuestions function |
| hooks/useQuizSession.ts | +118/-22 lines - Wired adaptive generation with profile support |

## Commits

| Hash | Message |
|------|---------|
| 9371017 | feat(02-03): add generateProfileAwareQuestions to Gemini service |
| f6741f5 | feat(02-03): wire profile-aware generation into useQuizSession |

## Verification Results

- [x] TypeScript compiles: `npx tsc --noEmit` passes
- [x] generateProfileAwareQuestions exists in geminiService.ts
- [x] QuizQuestion interface includes optional topic field
- [x] useQuizSession accepts optional profile parameter
- [x] Adaptive generation uses classifyTopics -> mixDifficulty -> orderTopics -> generateProfileAwareQuestions
- [x] Graceful fallback to static generation when profile unavailable
- [x] Mastery percentage passed to Gemini in prompt for each question
- [x] Profile updated after quiz via processQuizSignal (ADAPT-02 verified in store.tsx)

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

### Upstream Dependencies
- **02-01:** adaptiveQuizService with classifyTopics, mixDifficulty, orderTopics
- **02-02:** FatigueState/FrustrationState types, topic field in QuizQuestion

### Downstream Consumers
- **QuizSession.tsx:** Pass profile from useLearnerProfile to useQuizSession
- **Phase 3:** May extend profile-aware generation with additional context

## Next Phase Readiness

Phase 2 complete. All three plans executed:
- 02-01: Adaptive quiz service with topic classification
- 02-02: Fatigue detection and frustration circuit breaker
- 02-03: Profile-aware question generation (this plan)

Phase 3 can now build on the complete adaptive quiz system.

## Known Limitations

1. **Topic availability:** Adaptive mixing only works if subject.topics has multiple topics defined
2. **Profile minimum:** Requires 3+ practiced topics for adaptive mode (falls back otherwise)
3. **Final review excluded:** Final review mode always uses static generation for even coverage
