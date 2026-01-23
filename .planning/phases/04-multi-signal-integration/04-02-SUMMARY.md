---
phase: 04-multi-signal-integration
plan: 02
subsystem: engagement-detection
tags: [engagement, behavior-analysis, session-metrics, hebrew-ui]
dependency_graph:
  requires: [04-01]
  provides: [engagement-analyzer, engagement-ui-helpers]
  affects: [04-03, 04-04]
tech_stack:
  added: []
  patterns: [behavior-analysis, configurable-thresholds, hebrew-reasoning]
file_tracking:
  created: [lib/engagementDetector.ts]
  modified: [lib/index.ts]
decisions:
  - key: four-engagement-levels
    choice: high/medium/low/avoidance
    reason: Matches research on student engagement patterns
  - key: mastery-adjustments
    choice: "high=0, medium=0, low=-0.05, avoidance=-0.10"
    reason: Conservative penalties that reduce confidence, not mastery
  - key: min-questions-threshold
    choice: 3 questions minimum
    reason: Too few questions gives unreliable engagement signal
metrics:
  duration: "3 minutes"
  completed: "2026-01-23"
---

# Phase 4 Plan 02: Engagement Detector Summary

**One-liner:** Session behavior analysis module detecting high/medium/low/avoidance patterns with Hebrew reasoning and configurable thresholds.

## What Was Built

Created the engagement detection module that analyzes quiz session behavior patterns to detect engagement levels. This enables the profile to incorporate indirect learning signals from quiz session behavior.

### Key Files

| File | Purpose |
|------|---------|
| `lib/engagementDetector.ts` | Core engagement analysis functions |
| `lib/index.ts` | Exports for engagement detector |

### Exported Functions

| Function | Description |
|----------|-------------|
| `analyzeEngagement(metrics, expectedTime?)` | Analyzes metrics to determine engagement level |
| `buildEngagementMetrics(params)` | Constructs EngagementMetrics from raw session data |
| `getEngagementLabel(level)` | Hebrew label for engagement level |
| `getEngagementColorClass(level)` | CSS color class for UI display |
| `ENGAGEMENT_CONFIG` | Configurable detection thresholds |

### Engagement Levels

| Level | Trigger | Mastery Adjustment |
|-------|---------|-------------------|
| High | Normal pace, completes 95%+, focused | 0 |
| Medium | Slightly fast/slow, completes | 0 |
| Low | Rushing or very slow | -0.05 |
| Avoidance | Early exit + <50% completion | -0.10 |

### Configuration Constants

```typescript
ENGAGEMENT_CONFIG = {
  EXPECTED_TIME_PER_QUESTION: 30000, // 30 seconds baseline
  RUSH_THRESHOLD: 0.5,               // <15s = rushing
  SLOW_THRESHOLD: 3.0,               // >90s = slow
  AVOIDANCE_COMPLETION_THRESHOLD: 0.5,
  FAST_SESSION_RATIO: 0.6,
  SLOW_SESSION_RATIO: 2.0,
  MASTERY_ADJUSTMENTS: { high: 0, medium: 0, low: -0.05, avoidance: -0.10 },
  MIN_QUESTIONS_FOR_ANALYSIS: 3
}
```

### Hebrew Reasoning Strings

The module provides Hebrew explanation strings for each assessment:
- `"לא מספיק נתונים לניתוח מעורבות"` - Not enough data
- `"יצא מהתרגול מוקדם (השלים רק X%)"` - Early exit with percentage
- `"השלים את כל התרגול"` - Completed all practice
- `"עובר על שאלות במהירות (ממוצע X שניות)"` - Rushing through questions
- `"קצב תשובה נורמלי"` - Normal answer pace
- `"סיים מהר מהצפוי"` - Finished faster than expected
- `"לקח זמן רב עם הפסקות"` - Took long with breaks

## Commits

| Commit | Description |
|--------|-------------|
| `dbe997f` | Create engagement detector module |
| `0c480e8` | Export from lib/index.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

### Uses Types From
- `EngagementMetrics` from types.ts
- `EngagementSignal` from types.ts

### Will Be Used By
- 04-03: Profile update integration
- 04-04: Enhanced session tracking

## Testing Recommendations

1. Unit tests for `analyzeEngagement`:
   - High engagement: normal pace, 100% completion
   - Medium engagement: slightly fast, 95% completion
   - Low engagement: rushing (<15s avg), completes
   - Avoidance: early exit + <50% completion

2. Edge cases:
   - Exactly 3 questions (minimum threshold)
   - 2 questions (insufficient data)
   - Very slow but completes (no penalty)

## Next Phase Readiness

**Ready for 04-03:** Profile update integration
- Engagement detector provides `impactOnMastery` value
- Can be applied to topic mastery confidence
- Hebrew reasoning available for parent dashboard
