---
phase: "04"
plan: "03"
subsystem: "signal-processing"
tags: ["bayesian-fusion", "multi-signal", "profile-updates", "engagement", "evaluations"]

depends_on:
  requires:
    - "04-01: Signal types, weights, and fusion utilities"
    - "04-02: Engagement detector with level analysis"
  provides:
    - "Signal processors for all four evidence types"
    - "Confidence-weighted profile updates"
    - "Fire-and-forget error handling pattern"
  affects:
    - "04-04: UI needs to call these processors"
    - "Phase 5: Forgetting curve integration"

tech_stack:
  added: []
  patterns:
    - "Bayesian signal fusion for multi-source evidence"
    - "Fire-and-forget async pattern for non-blocking updates"
    - "Confidence-weighted mastery adjustments"

files:
  key_files:
    created: []
    modified:
      - "services/signalService.ts"

decisions:
  - id: "strong-topic-pknown"
    choice: "Set strong topics to 90% pKnown"
    rationale: "Teacher-marked mastery deserves high but not 100% (room for verification)"
  - id: "weak-topic-pknown"
    choice: "Set weak topics to 30% pKnown"
    rationale: "Teacher-identified gaps need substantial remediation"
  - id: "parent-note-adjustments"
    choice: "Use -0.02 to -0.05 adjustments based on category"
    rationale: "Conservative penalties match 40% base confidence of parent notes"
  - id: "engagement-skip-no-impact"
    choice: "Skip profile update when engagement impact is zero"
    rationale: "Avoid unnecessary writes for medium/high engagement"

metrics:
  duration: "2.6 minutes"
  completed: "2026-01-23"
---

# Phase 4 Plan 03: Signal Processors Summary

Extended signal service with processors for evaluations, engagement, and parent notes.

**One-liner:** Four signal processors (quiz, evaluation, engagement, parent_note) with confidence-weighted Bayesian fusion and fire-and-forget error handling.

## What Was Built

### Signal Processors

Extended `services/signalService.ts` with three new processors:

1. **processEvaluationSignal**
   - Processes school evaluations with 95% confidence weight
   - Strong topics set to 90% pKnown (teacher-validated mastery)
   - Weak topics set to 30% pKnown (needs remediation)
   - Processes individual questions for granular tracking
   - Uses fuseTopicWithSignal for Bayesian fusion

2. **processEngagementSignal**
   - Analyzes session metrics via analyzeEngagement()
   - Low engagement: -0.05 pKnown adjustment
   - Avoidance: -0.10 pKnown adjustment
   - Records lastEngagementLevel on topic mastery
   - Skips update when impact is zero (medium/high)

3. **processParentNoteSignal**
   - Processes parent observations during quiz review
   - Adjustments by category:
     - guessed (correct): -0.02
     - struggled: -0.03
     - skipped_step: -0.02
     - misunderstood: -0.05
     - other: 0 (record only)
   - Stores note references in parentNotes array

### Helper Functions

Added to support signal fusion:

1. **createSignalFromMastery** - Converts existing TopicMastery to Signal for fusion
2. **fuseTopicWithSignal** - Fuses existing mastery with new signal using Bayesian fusion

## Key Implementation Details

### Confidence-Weighted Fusion

All signal types are now integrated using confidence weights from lib/signalWeights.ts:
- Evaluation: 95% confidence (teacher-validated)
- Quiz: 70% confidence (consistent but limited)
- Engagement: 60% confidence (indirect but revealing)
- Parent note: 40% confidence (subjective but valuable)

### Fire-and-Forget Pattern

All processors:
- Log errors but never throw (UI never blocks)
- Use retry() with 1-2 retries for Firestore updates
- Skip gracefully when profile or topic mastery doesn't exist

## Commits

| Commit | Description |
|--------|-------------|
| cff0b02 | Add signal fusion imports and helper functions |
| 443d931 | Add processEvaluationSignal function |
| bf778b2 | Add processEngagementSignal and processParentNoteSignal |

## Verification Results

- [x] TypeScript compiles without errors
- [x] processEvaluationSignal uses 95% confidence for teacher assessments
- [x] processEngagementSignal applies -0.05 (low) or -0.10 (avoidance) adjustments
- [x] processParentNoteSignal applies -0.02 to -0.05 adjustments by category
- [x] All processors use retry() for persistence
- [x] Fire-and-forget pattern: errors never propagate to callers

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**For 04-04 (Signal Integration UI):**
- All four signal processors are exported and ready for UI integration
- Evaluation upload modal can call processEvaluationSignal
- Quiz completion can call processEngagementSignal
- Parent review UI can call processParentNoteSignal

**Dependencies satisfied:**
- lib/signalWeights.ts provides fuseSignals, daysSince, getBaseConfidence
- lib/engagementDetector.ts provides analyzeEngagement
- services/profileService.ts provides getProfile, updateProfile, initializeProfile
