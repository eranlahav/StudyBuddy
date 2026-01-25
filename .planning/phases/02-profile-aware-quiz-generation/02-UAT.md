# Phase 2: Profile-Aware Quiz Generation - UAT Session

**Started:** 2026-01-22
**Completed:** 2026-01-23
**Status:** Complete

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Topic classification by mastery thresholds | ✅ pass | |
| 2 | Difficulty mixing ratio (20/50/30) | ⏭ skip | |
| 3 | Fatigue detection (rushing + accuracy drop) | ⏭ skip | |
| 4 | Frustration circuit breaker (3 consecutive wrong) | ⏭ skip | |
| 5 | Early quiz ending with encouragement message | ⏭ skip | |
| 6 | Profile-aware question generation via Gemini | ⏭ skip | |
| 7 | Graceful fallback when profile unavailable | ⏭ skip | |
| 8 | Topic ordering (easy to hard) | ⏭ skip | |

## Test Details

### Test 1: Topic classification by mastery thresholds
**Source:** 02-01-SUMMARY.md
**Expected behavior:**
- Topics with pKnown < 0.5 classified as "weak"
- Topics with pKnown 0.5-0.8 classified as "learning"
- Topics with pKnown >= 0.8 classified as "mastered"

**How to verify:**
- Check `classifyTopics()` function in `services/adaptiveQuizService.ts`
- Input: LearnerProfile with topic mastery data
- Output: TopicClassification object with weak/learning/mastered arrays

---

### Test 2: Difficulty mixing ratio (20/50/30)
**Source:** 02-01-SUMMARY.md
**Expected behavior:**
- 20% of questions from mastered topics (review)
- 50% of questions from learning topics (target level)
- 30% of questions from weak topics (capped challenge)
- When frustrated: ratio changes to 20/70/10

**How to verify:**
- Check `mixDifficulty()` function in `services/adaptiveQuizService.ts`
- Verify ratio constants in ADAPTIVE_QUIZ_CONSTANTS

---

### Test 3: Fatigue detection (rushing + accuracy drop)
**Source:** 02-02-SUMMARY.md
**Expected behavior:**
- Requires BOTH conditions (prevents false positives for fast learners):
  1. Rushing: answer time < 50% of baseline average
  2. Accuracy drop: < 40% accuracy in recent 5 questions
- Only triggers after 5+ questions answered

**How to verify:**
- Check useQuizSession hook fatigue tracking logic
- Verify FATIGUE_MIN_QUESTIONS, FATIGUE_SPEED_THRESHOLD, FATIGUE_ACCURACY_THRESHOLD constants

---

### Test 4: Frustration circuit breaker (3 consecutive wrong)
**Source:** 02-02-SUMMARY.md
**Expected behavior:**
- Tracks consecutive wrong answers per topic
- After 3 consecutive wrong on SAME topic: topic is blocked
- Blocked topics enter cooldown (3 questions on other topics)
- Silent topic switching (child never sees "you are struggling")

**How to verify:**
- Check FrustrationState tracking in useQuizSession
- Verify FRUSTRATION_THRESHOLD and COOLDOWN_QUESTIONS constants

---

### Test 5: Early quiz ending with encouragement message
**Source:** 02-02-SUMMARY.md
**Expected behavior:**
- Quiz ends early when fatigue OR frustration detected
- Displays Hebrew encouragement message (not "you finished!")
- Messages from lib/encouragement.ts (FATIGUE_MESSAGES, FRUSTRATION_MESSAGES)

**How to verify:**
- Check FinishedScreen in QuizSession.tsx
- Verify earlyEndMessage display logic
- Check getEncouragementMessage() function in lib/encouragement.ts

---

### Test 6: Profile-aware question generation via Gemini
**Source:** 02-03-SUMMARY.md
**Expected behavior:**
- Gemini receives per-question mastery data
- Prompt includes mastery level descriptors (struggling/learning/proficient)
- Difficulty adjusted based on topic mastery

**How to verify:**
- Check generateProfileAwareQuestions() in services/geminiService.ts
- Verify QuestionRequest includes masteryPercentage and targetDifficulty

---

### Test 7: Graceful fallback when profile unavailable
**Source:** 02-03-SUMMARY.md
**Expected behavior:**
- When profile has < 3 topics: falls back to static generation
- When isFinalReview: uses static generation (even coverage)
- No errors shown to user

**How to verify:**
- Check hasProfileData() function (requires 3+ topics)
- Verify fallback logic in useQuizSession loadQuestions()

---

### Test 8: Topic ordering (easy to hard)
**Source:** 02-01-SUMMARY.md
**Expected behavior:**
- Questions ordered by difficulty
- Mastered topics first (easy review)
- Learning topics second
- Weak topics last (harder challenges)

**How to verify:**
- Check orderTopics() function in services/adaptiveQuizService.ts

---

## Session Log

- 2026-01-23: UAT session completed
  - 1 passed, 7 skipped
  - User elected to skip detailed verification

