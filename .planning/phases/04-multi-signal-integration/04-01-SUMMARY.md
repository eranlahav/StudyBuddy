---
phase: 04-multi-signal-integration
plan: 01
subsystem: learner-profile
tags: [signals, confidence, bayesian-fusion, types]
dependency_graph:
  requires: []
  provides: [signal-types, confidence-weighting, bayesian-fusion]
  affects: [04-02, 04-03, 04-04]
tech_stack:
  added: []
  patterns: [evidence-hierarchy, recency-decay, sample-size-boost]
file_tracking:
  created: [lib/signalWeights.ts]
  modified: [types.ts, lib/index.ts]
decisions:
  - id: signal-confidence-weights
    choice: "95% eval, 70% quiz, 60% engagement, 40% parent note"
    reason: "Based on ITS research (VanLehn et al.) - teacher-validated evidence most reliable"
  - id: recency-half-life
    choice: "30 days for 50% decay"
    reason: "Balance between honoring recent evidence and maintaining historical context"
  - id: sample-size-saturation
    choice: "10 samples for 63% confidence"
    reason: "Exponential growth curve - meaningful confidence requires adequate sample size"
metrics:
  duration: "2.8 minutes"
  completed: "2026-01-23"
---

# Phase 04 Plan 01: Signal Types and Confidence Weighting Summary

**One-liner:** Bayesian fusion foundation with typed signals (eval/quiz/engagement/note), confidence weights (95/70/60/40%), recency decay (30-day half-life), and sample size boost.

## What Was Built

### Signal Types (types.ts)

Added 8 new types for multi-signal integration:

1. **SignalType** - Union type: `'quiz' | 'evaluation' | 'engagement' | 'parent_note'`
2. **Signal** - Learning signal with pKnown, confidence, recency, sampleSize
3. **EngagementMetrics** - Session metrics (duration, completion rate, rushing detection)
4. **EngagementSignal** - Analyzed engagement level with reasoning
5. **ParentNoteCategory** - Note categories: guessed, struggled, skipped_step, misunderstood, other
6. **ParentNote** - Parent observation during quiz review
7. **FusedSignal** - Result of Bayesian fusion with dominant signal

### Extended TopicMastery

Added multi-dimensional tracking fields:
- `dimensions` - accuracy, speed, consistency metrics (0-1 each)
- `questionTypeBreakdown` - pKnown by question type (MC, word problems, calculations)
- `lastSignalType` - Source of most recent update
- `lastEngagementLevel` - Last engagement analysis result
- `parentNotes` - Array of parent observation references

### Signal Weights Module (lib/signalWeights.ts)

| Function | Purpose |
|----------|---------|
| `getBaseConfidence()` | Returns base weight for signal type |
| `applyRecencyDecay()` | Exponential decay: 50% at 30 days |
| `applySampleSizeBoost()` | Confidence grows with sample size (63% at 10 samples) |
| `calculateSignalConfidence()` | Combines all factors for final confidence |
| `fuseSignals()` | Confidence-weighted Bayesian average |
| `daysSince()` | Utility for recency calculations |

**Constants:**
- `SIGNAL_WEIGHTS` - Base confidence by signal type
- `RECENCY_CONFIG` - Half-life (30 days), min confidence (0.05)
- `SAMPLE_SIZE_CONFIG` - Saturation point (10 samples)

## Key Algorithms

### Recency Decay
```
confidence = base * e^(-0.5 * days / 30)
```
- Today: 100% of base
- 30 days ago: 50% of base
- 60 days ago: 25% of base
- Never below 5% (MIN_CONFIDENCE)

### Sample Size Boost
```
confidence = base * (1 - e^(-samples / 10))
```
- 1 sample: 9% of base
- 5 samples: 40% of base
- 10 samples: 63% of base
- 20 samples: 86% of base

### Bayesian Fusion
```
fused_pKnown = Sum(confidence_i * pKnown_i) / Sum(confidence_i)
```
Confidence-weighted average of all signals.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 742fc61 | Add signal types and extend TopicMastery |
| 2 | 2f45b84 | Create signal weights module |
| 3 | 507a310 | Export signal weights from lib/index.ts |

## Decisions Made

### Signal Confidence Weights
- **Evaluation: 95%** - Teacher-validated, comprehensive coverage
- **Quiz: 70%** - Consistent measurement but limited scope
- **Engagement: 60%** - Indirect but reveals true understanding
- **Parent Note: 40%** - Subjective but valuable qualitative context

### Recency Decay Configuration
- **30-day half-life** chosen to balance fresh evidence priority with historical context
- **5% minimum** ensures no evidence is ever fully discounted

### Sample Size Saturation
- **10 samples for 63%** provides meaningful confidence threshold
- Exponential growth prevents over-confidence on limited data

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

```
lib/signalWeights.ts   (created, 171 lines)
types.ts               (modified, +94 lines)
lib/index.ts           (modified, +12 lines)
```

## Next Phase Readiness

**Ready for 04-02 (Engagement Detection):**
- EngagementMetrics type provides structure for detection
- EngagementSignal type defines analysis output
- Signal type enables engagement as evidence source

**Dependencies satisfied:**
- SignalType exported for use in engagementDetector
- fuseSignals ready to incorporate engagement signals
- TopicMastery extended with lastEngagementLevel field
