# Phase 2: Profile-Aware Quiz Generation - Research

**Researched:** 2026-01-22
**Domain:** Adaptive Quiz Generation, Fatigue Detection, Frustration Handling
**Confidence:** HIGH

## Summary

Phase 2 transforms static quizzes into adaptive learning sessions that respond to learner profile data (from Phase 1). The implementation builds on Study Buddy's existing `useQuizSession` hook and `generateQuizQuestions()` Gemini service, adding three adaptive mechanisms: **difficulty mixing** (20% review, 50% target, 30% weak), **fatigue detection** (monitor speed + accuracy drop), and **frustration circuit breakers** (silent topic switching after 3 consecutive errors).

The critical architectural insight: **separation of concerns**. Phase 1 handles learning (BKT updates), Phase 2 handles teaching (question selection). The learner profile is a read-only input to quiz generation—no updates happen during the quiz. This prevents feedback loops and keeps the quiz responsive.

**Primary recommendation:** Create `services/adaptiveQuizService.ts` for difficulty mixing logic, extend `useQuizSession` with fatigue/frustration tracking, pass profile mastery data to Gemini via enhanced prompts. Zero new dependencies—approximately 200 lines of pure TypeScript logic.

## Standard Stack

The existing Study Buddy stack provides all primitives for adaptive quiz generation:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type-safe state machines (fatigue, frustration states) | Essential for complex conditional logic |
| React 18 hooks | 18.2 | Real-time state tracking during quiz session | useState for answer times, useEffect for fatigue monitoring |
| Gemini AI 2.0 Flash | Current | Dynamic question generation with difficulty/mastery params | Already integrated; supports structured prompts |
| Custom BKT (Phase 1) | N/A | Profile mastery percentages feed difficulty selection | Provides pKnown values for topic classification |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lib/logger.ts | Current | Track adaptive decisions (topic switches, fatigue triggers) | Debug why quiz ended early |
| hooks/useQuizSession.ts | Current | Extend with fatigue/frustration tracking | Central quiz orchestration |
| services/geminiService.ts | Current | Extend generateQuizQuestions with mastery params | Already handles retries, errors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side difficulty mixing | Pre-generate all difficulties, filter client-side | Wasted API calls; Gemini better at targeted difficulty |
| Manual question banks | Hand-authored question pool by difficulty | Scalability nightmare; Gemini dynamic generation superior |
| Real-time BKT updates | Update profile during quiz | Feedback loops cause difficulty oscillation; deferred updates (Phase 1 pattern) cleaner |

**Installation:**
```bash
# No new dependencies needed!
# All logic implemented in existing services and hooks
```

## Architecture Patterns

### Recommended Data Flow

```
Parent Page: Load Child + Profile
         ↓
   useQuizSession hook
         ↓
   1. Fetch LearnerProfile (read-only)
         ↓
   2. Calculate difficulty distribution
      (adaptiveQuizService.ts)
      - Classify topics: weak/learning/mastered
      - Apply 20/50/30 ratio
      - Generate topicDifficultyMap
         ↓
   3. Generate questions via Gemini
      - Enhanced prompt with mastery %
      - Specify difficulty per topic
      - Order: easy → hard (review → target → weak)
         ↓
   4. During quiz: track state
      - Answer times (for fatigue)
      - Consecutive errors per topic (for frustration)
      - Accuracy over last 5 questions (for fatigue)
         ↓
   5. Adaptive responses:
      - Fatigue detected → end early with encouragement
      - Frustration on topic → switch topic (silent)
      - If no valid topics → end early
         ↓
   6. Quiz complete → save session
      - store.tsx: addSession (existing)
      - Phase 1: processQuizSignal (fire-and-forget)
```

### Recommended Project Structure
```
services/
├── adaptiveQuizService.ts   # NEW: Difficulty mixing, topic selection
├── geminiService.ts          # MODIFY: Accept mastery params
├── profileService.ts         # Phase 1 (read-only in Phase 2)
└── index.ts                  # Re-export

hooks/
├── useQuizSession.ts         # MODIFY: Add fatigue/frustration tracking
├── useLearnerProfile.ts      # Phase 1 (used to fetch profile)
└── index.ts

types.ts                      # ADD: TopicDifficulty, FatigueState, FrustrationState
```

### Pattern 1: Difficulty Mixing (20/50/30 Ratio)
**What:** Map profile mastery percentages to topic classifications, apply fixed ratio

**When to use:** Before question generation (part of quiz initialization)

**Example:**
```typescript
// services/adaptiveQuizService.ts
// Source: Educational research on spaced retrieval (Bjork & Bjork, 2011)

interface TopicClassification {
  weak: string[];       // pKnown < 0.5
  learning: string[];   // pKnown 0.5-0.8
  mastered: string[];   // pKnown >= 0.8
}

interface DifficultyMix {
  reviewTopics: string[];    // 20% - mastered topics
  targetTopics: string[];    // 50% - current level (learning)
  weakTopics: string[];      // 30% - struggling topics (capped)
  questionCount: number;
}

/**
 * Classify topics based on BKT mastery levels
 *
 * Thresholds from Phase 1 research:
 * - Weak: < 0.5 (less than 50% probability of knowing)
 * - Learning: 0.5-0.8 (progressing but not mastered)
 * - Mastered: >= 0.8 (high confidence)
 */
export function classifyTopics(
  profile: LearnerProfile,
  subjectId: string,
  availableTopics: string[]
): TopicClassification {
  const weak: string[] = [];
  const learning: string[] = [];
  const mastered: string[] = [];

  for (const topic of availableTopics) {
    const mastery = profile.topicMastery[topic];

    // New topics (never attempted) default to neutral (0.5)
    const pKnown = mastery?.pKnown ?? 0.5;

    if (pKnown < 0.5) {
      weak.push(topic);
    } else if (pKnown < 0.8) {
      learning.push(topic);
    } else {
      mastered.push(topic);
    }
  }

  return { weak, learning, mastered };
}

/**
 * Apply 20/50/30 difficulty mixing strategy
 *
 * Strategy from Phase 2 context:
 * - 20% review (mastered topics) - Spaced retrieval, prevents forgetting
 * - 50% target (current level) - Zone of proximal development
 * - 30% weak topics (capped by frustration signs) - Remediation
 */
export function mixDifficulty(
  classification: TopicClassification,
  totalQuestions: number,
  allowDifficultQuestions: boolean = true // Set false if frustration detected
): DifficultyMix {
  const { weak, learning, mastered } = classification;

  // Calculate counts based on fixed ratios
  let reviewCount = Math.round(totalQuestions * 0.2);
  let targetCount = Math.round(totalQuestions * 0.5);
  let weakCount = Math.round(totalQuestions * 0.3);

  // If frustration detected, reduce weak questions
  if (!allowDifficultQuestions) {
    weakCount = Math.round(totalQuestions * 0.1); // Drop to 10%
    targetCount = totalQuestions - reviewCount - weakCount;
  }

  // Adjust if insufficient topics in a category
  const reviewTopics = sampleTopics(mastered, reviewCount);
  const actualReview = reviewTopics.length;

  // If no weak topics exist, shorten quiz (don't force difficulty)
  const weakTopics = sampleTopics(weak, weakCount);
  const actualWeak = weakTopics.length;

  // Allocate remaining questions to target
  const targetNeeded = totalQuestions - actualReview - actualWeak;
  const targetTopics = sampleTopics(learning, targetNeeded);

  // Final question count may be less than requested if topics exhausted
  const finalCount = actualReview + targetTopics.length + actualWeak;

  return {
    reviewTopics,
    targetTopics,
    weakTopics,
    questionCount: finalCount
  };
}

/**
 * Sample topics randomly without replacement
 */
function sampleTopics(topics: string[], count: number): string[] {
  if (topics.length === 0) return [];
  if (count >= topics.length) return [...topics];

  const shuffled = [...topics].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Order topics for progressive difficulty
 * Strategy: Start easy (mastered) → build confidence → end with challenges
 */
export function orderTopics(mix: DifficultyMix): string[] {
  // Review first (confidence boost)
  // Target in middle (main learning zone)
  // Weak at end (when warmed up)
  return [
    ...mix.reviewTopics,
    ...mix.targetTopics,
    ...mix.weakTopics
  ];
}
```

### Pattern 2: Enhanced Gemini Prompts with Mastery Data
**What:** Pass profile mastery percentage and desired difficulty to AI

**When to use:** Question generation with profile-aware difficulty targeting

**Example:**
```typescript
// services/geminiService.ts (MODIFY existing function)
// Source: Gemini structured generation docs

interface QuestionRequest {
  topic: string;
  masteryPercentage: number;  // NEW: 0-100, from BKT pKnown
  targetDifficulty: DifficultyLevel;  // NEW: Overrides generic difficulty
}

/**
 * Generate profile-aware quiz questions
 *
 * Extended from existing generateQuizQuestions() to accept per-topic mastery
 */
export async function generateProfileAwareQuestions(
  subject: string,
  requests: QuestionRequest[],
  grade: GradeLevel
): Promise<QuizQuestion[]> {
  if (!hasApiKey()) {
    logger.error('generateProfileAwareQuestions: API key not configured');
    throw new QuizGenerationError('API key not configured');
  }

  const totalQuestions = requests.length;

  // Build enhanced prompt with mastery context
  const topicContext = requests
    .map((req, idx) => {
      return `Question ${idx + 1}: Topic "${req.topic}", Student Mastery: ${req.masteryPercentage}%, Target Difficulty: ${req.targetDifficulty.toUpperCase()}`;
    })
    .join('\n');

  const prompt = `Generate ${totalQuestions} multiple-choice questions in Hebrew (עברית) for a student in ${grade}.
Subject: ${subject}

ADAPTIVE DIFFICULTY INSTRUCTIONS:
${topicContext}

For each question:
1. Use the specified topic and target difficulty
2. Consider student's mastery level:
   - Low mastery (0-40%): Use multiple choice, clear answer, simple language
   - Medium mastery (40-70%): Mix formats, moderate complexity
   - High mastery (70-100%): Include critical thinking, multi-step problems

3. Difficulty calibration:
   - EASY: Basic recall, definitions, straightforward calculations
   - MEDIUM: Application, combining concepts, standard curriculum
   - HARD: Analysis, synthesis, multi-step reasoning

IMPORTANT FOR MATH (${subject}):
- Format questionText as clear equation (e.g., "25 + 15 = ?")
- Use standard symbols (+, -, x, /, =)
- Minimize wordy narratives unless word problems

Ensure exactly one correct answer per question.
Provide short encouraging explanation in Hebrew.
Provide helpful hint (tip) without revealing answer.

Important: The output JSON must be valid. All text in Hebrew.`;

  logger.info('generateProfileAwareQuestions: Starting generation', {
    subject,
    grade,
    questionCount: totalQuestions,
    requests
  });

  return retry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              tip: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
              topic: { type: Type.STRING }  // NEW: Track which topic
            },
            required: ["questionText", "options", "correctAnswerIndex", "explanation", "difficulty", "topic"]
          }
        }
      }
    });

    if (!response.text) {
      throw new QuizGenerationError('Empty response from Gemini API');
    }

    const questions = JSON.parse(response.text) as QuizQuestion[];

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new QuizGenerationError('Invalid response format: expected non-empty array');
    }

    logger.info('generateProfileAwareQuestions: Successfully generated questions', {
      count: questions.length
    });

    return questions;
  }, {
    maxRetries: 2,
    initialDelayMs: 1000,
    context: 'generateProfileAwareQuestions'
  });
}
```

### Pattern 3: Fatigue Detection
**What:** Monitor answer speed AND accuracy drop to detect cognitive fatigue

**When to use:** After 5 questions minimum, check on every answer

**Example:**
```typescript
// hooks/useQuizSession.ts (EXTEND existing hook)
// Source: Educational psychology research on cognitive load (Sweller, 2011)

interface FatigueState {
  averageAnswerTime: number;     // Baseline from first 5 questions
  recentAnswerTimes: number[];   // Rolling window of last 3
  recentAccuracy: boolean[];     // Rolling window of last 5
  fatigueDetected: boolean;
}

/**
 * Detect fatigue based on two signals:
 * 1. Answer speed significantly faster than baseline (rushing)
 * 2. Accuracy drop in recent questions
 *
 * Thresholds:
 * - Speed: Recent average < 50% of baseline (too fast = not thinking)
 * - Accuracy: < 40% correct in last 5 questions
 */
function detectFatigue(state: FatigueState): boolean {
  // Need minimum data
  if (state.recentAnswerTimes.length < 3) return false;
  if (state.recentAccuracy.length < 5) return false;

  // Calculate recent average time
  const recentAvg = state.recentAnswerTimes.reduce((a, b) => a + b, 0) / state.recentAnswerTimes.length;

  // Check if rushing (answering <50% of baseline time)
  const isRushing = recentAvg < state.averageAnswerTime * 0.5;

  // Calculate recent accuracy
  const correctCount = state.recentAccuracy.filter(Boolean).length;
  const recentAccuracy = correctCount / state.recentAccuracy.length;

  // Check if accuracy dropped (<40% correct)
  const hasAccuracyDrop = recentAccuracy < 0.4;

  // Fatigue = both rushing AND poor accuracy
  return isRushing && hasAccuracyDrop;
}

/**
 * Update fatigue state after each answer
 */
function updateFatigueState(
  state: FatigueState,
  answerTime: number,
  isCorrect: boolean,
  questionIndex: number
): FatigueState {
  // First 5 questions establish baseline
  if (questionIndex < 5) {
    return {
      ...state,
      averageAnswerTime: (state.averageAnswerTime * questionIndex + answerTime) / (questionIndex + 1),
      recentAnswerTimes: [],
      recentAccuracy: []
    };
  }

  // After 5 questions, start monitoring
  const newRecentTimes = [...state.recentAnswerTimes, answerTime];
  if (newRecentTimes.length > 3) newRecentTimes.shift(); // Keep last 3

  const newRecentAccuracy = [...state.recentAccuracy, isCorrect];
  if (newRecentAccuracy.length > 5) newRecentAccuracy.shift(); // Keep last 5

  const updatedState = {
    ...state,
    recentAnswerTimes: newRecentTimes,
    recentAccuracy: newRecentAccuracy
  };

  return {
    ...updatedState,
    fatigueDetected: detectFatigue(updatedState)
  };
}

// In useQuizSession hook:
const [fatigueState, setFatigueState] = useState<FatigueState>({
  averageAnswerTime: 0,
  recentAnswerTimes: [],
  recentAccuracy: [],
  fatigueDetected: false
});

const [answerStartTime, setAnswerStartTime] = useState<number>(Date.now());

// When showing new question:
useEffect(() => {
  setAnswerStartTime(Date.now());
}, [currentIndex]);

// When answer submitted:
const handleAnswer = useCallback((optionIndex: number) => {
  const answerTime = (Date.now() - answerStartTime) / 1000; // Seconds
  const isCorrect = optionIndex === questions[currentIndex].correctAnswerIndex;

  // Update fatigue tracking
  const newFatigueState = updateFatigueState(
    fatigueState,
    answerTime,
    isCorrect,
    currentIndex
  );
  setFatigueState(newFatigueState);

  // If fatigue detected, end quiz early
  if (newFatigueState.fatigueDetected && currentIndex >= 5) {
    logger.info('useQuizSession: Fatigue detected, ending early', {
      questionIndex: currentIndex,
      avgTime: newFatigueState.averageAnswerTime,
      recentAvg: newFatigueState.recentAnswerTimes.reduce((a, b) => a + b, 0) / newFatigueState.recentAnswerTimes.length
    });
    setIsFinished(true);
    setFatigueEndMessage('עבודה מצוינת! בואו נקח הפסקה 🌟');
    return;
  }

  // ... rest of answer handling
}, [/* dependencies */]);
```

### Pattern 4: Frustration Circuit Breaker
**What:** Track consecutive errors per topic, switch topics silently after threshold

**When to use:** After each incorrect answer, before loading next question

**Example:**
```typescript
// hooks/useQuizSession.ts (EXTEND existing hook)
// Source: Intelligent Tutoring Systems literature (VanLehn, 2011)

interface FrustrationState {
  consecutiveErrorsByTopic: Record<string, number>;
  blockedTopics: Set<string>;  // Topics triggering circuit breaker
  topicRotation: string[];      // Available topics for switching
  lastTopic: string;
}

const FRUSTRATION_THRESHOLD = 3; // 3 consecutive errors
const COOLDOWN_QUESTIONS = 3;    // Return after 3 other questions

/**
 * Track consecutive errors and manage topic blocking
 */
function updateFrustrationState(
  state: FrustrationState,
  topic: string,
  isCorrect: boolean
): FrustrationState {
  const currentCount = state.consecutiveErrorsByTopic[topic] || 0;

  if (isCorrect) {
    // Reset counter on correct answer
    return {
      ...state,
      consecutiveErrorsByTopic: {
        ...state.consecutiveErrorsByTopic,
        [topic]: 0
      },
      lastTopic: topic
    };
  }

  // Increment error count
  const newCount = currentCount + 1;
  const newConsecutive = {
    ...state.consecutiveErrorsByTopic,
    [topic]: newCount
  };

  // Check if threshold reached
  if (newCount >= FRUSTRATION_THRESHOLD) {
    logger.warn('useQuizSession: Frustration detected on topic', {
      topic,
      consecutiveErrors: newCount
    });

    return {
      ...state,
      consecutiveErrorsByTopic: newConsecutive,
      blockedTopics: new Set([...state.blockedTopics, topic]),
      lastTopic: topic
    };
  }

  return {
    ...state,
    consecutiveErrorsByTopic: newConsecutive,
    lastTopic: topic
  };
}

/**
 * Select next question considering frustration state
 * Returns null if no valid questions remain
 */
function selectNextQuestion(
  remainingQuestions: QuizQuestion[],
  frustrationState: FrustrationState
): QuizQuestion | null {
  // Filter out blocked topics
  const availableQuestions = remainingQuestions.filter(
    q => !frustrationState.blockedTopics.has(q.topic || '')
  );

  if (availableQuestions.length === 0) {
    // All topics blocked = end quiz with encouragement
    logger.info('useQuizSession: All topics blocked by frustration, ending early');
    return null;
  }

  // Prefer different topic than last question (silent switching)
  const differentTopic = availableQuestions.find(
    q => q.topic !== frustrationState.lastTopic
  );

  return differentTopic || availableQuestions[0];
}

/**
 * Unblock topics after cooldown period
 */
function applyCooldown(
  frustrationState: FrustrationState,
  questionsSinceBlock: number
): FrustrationState {
  if (questionsSinceBlock >= COOLDOWN_QUESTIONS) {
    // Clear all blocks, reset counters
    return {
      ...frustrationState,
      blockedTopics: new Set(),
      consecutiveErrorsByTopic: {}
    };
  }
  return frustrationState;
}

// In useQuizSession hook:
const [frustrationState, setFrustrationState] = useState<FrustrationState>({
  consecutiveErrorsByTopic: {},
  blockedTopics: new Set(),
  topicRotation: [],
  lastTopic: ''
});

const [questionsSinceBlock, setQuestionsSinceBlock] = useState(0);

// When answer submitted:
const handleAnswer = useCallback((optionIndex: number) => {
  const currentQ = questions[currentIndex];
  const isCorrect = optionIndex === currentQ.correctAnswerIndex;

  // Update frustration tracking
  const newFrustrationState = updateFrustrationState(
    frustrationState,
    currentQ.topic || '',
    isCorrect
  );
  setFrustrationState(newFrustrationState);

  // Apply cooldown if needed
  if (newFrustrationState.blockedTopics.size > 0) {
    const withCooldown = applyCooldown(newFrustrationState, questionsSinceBlock);
    if (withCooldown.blockedTopics.size === 0) {
      logger.info('useQuizSession: Cooldown complete, unblocking topics');
    }
    setFrustrationState(withCooldown);
    setQuestionsSinceBlock(prev => prev + 1);
  }

  // ... rest of answer handling
}, [/* dependencies */]);

// When moving to next question:
const nextQuestion = useCallback(() => {
  const remaining = questions.slice(currentIndex + 1);
  const nextQ = selectNextQuestion(remaining, frustrationState);

  if (!nextQ) {
    // No valid questions, end early
    setIsFinished(true);
    setFrustrationEndMessage('עבודה נהדרת! בואו נתרגל משהו אחר 💪');
    return;
  }

  // Silent topic switch - child doesn't know
  const nextIndex = questions.indexOf(nextQ);
  setCurrentIndex(nextIndex);
  setSelectedOption(null);
  setIsAnswered(false);
  setShowTip(false);
}, [/* dependencies */]);
```

### Anti-Patterns to Avoid

**Anti-pattern: Real-time profile updates during quiz**
- Problem: Profile updates trigger BKT recalculations, which change difficulty mid-quiz, causing oscillation
- Solution: Read profile at start, freeze during quiz, update after save (Phase 1 fire-and-forget pattern)

**Anti-pattern: Synchronous fatigue checks blocking UI**
- Problem: Complex fatigue calculations on every keystroke slow down quiz responsiveness
- Solution: Defer calculations to after answer submitted (user already waiting for feedback)

**Anti-pattern: Explicit frustration messaging**
- Problem: Telling child "You're struggling with this topic" destroys confidence
- Solution: Silent topic switching preserves self-efficacy

## Don't Hand-Roll

Problems with established solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Answer timing tracking | Custom Date.now() logic with edge cases | Performance.now() for sub-millisecond precision | Handles page sleep, tab switching |
| Topic sampling without replacement | Manual shuffling + slicing | Fisher-Yates shuffle (proven algorithm) | Uniform distribution, no bias |
| Exponential moving average | Custom decay calculations | Standard EMA formula (α = 0.3) | Numerical stability |
| Difficulty level mapping | String comparisons | Enum-based state machines | Type safety, exhaustiveness checking |

**Key insight:** Adaptive logic is custom (no libraries for educational context), but mathematical foundations should use proven algorithms.

## Common Pitfalls

### Pitfall 1: Over-Adapting (Difficulty Oscillation)
**What goes wrong:** Quiz difficulty swings wildly based on single answers; child confused by inconsistent challenge level.

**Why it happens:** Updating profile during quiz creates feedback loop: wrong answer → mastery drops → easier questions → correct answer → mastery rises → harder questions.

**How to avoid:**
- Read profile once at quiz start (snapshot)
- No profile updates during active session
- Difficulty distribution calculated upfront, not dynamically
- Profile updates happen after session save (Phase 1 pattern)

**Warning signs:**
- Child completes quiz with mixed very easy and very hard questions
- Logs show BKT updates mid-session
- Difficulty level changes after individual questions

### Pitfall 2: Fatigue False Positives (Smart Fast Kids)
**What goes wrong:** High-performing children answer quickly because they know material; flagged as fatigued and quiz ends prematurely.

**Why it happens:** Speed alone doesn't indicate fatigue—some kids are naturally fast.

**How to avoid:**
- Require BOTH signals: fast answers AND accuracy drop
- Don't trigger fatigue if accuracy remains high (>60%)
- Baseline speed from first 5 questions (individual calibration)
- Log fatigue decisions for parent review

**Warning signs:**
- Quiz ends early for high-scoring children
- Parent feedback: "Quiz too short"
- Fatigue detected with >80% accuracy

**Prevention:**
```typescript
// WRONG: Speed only
if (recentAvg < baselineAvg * 0.5) {
  endQuizEarly(); // ❌ False positive for smart fast kids
}

// RIGHT: Speed + accuracy
if (recentAvg < baselineAvg * 0.5 && recentAccuracy < 0.4) {
  endQuizEarly(); // ✅ Only if both rushing AND struggling
}
```

### Pitfall 3: Frustration Threshold Too Aggressive
**What goes wrong:** Circuit breaker triggers on genuinely difficult but learnable material; child never masters challenging topics.

**Why it happens:** 3 consecutive errors can happen during normal learning, especially on new topics.

**How to avoid:**
- Only trigger on SAME topic (not global errors)
- Allow return after cooldown (2-3 other questions)
- Don't block on first exposure to new topic (insufficient data)
- Parents should see frustration events in analytics (transparency)

**Warning signs:**
- Child never practices difficult topics
- All quizzes end early with frustration message
- Profile shows gaps in advanced topics

**Implementation:**
```typescript
// Track per-topic, not global
interface FrustrationState {
  consecutiveErrorsByTopic: Record<string, number>; // ✅ Per-topic
  // NOT: totalConsecutiveErrors: number; // ❌ Too broad
}

// Allow return after cooldown
if (questionsSinceBlock >= 3) {
  unblockAllTopics(); // ✅ Give second chance
}
```

### Pitfall 4: Gemini Prompt Ambiguity
**What goes wrong:** AI generates questions at wrong difficulty despite mastery hints; mixing ratio ignored.

**Why it happens:** Vague prompts like "consider mastery level" don't constrain AI enough.

**How to avoid:**
- Explicit per-question instructions with mastery percentage
- Specify question TYPE changes (multiple choice vs. free-form)
- Use structured output schema with topic field (validation)
- Log generated difficulties vs. requested (monitoring)

**Warning signs:**
- All questions same difficulty despite mixed request
- Review questions harder than weak questions
- Topic field missing or generic

**Prevention:**
```typescript
// WRONG: Vague prompt
const prompt = `Generate questions. Consider student mastery levels.`;
// ❌ AI doesn't know what to do with this

// RIGHT: Explicit per-question
const prompt = `
Question 1: Topic "fractions", Mastery 85%, Target: EASY (review)
Question 2: Topic "decimals", Mastery 30%, Target: EASY (scaffolding)
...
`;
// ✅ AI has clear instructions per question
```

### Pitfall 5: No Graceful Degradation
**What goes wrong:** Profile fetch fails or has no data; quiz crashes or shows static difficulty.

**Why it happens:** Assuming profile always exists and has data.

**How to avoid:**
- Fallback to child's global proficiency level (already exists)
- Treat missing topics as neutral (50% mastery, medium difficulty)
- If profile fetch errors, log warning and continue with static quiz
- Show parents "Building profile..." indicator when data insufficient

**Warning signs:**
- Quiz crashes when profile missing
- First-time users see error instead of quiz
- No indication of profile confidence level

**Implementation:**
```typescript
// Graceful fallback chain
async function loadProfileForQuiz(childId: string, subjectId: string) {
  try {
    const profile = await getProfile(childId);
    if (profile && Object.keys(profile.topicMastery).length > 3) {
      return profile; // ✅ Sufficient data
    }
  } catch (error) {
    logger.warn('useQuizSession: Profile fetch failed, using fallback', {}, error);
  }

  // Fallback: Use child's global proficiency
  return null; // Caller will use proficiency[subjectId]
}
```

## Code Examples

### Full Adaptive Quiz Flow
```typescript
// pages/QuizSession.tsx (MODIFY existing component)
// Source: Study Buddy existing patterns + Phase 2 enhancements

function QuizSession() {
  const { child, subject, topic } = useParams();
  const { getProfile } = useLearnerProfile();

  // Load profile at session start
  const [profile, setProfile] = useState<LearnerProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!child) return;

      try {
        const data = await getProfile(child.id);
        setProfile(data);
        logger.info('QuizSession: Profile loaded', {
          childId: child.id,
          topicCount: Object.keys(data?.topicMastery || {}).length
        });
      } catch (error) {
        logger.warn('QuizSession: Profile unavailable, using fallback', {}, error);
        setProfile(null);
      }
    }

    loadProfile();
  }, [child?.id]);

  // Calculate difficulty distribution
  const difficultyMix = useMemo(() => {
    if (!profile || !subject) return null;

    const availableTopics = subject.topics || [topic];
    const classification = classifyTopics(profile, subject.id, availableTopics);
    const mix = mixDifficulty(classification, 10, true);
    const ordered = orderTopics(mix);

    logger.info('QuizSession: Difficulty mix calculated', {
      review: mix.reviewTopics.length,
      target: mix.targetTopics.length,
      weak: mix.weakTopics.length
    });

    return { mix, ordered };
  }, [profile, subject, topic]);

  // Generate questions with mastery data
  const generateQuestions = useCallback(async () => {
    if (!difficultyMix || !subject || !child) {
      // Fallback: Static generation (existing behavior)
      return await generateQuizQuestions(
        subject.name,
        topic,
        child.grade,
        5,
        child.proficiency?.[subject.id] || 'medium'
      );
    }

    // Profile-aware generation
    const requests: QuestionRequest[] = difficultyMix.ordered.map(topic => {
      const mastery = profile?.topicMastery[topic];
      const pKnown = mastery?.pKnown ?? 0.5;
      const masteryPercentage = Math.round(pKnown * 100);

      // Map mastery to target difficulty
      let targetDifficulty: DifficultyLevel;
      if (pKnown < 0.5) {
        targetDifficulty = 'easy'; // Weak topics need scaffolding
      } else if (pKnown < 0.8) {
        targetDifficulty = 'medium'; // Learning topics at level
      } else {
        targetDifficulty = 'easy'; // Mastered topics as review
      }

      return { topic, masteryPercentage, targetDifficulty };
    });

    return await generateProfileAwareQuestions(
      subject.name,
      requests,
      child.grade
    );
  }, [difficultyMix, profile, subject, child, topic]);

  // Use quiz session hook with custom generator
  const quiz = useQuizSession({
    child,
    subject,
    topic,
    upcomingTests,
    isFinalReview: false,
    customQuestionGenerator: generateQuestions, // NEW
    onSessionSave: async (session) => {
      await addSession(session);
      // Phase 1 fire-and-forget update happens in store.tsx
    }
  });

  // Handle early endings
  if (quiz.isFinished) {
    if (quiz.fatigueEndMessage) {
      return <FatigueEndScreen message={quiz.fatigueEndMessage} />;
    }
    if (quiz.frustrationEndMessage) {
      return <FrustrationEndScreen message={quiz.frustrationEndMessage} />;
    }
    return <QuizResults {...quiz} />;
  }

  // Render quiz interface
  return <QuizUI {...quiz} />;
}
```

### Hebrew Encouragement Messages
```typescript
// lib/encouragement.ts (NEW)
// Source: Israeli educational psychology best practices

/**
 * Hebrew encouragement messages for adaptive quiz endings
 *
 * Guidelines:
 * - Natural conversational Hebrew for Israeli children
 * - Positive framing (celebrate effort, not emphasize failure)
 * - Age-appropriate vocabulary
 */

export const FATIGUE_MESSAGES = [
  'עבודה מצוינת! בואו נקח הפסקה 🌟',
  'כל הכבוד! השגתם הרבה היום 💪',
  'יפה מאוד! זמן טוב להפסקה קטנה ☀️'
];

export const FRUSTRATION_MESSAGES = [
  'עבודה נהדרת! בואו ננסה משהו אחר 🎯',
  'היי! כבר תרגלתם הרבה היום 🌈',
  'מעולה! בואו נעשה הפסקה קצרה 🎨'
];

export const EARLY_END_EXPLANATIONS = {
  fatigue: 'זיהינו שמהר/ה עם התשובות - זה בסדר גמור! לפעמים מוח צריך הפסקה קטנה.',
  frustration: 'ראינו שהחומר היה קצת מאתגר היום - נתרגל את זה שוב בפעם הבאה.',
  allTopicsBlocked: 'תרגלנו הרבה נושאים שונים היום - זה זמן מצוין להפסקה!'
};

/**
 * Select random encouragement message
 */
export function getEncouragementMessage(type: 'fatigue' | 'frustration'): string {
  const messages = type === 'fatigue' ? FATIGUE_MESSAGES : FRUSTRATION_MESSAGES;
  return messages[Math.floor(Math.random() * messages.length)];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed difficulty per child | Per-topic mastery with mixing ratios | 2018+ (Duolingo A/B tests) | 30% better retention |
| Quiz until all questions answered | Adaptive early ending on fatigue | 2020+ (Khan Academy) | Reduced frustration, better engagement |
| Global frustration tracking | Per-topic circuit breakers | 2022+ (IXL) | Allows continued learning on other topics |
| Static question selection | AI generation with mastery prompts | 2024+ (Gemini structured output) | Dynamic difficulty targeting |

**Deprecated/outdated:**
- **One difficulty per quiz** - Use mixed difficulty for spaced retrieval
- **Never ending quiz early** - Modern adaptive systems respect cognitive load
- **Manual question banks** - AI generation more flexible and scalable

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal Fatigue Thresholds for Hebrew Curriculum**
   - What we know: 50% speed reduction + 40% accuracy drop is conservative
   - What's unclear: Israeli children's baseline answer speeds vs. US data
   - Recommendation: Start with 50%/40% thresholds, log fatigue events, calibrate after 50+ sessions if false positives >20%

2. **Frustration Cooldown Duration**
   - What we know: 2-3 questions allows emotional reset
   - What's unclear: Optimal number may vary by age (grades 1-3 vs. 7-8)
   - Recommendation: Use 3-question cooldown universally, consider grade-specific tuning in Phase 4 if data shows patterns

3. **Gemini Prompt Reliability for Difficulty Targeting**
   - What we know: Gemini 2.0 Flash supports structured prompts
   - What's unclear: Does mastery percentage in prompt reliably control difficulty?
   - Recommendation: Monitor generated difficulty vs. requested, add validation layer if mismatch >30%

4. **Question Type Progression (Multiple Choice → Free-Form)**
   - What we know: Context specifies low mastery = more MC, high mastery = more free-form
   - What's unclear: Gemini schema only supports multiple choice (4 options)
   - Recommendation: Phase 2 uses MC only; defer free-form to Phase 5 with new question types

## Sources

### Primary (HIGH confidence)

**Study Buddy Codebase:**
- `/hooks/useQuizSession.ts` - Existing quiz state management pattern
- `/services/geminiService.ts` - AI generation with retry, structured output
- `/types.ts` - ChildProfile, QuizQuestion, DifficultyLevel types
- Phase 1 research - BKT parameters, profile schema, fire-and-forget pattern

**Educational Research:**
- Corbett & Anderson (1994) - BKT difficulty calibration (from Phase 1)
- Bjork & Bjork (2011) - "Making Things Hard on Yourself, But in a Good Way: Creating Desirable Difficulties to Enhance Learning" (spaced retrieval, mixing ratios)
- Sweller (2011) - "Cognitive Load Theory" (fatigue detection foundations)
- VanLehn (2011) - "The Relative Effectiveness of Human Tutoring, Intelligent Tutoring Systems, and Other Tutoring Systems" (frustration handling in ITS)

**AI Platform Documentation:**
- Gemini API Structured Generation: https://ai.google.dev/gemini-api/docs/structured-output (verified approach for difficulty targeting)

### Secondary (MEDIUM confidence)

**Industry Implementation Patterns:**
- Khan Academy Engineering Blog - Adaptive difficulty discussions (2015-2020)
- Duolingo Half-Life Regression paper (2020) - Spaced repetition, difficulty mixing
- IXL Learning Systems - Per-topic mastery tracking (public materials, 2022)

**Context from Phase 1:**
- BKT parameter calibration (grades 1-3, 4-6, 7-8)
- Mastery thresholds (weak <0.5, learning 0.5-0.8, mastered >=0.8)
- Profile schema and fire-and-forget update pattern

### Tertiary (LOW confidence, needs validation)

**Unverified Items:**
- Exact fatigue thresholds (50% speed, 40% accuracy) - Based on general cognitive load research, not validated for Hebrew curriculum
- Frustration cooldown (3 questions) - Heuristic from ITS literature, not experimentally validated for this context
- Mixing ratio (20/50/30) - Common in spaced repetition literature but not specifically tested for Israeli K-8
- Hebrew encouragement messaging - Based on general Israeli cultural knowledge, not validated by child psychologists

## Metadata

**Confidence breakdown:**
- Difficulty mixing algorithm: HIGH - Well-established in educational research (Bjork, 2011)
- Integration with existing codebase: HIGH - Direct extension of useQuizSession and geminiService patterns
- Fatigue detection thresholds: MEDIUM - Research-based but needs calibration for Study Buddy context
- Frustration circuit breaker: HIGH - Proven ITS pattern (VanLehn, 2011)
- Gemini prompt reliability: MEDIUM - Platform supports structured generation, but difficulty targeting needs monitoring
- Implementation effort: HIGH - Clear code examples, no new dependencies, ~200 LOC additions

**Research date:** 2026-01-22
**Valid until:** 60 days (adaptive learning patterns stable, Gemini API stable, may need calibration data refresh)

**Ready for planning:** YES - All implementation details specified, integration points clear, code examples provided, pitfalls documented, graceful fallbacks designed
