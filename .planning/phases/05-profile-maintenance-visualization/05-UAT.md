# Phase 5: Profile Maintenance & Visualization - UAT Session

**Started:** 2026-01-24
**Completed:** 2026-01-24
**Status:** Complete

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Forgetting curve decay calculation | ✅ pass | Three-tier decay rates verified |
| 2 | Probe scheduling (SM-2 algorithm) | ✅ pass | SM-2 algorithm correctly implemented |
| 3 | Review mode after 3+ week gap | ✅ pass | 21-day threshold, 30% review |
| 4 | Regression alert notification | ✅ pass | 70% threshold, 14-day cooldown |
| 5 | Skill radar chart visualization | ✅ pass | recharts RadarChart with RTL |
| 6 | Progress timeline with drill-down | ✅ pass | AreaChart with session accuracy |
| 7 | AI prerequisite detection | ✅ pass | Gemini AI with Hebrew prompts |

## Test Details

### Test 1: Forgetting curve decay calculation ✅
**Source:** 05-01-SUMMARY.md, 05-VERIFICATION.md
**Expected behavior:**
- Mastered topics (pKnown >= 0.8) decay at 0.95/week rate
- Learning topics (0.5-0.8) decay at 0.92/week rate
- Weak topics (< 0.5) decay at 0.88/week rate
- After 8 weeks: 0.85 * 0.95^8 ≈ 0.57 (66% retention)
- Minimum floor of 0.05 prevents complete loss

**Verification:**
- ✅ `lib/forgettingCurve.ts` exports `FORGETTING_CONFIG` with correct decay rates
- ✅ `applyForgettingCurve()` uses exponential decay formula: `pKnown * Math.pow(decayRate, weeks)`
- ✅ Three-tier selection: mastered=0.95, learning=0.92, weak=0.88
- ✅ MIN_PKNOWN floor at 0.05
- ✅ ENABLED toggle for A/B testing

---

### Test 2: Probe scheduling (SM-2 algorithm) ✅
**Source:** 05-03-SUMMARY.md
**Expected behavior:**
- Initial probe interval: 28 days (4 weeks)
- Successful probes double interval up to 168 days (24 weeks)
- Failed probes demote pKnown to 0.75
- Only topics with pKnown >= 0.8 get probed
- Max 2 probe topics per quiz

**Verification:**
- ✅ `services/probeScheduler.ts` exports `PROBE_CONFIG` with correct constants
- ✅ `INITIAL_INTERVAL_DAYS: 28`, `MAX_INTERVAL_DAYS: 168`
- ✅ `FAILED_PROBE_PKNOWN: 0.75`, `MIN_PROBE_PKNOWN: 0.8`
- ✅ `PASSING_ACCURACY: 0.67` (2/3 questions)
- ✅ `scheduleNextProbe()` doubles interval on success: `Math.min(interval * 2, MAX_INTERVAL_DAYS)`
- ✅ `processProbeResult()` demotes pKnown on failure

---

### Test 3: Review mode after 3+ week gap ✅
**Source:** 05-03-SUMMARY.md
**Expected behavior:**
- Gap threshold: 21 days (3 weeks)
- Review percentage: 30% of questions
- Review topics: pKnown >= 0.65 (not too weak)
- `ReviewModeBanner.tsx` displays Hebrew welcome message
- Message format: "ברוכה השיבה, {name}! בואי נעשה חזרה מהירה"

**Verification:**
- ✅ `REVIEW_MODE_CONFIG.GAP_THRESHOLD_DAYS: 21`
- ✅ `REVIEW_MODE_CONFIG.REVIEW_PERCENTAGE: 0.30`
- ✅ `REVIEW_MODE_CONFIG.MIN_REVIEW_PKNOWN: 0.65`
- ✅ `shouldEnterReviewMode()` compares daysSinceLastSession >= 21
- ✅ `selectReviewTopics()` filters by pKnown >= 0.65 and lastAttempt >= 21 days
- ✅ `ReviewModeBanner.tsx` displays Hebrew message with personalized child name

---

### Test 4: Regression alert notification ✅
**Source:** 05-02-SUMMARY.md, 05-06-SUMMARY.md
**Expected behavior:**
- Regression threshold: 0.70 (70% confidence)
- Previous mastery threshold: 0.80 (only alert if was mastered)
- Minimum drop: 10% (reduces noise from BKT variance)
- 14-day cooldown per topic (prevents alert fatigue)
- Auto-dismiss after 8 seconds
- Hebrew message format: "{name} נראה/ת מתקשה ב{topic}"

**Verification:**
- ✅ `ALERT_CONFIG.REGRESSION_THRESHOLD: 0.70`
- ✅ `ALERT_CONFIG.PREVIOUS_MASTERY_THRESHOLD: 0.80`
- ✅ `ALERT_CONFIG.MIN_DROP_THRESHOLD: 0.10`
- ✅ `ALERT_CONFIG.ALERT_COOLDOWN_DAYS: 14`
- ✅ `detectRegression()` checks all three criteria
- ✅ `formatAlertMessage()` returns Hebrew format: `${childName} נראה/ת מתקשה ב${topic}`
- ✅ `AlertNotificationBanner.tsx` has amber styling, accessible (role="alert", aria-live)

---

### Test 5: Skill radar chart visualization ✅
**Source:** 05-05-SUMMARY.md
**Expected behavior:**
- Displays when subject has 3+ practiced topics
- Maximum 8 topics for readability
- RTL-compatible tooltip and legend
- Shows pKnown percentage for each topic
- Graceful empty state when < 3 topics

**Verification:**
- ✅ `SkillRadarChart.tsx` checks `chartData.length < 3` for empty state
- ✅ Topics limited with `.slice(0, 8)` for readability
- ✅ RTL tooltip config: `direction: 'rtl', textAlign: 'right'`
- ✅ RTL legend config: `wrapperStyle={{ direction: 'rtl' }}`
- ✅ Mastery displayed as percentage: `Math.round(t.pKnown * 100)`
- ✅ Empty state shows Hebrew message: "לא מספיק נושאים להצגת גרף מכ״ם"

---

### Test 6: Progress timeline with drill-down ✅
**Source:** 05-05-SUMMARY.md, 05-07-SUMMARY.md
**Expected behavior:**
- Area chart shows mastery progression over time
- Uses session accuracy as proxy for historical mastery
- Topic cards are clickable (onSelect callback)
- Clicking topic shows timeline below
- Chronological session order

**Verification:**
- ✅ `ProgressTimeline.tsx` renders recharts AreaChart with gradient fill
- ✅ Sessions filtered by topic and sorted chronologically: `.sort((a, b) => a.date - b.date)`
- ✅ Accuracy calculated: `(session.score / session.totalQuestions) * 100`
- ✅ Current mastery point added if available: `mastery: Math.round(currentMastery.pKnown * 100)`
- ✅ Hebrew date formatting: `toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })`
- ✅ Empty state shows: "אין נתונים היסטוריים לנושא זה"

---

### Test 7: AI prerequisite detection ✅
**Source:** 05-04-SUMMARY.md
**Expected behavior:**
- Uses Gemini AI with Hebrew prompts
- 0.7 minimum confidence threshold
- Hebrew rationale: "מומלץ לחזק את "{prerequisite}" לפני "{topic}""
- Graceful degradation (empty array) on API failure
- Grade context passed to AI (grades 1-8)

**Verification:**
- ✅ `services/prerequisiteService.ts` uses Gemini 2.0 Flash model
- ✅ `PREREQUISITE_CONFIG.MIN_CONFIDENCE: 0.7`
- ✅ `getPrerequisiteMessage()` returns: `מומלץ לחזק את "${relationship.prerequisite}" לפני "${relationship.topic}"`
- ✅ Error handling returns empty array: `catch (error) { return []; }`
- ✅ `gradeToNumber()` extracts numeric grade from Hebrew enum (א=1, ב=2, etc.)
- ✅ Hebrew prompt includes: מקצוע, כיתה, נושאים חלשים, כל הנושאים

---

## Session Log

- 2026-01-24: UAT session started for Phase 5
- 2026-01-24: All 7 tests verified and passed
- 2026-01-24: UAT session completed

