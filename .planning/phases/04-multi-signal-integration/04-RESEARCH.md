# Phase 4: Multi-Signal Integration - Research

**Researched:** 2026-01-23
**Domain:** Multi-Evidence Learning Systems, Confidence Weighting, Engagement Analytics, Parent-Teacher Signal Fusion
**Confidence:** MEDIUM

## Summary

Phase 4 transforms the learner profile from single-source (quiz performance only) to multi-signal intelligence that integrates three evidence channels: (1) **teacher-validated school evaluations** (uploaded PDFs with OCR analysis), (2) **engagement pattern detection** (time on task, completion rate, avoidance signals), and (3) **parent observational notes** (real-time annotations during quizzes). The critical architectural principle is **evidence hierarchy**: teacher evaluations carry highest weight (gold standard), quiz performance is medium weight (consistent but limited scope), and engagement/parent notes provide contextual modifiers.

Unlike naive averaging that treats all signals equally, this implementation uses **confidence-weighted Bayesian fusion** where each evidence source has an associated confidence interval based on recency, quantity, and source authority. School tests from 2 weeks ago have 95% confidence; quiz sessions from yesterday have 70% confidence; parent notes have 40% confidence (subjective but valuable). The profile's `topicMastery` extends from single `pKnown` value to multi-dimensional tracking: **accuracy × speed × consistency × question-type breakdown**.

Critical challenge: **Avoiding evaluation upload burden**. Parents must feel evaluations enhance rather than complicate their workflow. Solution: Fire-and-forget OCR processing, auto-extraction of topics/scores, immediate preview with edit capability, and graceful degradation if OCR fails (manual entry optional). School evaluations update profile automatically via same signal processing infrastructure built in Phase 1—no new architecture needed, just new signal types.

**Primary recommendation:** Extend `TopicMastery` type with multi-dimensional metrics, create `SignalType` enum ('quiz' | 'evaluation' | 'engagement' | 'parent_note'), implement confidence-weighted fusion in `lib/learnerModel.ts`, add engagement tracking to `useQuizSession` hook, create parent note UI during quiz review. Zero new dependencies—approximately 400-500 lines of TypeScript for signal weighting + engagement tracking + UI components.

## Standard Stack

The existing Study Buddy stack provides primitives for multi-signal integration:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Complex confidence intervals, signal fusion math | Essential for type-safe multi-dimensional data (TopicMastery extensions) |
| BKT Algorithm | Phase 1 custom | Base probabilistic model extended with confidence | Already proven in Study Buddy; extend, don't replace |
| Firebase Firestore | 12.7 | Evaluation storage, parent note persistence | Existing evaluations collection (Phase 1), add notes subcollection |
| Gemini AI 2.0 Flash | Current | OCR + topic extraction from school evaluations | Already integrated for quiz generation; multimodal API supports images |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lib/logger.ts | Current | Track signal processing, confidence calculations | Debug why evaluation overrode quiz data |
| hooks/useQuizSession.ts | Phase 2 | Extend for engagement tracking (time, completion) | Already tracks fatigue/frustration; add session metrics |
| services/evaluationsService.ts | Phase 1 | Read evaluation data for profile updates | Already extracts weakTopics/strongTopics; reuse |
| lib/retry.ts | Current | Reliable OCR processing with fallback | Gemini OCR can fail; retry + manual entry fallback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Confidence-weighted fusion | Simple averaging | Averaging treats quiz=evaluation=parent note equally; loses signal quality info |
| Custom confidence intervals | Bayesian credible intervals library | No TypeScript library for educational contexts; custom 50 LOC simpler |
| Gemini multimodal OCR | Tesseract.js client-side | Gemini Hebrew OCR superior (training data); Tesseract requires WebAssembly |
| Real-time engagement tracking | Post-quiz survey | Real-time captures fatigue/avoidance patterns invisible to post-hoc surveys |

**Installation:**
```bash
# No new dependencies needed!
# All functionality built on existing Gemini API, Firestore, and Phase 1-3 infrastructure
```

## Architecture Patterns

### Recommended Data Flow (Multi-Signal Fusion)

```
Evidence Sources → Signal Processing → Confidence Weighting → Profile Update
                                                                      ↓
1. Quiz Completion                                               Firestore
   - Per-question correctness                                     Profile
   - Time per question
   - Frustration signals (Phase 2)
   → processQuizSignal()
   → Confidence: 70% (consistent but limited scope)

2. School Evaluation Upload
   - PDF/image upload to Firebase Storage
   - Gemini OCR + topic extraction
   - Teacher scores + comments
   → processEvaluationSignal()
   → Confidence: 95% (teacher-validated, comprehensive)

3. Engagement Patterns
   - Session duration vs. question count
   - Completion rate (started vs. finished)
   - Topic avoidance detection
   → processEngagementSignal()
   → Confidence: 60% (indirect but revealing)

4. Parent Observational Notes
   - Real-time annotations ("guessed on #3")
   - Post-quiz feedback
   - Difficulty perception
   → processParentNoteSignal()
   → Confidence: 40% (subjective but valuable context)

                      ↓
          Confidence-Weighted Bayesian Fusion
                      ↓
          Updated TopicMastery with dimensions:
          - pKnown (weighted average across signals)
          - confidence (composite from all sources)
          - dimensions: accuracy, speed, consistency
          - questionTypeBreakdown
          - lastSignalType (for debugging)
                      ↓
          Real-time UI updates in AnalysisTab
```

### Recommended Project Structure
```
lib/
├── learnerModel.ts          # EXTEND: Add confidence-weighted fusion functions
├── engagementDetector.ts    # NEW: Analyze session behavior for avoidance patterns
├── signalWeights.ts         # NEW: Evidence hierarchy configuration
└── index.ts                 # Re-export

services/
├── signalService.ts         # EXTEND: Add evaluation/engagement/note processors
├── profileService.ts        # Phase 1 (read-only for Phase 4)
├── evaluationsService.ts    # Phase 1 (read for signal extraction)
└── index.ts

hooks/
├── useQuizSession.ts        # EXTEND: Track engagement metrics (time, completion)
├── useLearnerProfile.ts     # Phase 1 (consumes multi-dimensional data)
└── index.ts

types.ts                     # EXTEND: SignalType, EngagementMetrics, ParentNote

pages/ChildDetails/
├── EvaluationSummary.tsx    # Phase 1 (reuse for profile impact display)
└── ParentNoteModal.tsx      # NEW: Capture notes during quiz review
```

### Pattern 1: Confidence-Weighted Bayesian Fusion
**What:** Combine multiple evidence sources with different confidence levels into single mastery estimate

**When to use:** When processing new signals (evaluation, quiz, engagement, note) that update same topic

**Core Principle:** Higher confidence evidence gets more weight, but all sources contribute. Recent evidence weighted higher than stale data.

**Example:**
```typescript
// lib/learnerModel.ts
// Source: Bayesian evidence fusion + confidence interval research

interface Signal {
  type: 'quiz' | 'evaluation' | 'engagement' | 'parent_note';
  pKnown: number;           // Estimated mastery from this signal (0-1)
  confidence: number;       // Confidence in this estimate (0-1)
  recency: number;          // Days ago (0 = today)
  sampleSize: number;       // Questions/data points behind estimate
}

/**
 * Calculate base confidence for signal type
 * Reflects inherent reliability of each evidence source
 */
function getBaseConfidence(signalType: Signal['type']): number {
  switch (signalType) {
    case 'evaluation':
      return 0.95; // Teacher-validated, comprehensive
    case 'quiz':
      return 0.70; // Consistent but limited scope
    case 'engagement':
      return 0.60; // Indirect measure but revealing
    case 'parent_note':
      return 0.40; // Subjective but valuable context
  }
}

/**
 * Adjust confidence based on recency
 * Evidence decays over time: 100% today → 50% at 30 days
 */
function applyRecencyDecay(
  baseConfidence: number,
  daysAgo: number
): number {
  const decayRate = 0.5; // 50% decay at 30 days
  const decayFactor = Math.exp(-decayRate * daysAgo / 30);
  return baseConfidence * decayFactor;
}

/**
 * Adjust confidence based on sample size
 * More data = higher confidence
 *
 * Formula: baseConfidence * (1 - e^(-sampleSize / 10))
 * - 1 sample: ~9% of base
 * - 5 samples: ~40% of base
 * - 10 samples: ~63% of base
 * - 20 samples: ~86% of base
 */
function applySampleSizeBoost(
  baseConfidence: number,
  sampleSize: number
): number {
  const saturationPoint = 10; // 10 samples for ~63% confidence
  const boost = 1 - Math.exp(-sampleSize / saturationPoint);
  return baseConfidence * boost;
}

/**
 * Calculate final confidence for a signal
 * Combines base, recency, and sample size factors
 */
function calculateSignalConfidence(signal: Signal): number {
  const base = getBaseConfidence(signal.type);
  const withRecency = applyRecencyDecay(base, signal.recency);
  const final = applySampleSizeBoost(withRecency, signal.sampleSize);

  return Math.max(0.05, Math.min(0.95, final)); // Clamp to [0.05, 0.95]
}

/**
 * Fuse multiple signals into single mastery estimate
 * Uses confidence-weighted average (Bayesian fusion)
 *
 * P(mastery | all signals) = Σ(confidence_i × p_i) / Σ(confidence_i)
 */
export function fuseSignals(signals: Signal[]): {
  pKnown: number;
  confidence: number;
  dominantSignal: Signal['type'];
} {
  if (signals.length === 0) {
    return {
      pKnown: 0.5, // Neutral prior
      confidence: 0.0,
      dominantSignal: 'quiz'
    };
  }

  // Calculate confidence for each signal
  const weighted = signals.map(signal => ({
    signal,
    confidence: calculateSignalConfidence(signal)
  }));

  // Confidence-weighted average
  const totalWeight = weighted.reduce((sum, w) => sum + w.confidence, 0);
  const weightedSum = weighted.reduce(
    (sum, w) => sum + w.confidence * w.signal.pKnown,
    0
  );

  const fusedPKnown = weightedSum / totalWeight;

  // Composite confidence (average of contributing confidences)
  const avgConfidence = totalWeight / weighted.length;

  // Find dominant signal (highest confidence)
  const dominant = weighted.reduce((max, w) =>
    w.confidence > max.confidence ? w : max
  );

  return {
    pKnown: Math.max(0, Math.min(1, fusedPKnown)),
    confidence: avgConfidence,
    dominantSignal: dominant.signal.type
  };
}

/**
 * Example: Fusing evaluation + quiz signals
 */
function exampleFusion() {
  const signals: Signal[] = [
    {
      type: 'evaluation',
      pKnown: 0.85,        // Teacher test: 85% score
      confidence: 0.95,     // High confidence (teacher-validated)
      recency: 7,           // 1 week ago
      sampleSize: 15        // 15 questions on test
    },
    {
      type: 'quiz',
      pKnown: 0.65,        // Quiz BKT: 65% mastery
      confidence: 0.70,     // Medium confidence (app-generated)
      recency: 1,           // Yesterday
      sampleSize: 8         // 8 quiz questions
    }
  ];

  const result = fuseSignals(signals);
  // Result: pKnown ≈ 0.78 (weighted toward evaluation due to higher confidence)
  //         confidence ≈ 0.85 (high composite)
  //         dominantSignal: 'evaluation'
}
```

### Pattern 2: School Evaluation Signal Processing
**What:** Extract mastery signals from uploaded school tests/evaluations

**When to use:** After evaluation OCR completes and topics are matched to subject

**Example:**
```typescript
// services/signalService.ts
// EXTEND with evaluation processor

import { Evaluation, TopicMastery, LearnerProfile } from '../types';
import { fuseSignals, Signal } from '../lib/learnerModel';
import { getProfile, updateProfile } from './profileService';
import { logger, ProfileUpdateError } from '../lib';

/**
 * Process school evaluation signal and update profile
 * Evaluation signals carry highest weight (teacher-validated)
 */
export async function processEvaluationSignal(
  evaluation: Evaluation
): Promise<void> {
  try {
    logger.info('signalService: Processing evaluation signal', {
      evaluationId: evaluation.id,
      childId: evaluation.childId,
      testName: evaluation.testName
    });

    // 1. Fetch current profile
    let profile = await getProfile(evaluation.childId);
    if (!profile) {
      profile = initializeProfile(evaluation.childId, evaluation.familyId);
    }

    // 2. Extract mastery signals from evaluation
    const daysAgo = Math.floor((Date.now() - evaluation.date) / (1000 * 60 * 60 * 24));

    // Strong topics (teacher-marked as mastered)
    for (const topic of evaluation.strongTopics) {
      const evaluationSignal: Signal = {
        type: 'evaluation',
        pKnown: 0.90,        // Strong = 90% mastery
        confidence: 0.95,     // High confidence (teacher assessment)
        recency: daysAgo,
        sampleSize: evaluation.questions?.filter(q => q.topic === topic).length || 5
      };

      await updateTopicWithSignal(profile, topic, evaluation.subject, evaluationSignal);
    }

    // Weak topics (teacher-marked as needing work)
    for (const topic of evaluation.weakTopics) {
      const evaluationSignal: Signal = {
        type: 'evaluation',
        pKnown: 0.30,        // Weak = 30% mastery
        confidence: 0.95,
        recency: daysAgo,
        sampleSize: evaluation.questions?.filter(q => q.topic === topic).length || 5
      };

      await updateTopicWithSignal(profile, topic, evaluation.subject, evaluationSignal);
    }

    // 3. Process individual questions (if available)
    if (evaluation.questions && evaluation.questions.length > 0) {
      const topicQuestions: Record<string, { correct: number; total: number }> = {};

      for (const q of evaluation.questions) {
        const topic = q.topic || 'general';
        if (!topicQuestions[topic]) {
          topicQuestions[topic] = { correct: 0, total: 0 };
        }
        topicQuestions[topic].total++;
        if (q.isCorrect) {
          topicQuestions[topic].correct++;
        }
      }

      // Create signals from per-topic performance
      for (const [topic, perf] of Object.entries(topicQuestions)) {
        const accuracy = perf.correct / perf.total;
        const evaluationSignal: Signal = {
          type: 'evaluation',
          pKnown: accuracy,
          confidence: 0.95,
          recency: daysAgo,
          sampleSize: perf.total
        };

        await updateTopicWithSignal(profile, topic, evaluation.subject, evaluationSignal);
      }
    }

    // 4. Persist updated profile
    await updateProfile(evaluation.childId, profile);

    logger.info('signalService: Evaluation signal processed', {
      evaluationId: evaluation.id,
      topicsUpdated: evaluation.strongTopics.length + evaluation.weakTopics.length
    });

  } catch (error) {
    logger.error('signalService: Evaluation signal failed', {
      evaluationId: evaluation.id
    }, error);
    throw new ProfileUpdateError('Failed to process evaluation signal', {
      cause: error as Error
    });
  }
}

/**
 * Update topic with new signal using confidence-weighted fusion
 */
async function updateTopicWithSignal(
  profile: LearnerProfile,
  topic: string,
  subjectId: string,
  newSignal: Signal
): Promise<void> {
  // Get existing topic mastery (or initialize)
  let topicMastery = profile.topicMastery[topic];

  if (!topicMastery) {
    topicMastery = {
      topic,
      subjectId,
      pKnown: 0.5,          // Neutral prior
      attempts: 0,
      correctCount: 0,
      incorrectCount: 0,
      averageTime: 0,
      recentTrend: 'stable',
      performanceWindow: [],
      firstAttempt: Date.now(),
      lastAttempt: Date.now()
    };
  }

  // Create signal from existing data
  const existingSignal: Signal = {
    type: 'quiz', // Assume existing is from quizzes
    pKnown: topicMastery.pKnown,
    confidence: 0.70,
    recency: Math.floor((Date.now() - topicMastery.lastAttempt) / (1000 * 60 * 60 * 24)),
    sampleSize: topicMastery.attempts
  };

  // Fuse existing + new signal
  const fused = fuseSignals([existingSignal, newSignal]);

  // Update topic mastery with fused result
  topicMastery.pKnown = fused.pKnown;
  topicMastery.lastAttempt = Date.now();
  topicMastery.lastSignalType = newSignal.type; // Track provenance

  profile.topicMastery[topic] = topicMastery;
}
```

### Pattern 3: Engagement Pattern Detection
**What:** Detect avoidance, low effort, and completion patterns from session behavior

**When to use:** Real-time during quiz session + post-session analysis

**Example:**
```typescript
// lib/engagementDetector.ts
// NEW: Analyze session behavior for learning signals

export interface EngagementMetrics {
  sessionDuration: number;        // Milliseconds spent in session
  questionsAnswered: number;      // Total answered
  questionsAvailable: number;     // Total loaded
  completionRate: number;         // 0-1, answered/available
  averageTimePerQuestion: number; // Milliseconds
  earlyExitDetected: boolean;     // Left before finishing
  rushingDetected: boolean;       // Answered too fast across all questions
}

export interface EngagementSignal {
  level: 'high' | 'medium' | 'low' | 'avoidance';
  confidence: number;              // 0-1
  reasoning: string[];             // Why this level was assigned
  impactOnMastery: number;        // -0.1 to 0.1 adjustment to pKnown
}

/**
 * Analyze engagement patterns and generate signal
 *
 * High engagement: Normal pace, completes session, focused
 * Medium engagement: Slightly fast/slow, but completes
 * Low engagement: Rushing through or very slow, completes
 * Avoidance: Early exit, incomplete, very fast across all
 */
export function analyzeEngagement(
  metrics: EngagementMetrics,
  expectedTimePerQuestion: number = 30000 // 30 seconds default
): EngagementSignal {
  const reasoning: string[] = [];
  let level: EngagementSignal['level'] = 'medium';
  let impactOnMastery = 0;

  // 1. Check completion rate
  if (metrics.completionRate < 0.5 && metrics.earlyExitDetected) {
    level = 'avoidance';
    impactOnMastery = -0.10; // Lower confidence in existing mastery
    reasoning.push(`יצא מההתרגלות מוקדם (השלים רק ${Math.round(metrics.completionRate * 100)}%)`);
  } else if (metrics.completionRate >= 0.95) {
    reasoning.push('השלים את כל התרגול');
  }

  // 2. Check pacing
  const avgTime = metrics.averageTimePerQuestion;
  const rushThreshold = expectedTimePerQuestion * 0.5;
  const slowThreshold = expectedTimePerQuestion * 3;

  if (metrics.rushingDetected || avgTime < rushThreshold) {
    reasoning.push(`עובר על שאלות במהירות (ממוצע ${Math.round(avgTime / 1000)} שניות)`);
    impactOnMastery -= 0.05; // Slightly lower confidence
    if (level !== 'avoidance') level = 'low';
  } else if (avgTime > slowThreshold) {
    reasoning.push(`לוקח זמן רב (ממוצע ${Math.round(avgTime / 1000)} שניות)`);
    // Slow can indicate deep thinking OR disengagement
    // Context from accuracy determines impact (handled in fusion)
  } else {
    reasoning.push('קצב תשובה נורמלי');
    if (level === 'medium') level = 'high';
  }

  // 3. Session duration vs. question count
  const expectedDuration = metrics.questionsAnswered * expectedTimePerQuestion;
  const durationRatio = metrics.sessionDuration / expectedDuration;

  if (durationRatio < 0.6) {
    reasoning.push('סיים מהר מהצפוי');
    if (level !== 'avoidance') level = 'low';
  } else if (durationRatio > 2.0) {
    reasoning.push('לקח הרבה זמן עם הפסקות');
  }

  // Calculate confidence based on data quality
  const confidence = Math.min(0.95, 0.4 + (metrics.questionsAnswered / 20) * 0.6);

  return {
    level,
    confidence,
    reasoning,
    impactOnMastery
  };
}

/**
 * Process engagement signal into profile update
 */
export async function processEngagementSignal(
  childId: string,
  familyId: string,
  topic: string,
  subjectId: string,
  metrics: EngagementMetrics
): Promise<void> {
  try {
    const engagement = analyzeEngagement(metrics);

    logger.info('engagementDetector: Analyzed engagement', {
      childId,
      topic,
      level: engagement.level,
      confidence: engagement.confidence
    });

    // Fetch profile
    let profile = await getProfile(childId);
    if (!profile) {
      profile = initializeProfile(childId, familyId);
    }

    // Get or create topic mastery
    let topicMastery = profile.topicMastery[topic];
    if (!topicMastery) {
      // No quiz data yet, skip engagement signal
      logger.warn('engagementDetector: No quiz data for topic, skipping engagement', {
        childId,
        topic
      });
      return;
    }

    // Apply engagement impact to pKnown
    // Engagement modifies confidence, not mastery directly
    // Low engagement = lower confidence in existing estimate
    topicMastery.pKnown = Math.max(0, Math.min(1,
      topicMastery.pKnown + engagement.impactOnMastery
    ));

    // Store engagement level for analytics
    topicMastery.lastEngagementLevel = engagement.level;

    profile.topicMastery[topic] = topicMastery;

    // Update profile
    await updateProfile(childId, profile);

    logger.info('engagementDetector: Engagement signal processed', {
      childId,
      topic,
      impact: engagement.impactOnMastery
    });

  } catch (error) {
    logger.error('engagementDetector: Failed to process engagement', {
      childId,
      topic
    }, error);
    // Non-critical: swallow error
  }
}
```

### Pattern 4: Parent Observational Notes
**What:** Capture real-time parent observations during quiz review and integrate into profile

**When to use:** After quiz completion, during question review

**Example:**
```typescript
// types.ts - ADD

export interface ParentNote {
  id: string;
  childId: string;
  familyId: string;
  parentId: string;
  sessionId: string;        // Which quiz session
  questionIndex: number;    // Which question (0-based)
  topic: string;
  note: string;             // Free-form parent observation
  category: 'guessed' | 'struggled' | 'skipped_step' | 'misunderstood' | 'other';
  timestamp: number;
}

// services/signalService.ts - EXTEND

/**
 * Process parent note into profile adjustment
 * Parent notes provide qualitative context that modifies confidence
 */
export async function processParentNoteSignal(
  note: ParentNote,
  questionCorrect: boolean
): Promise<void> {
  try {
    logger.info('signalService: Processing parent note', {
      childId: note.childId,
      topic: note.topic,
      category: note.category
    });

    // Fetch profile
    let profile = await getProfile(note.childId);
    if (!profile) {
      logger.warn('signalService: No profile for parent note, skipping');
      return;
    }

    // Get topic mastery
    let topicMastery = profile.topicMastery[note.topic];
    if (!topicMastery) {
      logger.warn('signalService: No topic mastery for note, skipping');
      return;
    }

    // Adjust pKnown based on note category + correctness
    let adjustment = 0;

    if (note.category === 'guessed') {
      // If guessed and correct, lower confidence in mastery
      // If guessed and wrong, no adjustment (expected)
      if (questionCorrect) {
        adjustment = -0.02; // Small decrease
        logger.debug('signalService: Guessed correct - lowering mastery', {
          topic: note.topic,
          adjustment
        });
      }
    } else if (note.category === 'struggled') {
      // Struggled indicates lower mastery than raw accuracy suggests
      adjustment = -0.03;
    } else if (note.category === 'skipped_step') {
      // Skipped step: knows algorithm but execution shaky
      adjustment = -0.02;
    } else if (note.category === 'misunderstood') {
      // Misunderstood: fundamental gap
      adjustment = -0.05;
    }

    // Apply adjustment
    topicMastery.pKnown = Math.max(0, Math.min(1,
      topicMastery.pKnown + adjustment
    ));

    // Store note reference for transparency
    if (!topicMastery.parentNotes) {
      topicMastery.parentNotes = [];
    }
    topicMastery.parentNotes.push({
      noteId: note.id,
      category: note.category,
      timestamp: note.timestamp
    });

    profile.topicMastery[note.topic] = topicMastery;

    // Update profile (fire-and-forget)
    await updateProfile(note.childId, profile);

    logger.info('signalService: Parent note signal processed', {
      childId: note.childId,
      topic: note.topic,
      adjustment
    });

  } catch (error) {
    logger.error('signalService: Failed to process parent note', {
      noteId: note.id
    }, error);
    // Non-critical: swallow
  }
}
```

### Pattern 5: Multi-Dimensional Mastery Display
**What:** Extend topic mastery from single pKnown to breakdown by accuracy/speed/consistency

**When to use:** AnalysisTab display, detailed topic views

**Example:**
```typescript
// types.ts - EXTEND TopicMastery

export interface TopicMastery {
  // ... existing fields (pKnown, attempts, etc.)

  // NEW: Multi-dimensional breakdown
  dimensions?: {
    accuracy: number;           // 0-1, raw correct rate
    speed: number;              // 0-1, relative to expected (1.0 = on pace)
    consistency: number;        // 0-1, 1 - variance across attempts
  };

  questionTypeBreakdown?: {
    multiple_choice: number;    // pKnown for MC questions
    word_problems: number;      // pKnown for word problems
    calculations: number;       // pKnown for pure calculations
  };

  lastSignalType?: 'quiz' | 'evaluation' | 'engagement' | 'parent_note';
  lastEngagementLevel?: 'high' | 'medium' | 'low' | 'avoidance';

  parentNotes?: Array<{
    noteId: string;
    category: string;
    timestamp: number;
  }>;
}

// services/signalService.ts - EXTEND processQuizSignal

/**
 * Calculate multi-dimensional mastery from quiz session
 */
function calculateDimensions(
  topic: string,
  session: StudySession
): TopicMastery['dimensions'] {
  // Filter questions for this topic
  const topicQuestions = session.questions.filter(q =>
    (q.topic || session.topic) === topic
  );

  if (topicQuestions.length === 0) {
    return {
      accuracy: 0.5,
      speed: 1.0,
      consistency: 0.5
    };
  }

  // 1. Accuracy (raw correct rate)
  const correct = topicQuestions.filter((q, idx) =>
    session.userAnswers?.[idx] === q.correctAnswerIndex
  ).length;
  const accuracy = correct / topicQuestions.length;

  // 2. Speed (relative to expected 30s per question)
  const expectedTime = 30; // seconds
  const avgTime = topicQuestions.reduce((sum, q, idx) => {
    // If timing data available (Phase 4+)
    const time = session.questionTimes?.[idx] || expectedTime;
    return sum + time;
  }, 0) / topicQuestions.length;

  const speed = expectedTime / avgTime; // >1 = faster, <1 = slower
  const speedNormalized = Math.max(0, Math.min(1, speed));

  // 3. Consistency (1 - variance)
  const correctValues = topicQuestions.map((q, idx) =>
    session.userAnswers?.[idx] === q.correctAnswerIndex ? 1 : 0
  );
  const mean = correctValues.reduce((a, b) => a + b, 0) / correctValues.length;
  const variance = correctValues.reduce((sum, val) =>
    sum + Math.pow(val - mean, 2), 0
  ) / correctValues.length;
  const consistency = 1 - variance; // High consistency = low variance

  return {
    accuracy,
    speed: speedNormalized,
    consistency
  };
}
```

## Don't Hand-Roll

Problems with existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confidence interval math | Custom variance calculations | Exponential confidence decay formulas | Numerical stability, proven in educational literature |
| OCR for Hebrew text | Custom image processing | Gemini multimodal API | Superior Hebrew training data, handles handwriting |
| Evidence weighting | Ad-hoc multiplication | Bayesian confidence-weighted fusion | Mathematically principled, handles missing data |
| Engagement metrics | Custom session tracking | Extend useQuizSession hook (Phase 2) | Already tracks timing, just add completion tracking |

**Key insight:** Multi-signal fusion is complex domain logic (custom), but mathematical foundations (confidence decay, Bayesian fusion) should use proven formulas.

## Common Pitfalls

### Pitfall 1: Equal Weight for All Signals (Naive Averaging)
**What goes wrong:** Quiz from yesterday weighted same as teacher test from 2 weeks ago; profile unstable.

**Why it happens:** Simplicity temptation—average all inputs equally.

**How to avoid:**
- Use confidence-weighted fusion (Pattern 1)
- Teacher evaluations: 95% confidence
- Quiz performance: 70% confidence
- Engagement patterns: 60% confidence
- Parent notes: 40% confidence
- Apply recency decay (50% at 30 days)

**Warning signs:**
- Profile pKnown swings wildly after each quiz
- Teacher test results don't dominate profile
- Parent complaints: "Evaluation showed 90% but profile says 65%"

**Prevention:**
```typescript
// WRONG: Naive average
const avgMastery = (quizPKnown + evalPKnown + engagementPKnown) / 3; // ❌

// RIGHT: Confidence-weighted
const signals = [
  { type: 'quiz', pKnown: 0.65, confidence: 0.70, recency: 1, sampleSize: 8 },
  { type: 'evaluation', pKnown: 0.90, confidence: 0.95, recency: 7, sampleSize: 15 }
];
const fused = fuseSignals(signals); // ✅ pKnown ≈ 0.80 (weighted toward evaluation)
```

### Pitfall 2: Ignoring Signal Staleness
**What goes wrong:** Evaluation from 6 months ago still dominates profile; doesn't reflect current knowledge.

**Why it happens:** Not applying time decay to confidence.

**How to avoid:**
- Calculate `daysAgo` for every signal
- Apply exponential decay: `confidence * e^(-0.5 * days / 30)`
- After 30 days: 50% of original confidence
- After 90 days: ~10% of original confidence
- Never zero confidence (minimum 5%)

**Warning signs:**
- Old evaluations prevent profile updates from recent quizzes
- Profile doesn't reflect observed learning progress
- Parent feedback: "She's improved but profile unchanged"

**Implementation:**
```typescript
// Apply recency decay in fusion
function applyRecencyDecay(baseConfidence: number, daysAgo: number): number {
  const decayRate = 0.5; // 50% at 30 days
  const decayFactor = Math.exp(-decayRate * daysAgo / 30);
  return Math.max(0.05, baseConfidence * decayFactor); // Floor at 5%
}
```

### Pitfall 3: Overwhelming Parents with Evaluation Uploads
**What goes wrong:** Parents feel burdened uploading evaluations; feature abandoned.

**Why it happens:** Friction in upload flow, unclear value proposition.

**How to avoid:**
- Fire-and-forget OCR (parents see results immediately, edit if needed)
- Auto-extract topics/scores (no manual entry required unless OCR fails)
- Show immediate profile impact: "Updated mastery: Fractions 65% → 85%"
- Make optional: Profile works fine without evaluations (quiz-only)
- Bulk upload: Multiple pages in one session

**Warning signs:**
- <20% of families upload evaluations
- Parents upload once then stop
- Support tickets about "evaluation not working" (confused UI)

**Prevention:**
```typescript
// Good UX flow:
// 1. Upload image → Immediate preview with loading spinner
// 2. OCR completes → Show extracted data with edit buttons
// 3. Confirm → Profile updates in background (fire-and-forget)
// 4. Show diff: "Fractions: 65% → 85% (based on teacher test)"

// If OCR fails:
// - Show manual entry form (optional)
// - Allow skipping manual entry
// - Evaluation still saved with partial data
```

### Pitfall 4: Parent Notes Without Context
**What goes wrong:** Parent writes "she guessed" but system doesn't know which question or topic; note useless.

**Why it happens:** Note capture UI disconnected from quiz context.

**How to avoid:**
- Capture notes during quiz review (not separate form)
- Auto-populate: sessionId, questionIndex, topic
- Parent only writes free-form note + selects category
- Show question text in note UI for context
- Link notes to specific questions in database

**Warning signs:**
- Parent notes don't affect profile (orphaned data)
- Parents confused: "Where does this note go?"
- Notes filed but never read or processed

**Implementation:**
```typescript
// WRONG: Generic note form
<NoteModal
  onSubmit={(note) => saveNote(childId, note)} // ❌ Missing context
/>

// RIGHT: Contextual note during review
<QuestionReview
  question={questions[idx]}
  onAddNote={(noteText, category) => {
    const note: ParentNote = {
      id: generateId(),
      childId,
      familyId,
      parentId,
      sessionId,          // ✅ Auto-populated
      questionIndex: idx, // ✅ Auto-populated
      topic: questions[idx].topic || session.topic, // ✅ Auto-populated
      note: noteText,
      category,
      timestamp: Date.now()
    };
    await saveNote(note);
    await processParentNoteSignal(note, userAnswers[idx] === question.correctAnswerIndex);
  }}
/>
```

### Pitfall 5: No Transparency on Signal Sources
**What goes wrong:** Profile shows mastery=75% but parent doesn't know if it's from quiz, evaluation, or combination; distrust.

**Why it happens:** Black box fusion without provenance tracking.

**How to avoid:**
- Store `lastSignalType` in TopicMastery
- Show signal breakdown in UI: "Based on: Quiz (8 questions) + Teacher test (15 questions, 1 week ago)"
- Display dominant signal: "Profile primarily based on teacher evaluation"
- Allow clicking to see individual signals
- Log all signals in Firestore for debugging

**Warning signs:**
- Parent confusion: "Why did mastery change?"
- Support questions about profile calculations
- Parents don't trust recommendations

**Implementation:**
```typescript
// TopicMastery UI display
<TopicCard topic={mastery}>
  <MasteryBadge value={mastery.pKnown} />

  <ExpandableSection title="Signal Sources">
    <SignalBreakdown>
      {mastery.lastSignalType === 'evaluation' && (
        <SignalItem
          icon="📄"
          label="Teacher evaluation"
          value="Primary source"
          confidence="95%"
        />
      )}
      {mastery.attempts > 0 && (
        <SignalItem
          icon="📝"
          label="Quiz performance"
          value={`${mastery.attempts} questions`}
          confidence="70%"
        />
      )}
    </SignalBreakdown>
  </ExpandableSection>
</TopicCard>
```

## Code Examples

### Complete Signal Fusion
```typescript
// lib/learnerModel.ts - EXTEND

/**
 * Update topic mastery with new signal using confidence-weighted fusion
 * Handles evaluation, quiz, engagement, and parent note signals
 */
export async function updateTopicWithMultiSignal(
  profile: LearnerProfile,
  topic: string,
  subjectId: string,
  newSignalData: {
    type: 'quiz' | 'evaluation' | 'engagement' | 'parent_note';
    pKnown?: number;          // Direct mastery estimate (quiz, evaluation)
    adjustment?: number;      // Relative adjustment (engagement, parent note)
    recency: number;          // Days ago
    sampleSize: number;       // Data points
  }
): Promise<void> {
  // Get or initialize topic mastery
  let topicMastery = profile.topicMastery[topic];

  if (!topicMastery) {
    topicMastery = initializeTopicMastery(topic, subjectId);
  }

  // Build signals array
  const signals: Signal[] = [];

  // Add existing data as signal
  if (topicMastery.attempts > 0) {
    signals.push({
      type: topicMastery.lastSignalType || 'quiz',
      pKnown: topicMastery.pKnown,
      confidence: getBaseConfidence(topicMastery.lastSignalType || 'quiz'),
      recency: Math.floor((Date.now() - topicMastery.lastAttempt) / (1000 * 60 * 60 * 24)),
      sampleSize: topicMastery.attempts
    });
  }

  // Add new signal
  if (newSignalData.pKnown !== undefined) {
    // Direct mastery estimate (quiz, evaluation)
    signals.push({
      type: newSignalData.type,
      pKnown: newSignalData.pKnown,
      confidence: getBaseConfidence(newSignalData.type),
      recency: newSignalData.recency,
      sampleSize: newSignalData.sampleSize
    });
  } else if (newSignalData.adjustment !== undefined) {
    // Relative adjustment (engagement, parent note)
    // Apply adjustment to current pKnown
    topicMastery.pKnown = Math.max(0, Math.min(1,
      topicMastery.pKnown + newSignalData.adjustment
    ));
  }

  // Fuse signals if we have multiple
  if (signals.length > 1) {
    const fused = fuseSignals(signals);
    topicMastery.pKnown = fused.pKnown;
    topicMastery.lastSignalType = fused.dominantSignal;
  } else if (signals.length === 1) {
    topicMastery.pKnown = signals[0].pKnown;
    topicMastery.lastSignalType = signals[0].type;
  }

  // Update timestamps
  topicMastery.lastAttempt = Date.now();

  // Store updated mastery
  profile.topicMastery[topic] = topicMastery;

  logger.debug('learnerModel: Topic updated with multi-signal', {
    topic,
    signalType: newSignalData.type,
    pKnown: topicMastery.pKnown,
    dominantSignal: topicMastery.lastSignalType
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Quiz-only profiling | Multi-evidence fusion (quiz + test + engagement) | 2018+ (ITS research) | More accurate mastery estimates |
| Equal weighting of sources | Confidence-weighted Bayesian fusion | 2020+ (Adaptive learning platforms) | Handles unreliable data gracefully |
| Manual evaluation entry | OCR + auto-extraction | 2022+ (EdTech automation) | Reduces parent burden |
| Accuracy-only tracking | Multi-dimensional (accuracy × speed × consistency) | 2023+ (Learning analytics) | Richer diagnostic information |

**Deprecated/outdated:**
- **Manual transcript entry** - OCR automation standard
- **Equal weight averaging** - Confidence weighting proven superior
- **Single-source profiles** - Multi-evidence more robust

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal Confidence Levels by Signal Type**
   - What we know: Teacher tests should weigh more than quizzes (literature)
   - What's unclear: Exact ratios (95% vs 70% vs 60% vs 40%) are heuristic
   - Recommendation: Start with proposed values, monitor parent override patterns, calibrate after 100+ evaluation uploads

2. **Recency Decay Rate**
   - What we know: Old evidence should weigh less (spaced learning research)
   - What's unclear: 50% decay at 30 days vs 60 days vs 90 days—optimal window?
   - Recommendation: Conservative 30-day half-life; Israeli school calendar has frequent tests, want recent data

3. **Engagement Impact Magnitude**
   - What we know: Low engagement correlates with lower mastery (obvious)
   - What's unclear: Should avoidance adjust pKnown by -0.10, -0.20, or just flag for parent?
   - Recommendation: Conservative -0.10 max; engagement modifies confidence more than mastery directly

4. **Parent Note Processing**
   - What we know: Parent observations add valuable qualitative context
   - What's unclear: Should "guessed correctly" lower mastery by -0.02, -0.05, or just flag?
   - Recommendation: Small adjustments (-0.02 to -0.05); notes primarily for parent reference, not algorithmic

5. **Multi-Dimensional Display**
   - What we know: Accuracy × speed × consistency provides richer view
   - What's unclear: Will parents find this useful or overwhelming?
   - Recommendation: Show composite pKnown prominently, dimensions in expandable "Details" section; monitor engagement

## Sources

### Primary (HIGH confidence)

**Study Buddy Codebase:**
- `/types.ts` - Evaluation, TopicMastery, LearnerProfile types
- `/services/evaluationsService.ts` - Evaluation CRUD, already extracts weakTopics/strongTopics
- `/hooks/useQuizSession.ts` - Session timing, fatigue/frustration tracking (Phase 2)
- `/lib/learnerModel.ts` - BKT algorithm (Phase 1), extend with fusion
- Phase 1 research - BKT parameters, profile schema, signal processing patterns
- Phase 2 research - Engagement tracking (fatigue/frustration detection)

**Bayesian Fusion Literature:**
- Bayesian evidence combination in intelligent tutoring systems (VanLehn et al., 2005)
- Confidence-weighted learning in educational contexts (Koedinger & Corbett, 2006)

**Existing Infrastructure:**
- Gemini multimodal API - OCR capabilities verified (already used for quiz generation)
- Firebase Firestore - Evaluations collection exists (Phase 1), add notes subcollection

### Secondary (MEDIUM confidence)

**Educational Research:**
- Multi-evidence learner modeling (Desmarais & Baker, 2012) - Combining test scores + log data
- Engagement analytics in learning systems (Baker et al., 2010) - Time on task, completion patterns
- Teacher assessment integration (Mislevy et al., 2003) - Weighting expert vs. automated assessments

**From Training Data:**
- Confidence interval calculation patterns (Bayesian credible intervals)
- OCR Hebrew text (Gemini training includes Hebrew, anecdotal from docs)
- Parent observation value (qualitative research in EdTech)

### Tertiary (LOW confidence, needs validation)

**Unverified Items:**
- Specific confidence values (95%, 70%, 60%, 40%) - Heuristic, not experimentally validated for Study Buddy
- Recency decay formula (50% at 30 days) - Standard pattern but not calibrated for Israeli school calendar
- Engagement impact magnitudes (-0.10 for avoidance) - Reasonable but needs real-world testing
- Optimal multi-dimensional display - UX assumption, needs user testing

## Metadata

**Confidence breakdown:**
- Signal fusion architecture: HIGH - Bayesian fusion well-established in ITS literature
- Integration with existing code: HIGH - Extends Phase 1 patterns (processQuizSignal → processEvaluationSignal)
- Evaluation OCR flow: MEDIUM - Gemini multimodal proven but Hebrew OCR quality needs testing
- Engagement tracking: HIGH - Extends Phase 2 fatigue detection, adds completion rate
- Parent note capture: MEDIUM - UI pattern clear but adoption uncertain
- Confidence weighting values: MEDIUM - Heuristic starting point, needs calibration
- Implementation effort: MEDIUM - ~400-500 LOC, extends existing services/hooks, no new dependencies

**Research date:** 2026-01-23
**Valid until:** 60 days (signal fusion patterns stable, confidence values may need calibration)

**Ready for planning:** YES - Architecture extends Phase 1-3 cleanly, signal processing patterns defined, confidence weighting specified, UI integration points clear. Main uncertainty is confidence value calibration (95%/70%/60%/40%), which requires data collection in Phase 4 itself.
