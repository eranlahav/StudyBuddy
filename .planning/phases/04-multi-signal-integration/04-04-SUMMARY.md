---
phase: 04-multi-signal-integration
plan: 04
subsystem: ui-hooks
tags: [engagement, signals, analytics, hooks]
dependency-graph:
  requires: ["04-03"]
  provides: ["signal-ui-integration", "engagement-tracking", "multi-dimensional-display"]
  affects: ["05-*"]
tech-stack:
  added: []
  patterns: ["fire-and-forget", "engagement-metrics", "multi-dimensional-mastery"]
key-files:
  created: []
  modified:
    - hooks/useQuizSession.ts
    - pages/ChildDetails/UploadEvaluationModal.tsx
    - pages/ChildDetails/AnalysisTab.tsx
decisions:
  - key: engagement-tracking-location
    choice: Track answer times in handleAnswer, fire signal in finishSession
    rationale: Ensures all answer times are captured before signal fires
  - key: early-exit-signal-handling
    choice: Fire engagement signal immediately on fatigue/frustration detection
    rationale: Capture engagement data even when quiz ends early
  - key: evaluation-signal-timing
    choice: Fire after successful save, not before
    rationale: Only process valid evaluations that persisted successfully
metrics:
  duration: 3 min
  completed: 2026-01-23
---

# Phase 4 Plan 4: UI Signal Integration Summary

Integrated signal processing into UI components and hooks for engagement tracking and profile updates.

## One-Liner

Quiz sessions now track engagement metrics and fire signals on completion; evaluations trigger profile updates; AnalysisTab shows multi-dimensional mastery with signal sources.

## Changes Made

### Task 1: Engagement Tracking in useQuizSession

Added engagement metrics tracking to the quiz session hook:

```typescript
// New state for engagement tracking
const [sessionStartTime] = useState<number>(Date.now());
const [answerTimesMs, setAnswerTimesMs] = useState<number[]>([]);

// Track answer time in handleAnswer
const answerTimeMs = Date.now() - answerStartTime;
setAnswerTimesMs(prev => [...prev, answerTimeMs]);

// Fire engagement signal on session completion (fire-and-forget)
const metrics = buildEngagementMetrics({
  sessionStartTime,
  sessionEndTime,
  questionsAnswered: userAnswers.length,
  questionsAvailable: questions.length,
  answerTimes: answerTimesMs,
  earlyExit: earlyEndReason !== null
});
processEngagementSignal(child.id, child.familyId, topic, subject.id, metrics, child.grade)
  .catch(() => {});
```

Engagement signals fire on:
- Normal session completion
- Fatigue-based early exit
- Frustration-based early exit

### Task 2: Evaluation Signal in Upload Modal

Added profile signal firing after evaluation save:

```typescript
import { processEvaluationSignal } from '../../services/signalService';

// In handleSave, after onSave(evaluation)
processEvaluationSignal(evaluation as Evaluation, child).catch(() => {
  // Silently ignore - fire-and-forget pattern
});
```

### Task 3: Multi-Dimensional Display in AnalysisTab

Enhanced TopicMasteryCard with new indicators:

```tsx
{/* Signal source indicator */}
{mastery.lastSignalType && (
  <span className="text-xs text-gray-500">
    {mastery.lastSignalType === 'evaluation' && '📄 מבחן'}
    {mastery.lastSignalType === 'quiz' && '📝 תרגול'}
    {mastery.lastSignalType === 'engagement' && '⏱️ מעורבות'}
    {mastery.lastSignalType === 'parent_note' && '👨‍👩‍👧 הערה'}
  </span>
)}

{/* Engagement level display */}
{mastery.lastEngagementLevel && (
  <span className={getEngagementColorClass(mastery.lastEngagementLevel)}>
    {getEngagementLabel(mastery.lastEngagementLevel)}
  </span>
)}

{/* Multi-dimensional metrics */}
{mastery.dimensions && (
  <div className="grid grid-cols-3 gap-2">
    <div>דיוק: {Math.round(mastery.dimensions.accuracy * 100)}%</div>
    <div>מהירות: {speed label}</div>
    <div>עקביות: {Math.round(mastery.dimensions.consistency * 100)}%</div>
  </div>
)}

{/* Parent notes count */}
{mastery.parentNotes?.length > 0 && (
  <div>👨‍👩‍👧 {mastery.parentNotes.length} הערות הורים</div>
)}
```

## Verification Results

| Check | Status |
|-------|--------|
| TypeScript compiles | Pass |
| processEngagementSignal in useQuizSession | 4 occurrences |
| processEvaluationSignal in UploadEvaluationModal | 2 occurrences |
| dimensions display in AnalysisTab | 4 occurrences |
| Fire-and-forget pattern used | Pass |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Answer time tracking | Track in milliseconds, store in array | Matches EngagementMetrics interface |
| Signal firing location | After session save in finishSession | Ensures session persisted before signal |
| Early exit handling | Fire signal immediately on detection | Captures engagement data for partial sessions |
| Evaluation signal timing | After successful save | Only valid evaluations trigger profile updates |

## Technical Notes

### Fire-and-Forget Pattern

All signal processing uses fire-and-forget:
```typescript
processSignal(...).catch(() => {});
```

This ensures:
- UI never blocks waiting for profile updates
- Quiz completion always works even if signal fails
- Errors are logged internally but don't propagate

### Engagement Metrics Flow

```
handleAnswer (track time) -> setAnswerTimesMs
     |
     v
finishSession (build metrics) -> buildEngagementMetrics
     |
     v
processEngagementSignal (fire-and-forget) -> analyzeEngagement -> updateProfile
```

### Multi-Dimensional Display

The AnalysisTab now shows:
- Signal source (how mastery was last updated)
- Engagement level (if engagement signal was processed)
- Accuracy/Speed/Consistency (when available)
- Parent notes count (for transparency)

## Next Phase Readiness

Phase 4 complete! All signal processing infrastructure is now integrated:

1. **Quiz signals** - Fire on session completion (04-01)
2. **Engagement analysis** - Detect high/medium/low/avoidance (04-02)
3. **Signal processors** - Update profiles from all sources (04-03)
4. **UI integration** - Fire signals from hooks, display in analytics (04-04)

Ready for Phase 5: Intelligent Scheduling.
