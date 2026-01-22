---
phase: 02-profile-aware-quiz-generation
plan: 01
subsystem: quiz-adaptation
tags: [adaptive-quiz, difficulty-mixing, topic-classification, encouragement]
dependency-graph:
  requires: [01-learner-profile]
  provides: [topic-classification, difficulty-mixing, encouragement-messages]
  affects: [02-02-quiz-generation, 02-03-quiz-flow]
tech-stack:
  added: []
  patterns: [pure-functions, difficulty-ratio-algorithm, topic-ordering]
key-files:
  created:
    - services/adaptiveQuizService.ts
    - lib/encouragement.ts
  modified:
    - types.ts
    - services/index.ts
    - lib/index.ts
decisions:
  - topic: "Topic classification thresholds"
    choice: "0.5 weak, 0.8 mastered"
    rationale: "Matches Phase 1 BKT thresholds"
  - topic: "Difficulty ratio"
    choice: "20/50/30 (review/target/weak)"
    rationale: "Research-based ratio from Phase 2 context"
  - topic: "Frustrated ratio"
    choice: "20/70/10 when frustrated"
    rationale: "Reduce weak topics to 10% when frustration detected"
metrics:
  duration: 2 minutes
  completed: 2026-01-22
---

# Phase 02 Plan 01: Adaptive Quiz Service Foundation Summary

**One-liner:** Topic classification by pKnown thresholds with 20/50/30 difficulty mixing and Hebrew encouragement messages for early endings.

## What Was Built

### 1. Adaptive Quiz Types (types.ts)

New interfaces for type-safe difficulty mixing:

- **TopicClassification**: weak/learning/mastered string arrays based on pKnown thresholds
- **DifficultyMix**: review/target/weak topics with final questionCount
- **QuestionRequest**: topic, masteryPercentage, targetDifficulty for Gemini

### 2. Adaptive Quiz Service (services/adaptiveQuizService.ts)

Pure functions for difficulty mixing:

- **classifyTopics(profile, topics)**: Groups topics by pKnown (<0.5 weak, 0.5-0.8 learning, >=0.8 mastered)
- **mixDifficulty(classification, count, allowDifficult)**: Applies 20/50/30 ratio (or 20/70/10 when frustrated)
- **orderTopics(mix)**: Orders review -> target -> weak (easy to hard)
- **hasProfileData(profile)**: Checks if 3+ topics have been practiced

### 3. Encouragement Messages (lib/encouragement.ts)

Hebrew messages for early quiz endings:

- **FATIGUE_MESSAGES**: 4 positive messages for speed/accuracy drops
- **FRUSTRATION_MESSAGES**: 3 messages for consecutive wrong answers
- **EARLY_END_EXPLANATIONS**: Parent-facing explanations (fatigue, frustration, allTopicsBlocked)
- **getEncouragementMessage(type)**: Random message selector
- **getParentExplanation(type)**: Explanation for parents

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 47722a0 | feat | Add adaptive quiz types (TopicClassification, DifficultyMix, QuestionRequest) |
| 060b3eb | feat | Create adaptive quiz service with difficulty mixing |
| 89968bb | feat | Add Hebrew encouragement messages for early quiz endings |

## Key Files Created/Modified

**Created:**
- `services/adaptiveQuizService.ts` - 159 lines, difficulty mixing algorithms
- `lib/encouragement.ts` - 59 lines, Hebrew encouragement messages

**Modified:**
- `types.ts` - +35 lines (TopicClassification, DifficultyMix, QuestionRequest)
- `services/index.ts` - +8 lines (exports classifyTopics, mixDifficulty, orderTopics, getOrderedTopics, hasProfileData)
- `lib/index.ts` - +8 lines (exports FATIGUE_MESSAGES, FRUSTRATION_MESSAGES, EARLY_END_EXPLANATIONS, getEncouragementMessage, getParentExplanation)

## Deviations from Plan

None - plan executed exactly as written.

## How It Connects

```
LearnerProfile (Phase 1)
         |
         v
classifyTopics() --> TopicClassification {weak, learning, mastered}
         |
         v
mixDifficulty() --> DifficultyMix {reviewTopics, targetTopics, weakTopics}
         |
         v
orderTopics() --> string[] (ordered easy-to-hard)
         |
         v
Quiz Generation (02-02) --> Uses ordered topics for Gemini prompts
```

## Next Phase Readiness

**Ready for 02-02:**
- TopicClassification and DifficultyMix types available for prompt construction
- classifyTopics and mixDifficulty functions ready for quiz flow integration
- Encouragement messages ready for fatigue/frustration detection UI

**Dependencies met:**
- Phase 1 LearnerProfile provides topicMastery data for classification
- BKT thresholds (0.5, 0.8) established in Phase 1 are used here
