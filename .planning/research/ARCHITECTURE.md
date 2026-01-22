# Architecture Patterns: Adaptive Learning Profiles

**Domain:** Educational personalization systems
**Researched:** 2026-01-22
**Confidence:** MEDIUM (based on training data, not verified with current sources)

## Recommended Architecture

Adaptive learning profile systems follow a **signal-driven architecture** where multiple learning events (signals) update a central profile, which then drives personalization decisions.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LEARNING SIGNALS                              │
│  (Quiz results, time spent, mistakes, engagement, evaluations)      │
└────────────┬────────────┬───────────────┬──────────────────────────┘
             │            │               │
             ▼            ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌─────────────┐
    │  Signal    │  │  Signal    │  │  Signal     │
    │ Adapters   │  │ Adapters   │  │  Adapters   │
    └─────┬──────┘  └─────┬──────┘  └──────┬──────┘
          │               │                 │
          └───────────────┴─────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Profile Updater     │
              │  (Aggregation Logic)  │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Learning Profile    │
              │   (Firestore Doc)     │
              │  - Topic strengths    │
              │  - Learning velocity  │
              │  - Engagement level   │
              │  - Difficulty pref    │
              └───────────┬───────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌───────────────┐                  ┌────────────────┐
│ Recommendation│                  │ Quiz Generator │
│    Engine     │                  │    Adapter     │
│  (AI/Rules)   │                  │                │
└───────┬───────┘                  └────────┬───────┘
        │                                   │
        ▼                                   ▼
  Suggested Topics               Personalized Questions
```

### Component Boundaries

| Component | Responsibility | Inputs | Outputs |
|-----------|---------------|--------|---------|
| **Signal Adapters** | Transform domain events into normalized signals | Quiz completion, evaluation upload, time tracking | `LearningSignal` objects |
| **Profile Updater** | Aggregate signals into profile updates | `LearningSignal[]` | Updated `LearningProfile` |
| **Learning Profile** | Persistent learner model | Profile updates | Current state |
| **Recommendation Engine** | Suggest next learning activities | `LearningProfile`, available topics | Ranked topic list |
| **Quiz Generator Adapter** | Personalize question generation | `LearningProfile`, topic | AI prompt modifiers |

### Data Flow

**Forward Flow (Signal → Profile → Personalization):**
1. User completes activity (quiz, evaluation)
2. Signal Adapter normalizes event data
3. Profile Updater aggregates signal into profile
4. Profile persists to Firestore
5. Recommendation Engine / Quiz Generator consume profile

**Backward Flow (Profile → UI):**
1. UI requests recommendations
2. Recommendation Engine reads profile
3. AI generates suggestions based on strengths/weaknesses
4. UI displays personalized dashboard

## Integration with Study Buddy

### Current Architecture (from codebase analysis)

Study Buddy uses:
- **React Context (`store.tsx`)** - Global state with Firestore subscriptions
- **Service Layer** - Typed services for each collection (children, sessions, evaluations)
- **Custom Hooks** - State management (useQuizSession, useErrorHandler)
- **Gemini AI** - Quiz generation via `geminiService.ts`

### Proposed Integration Points

```typescript
// 1. NEW: LearningProfile document per child (Firestore)
interface LearningProfile {
  childId: string;
  familyId: string;

  // Topic-level tracking
  topicMastery: Record<string, TopicMastery>;

  // Global learning characteristics
  learningVelocity: number;      // Questions/hour, trends over time
  engagementLevel: 'high' | 'medium' | 'low';
  preferredDifficulty: DifficultyLevel;

  // Meta
  lastUpdated: number;
  totalQuizzes: number;
  totalQuestions: number;
}

interface TopicMastery {
  topic: string;
  subjectId: string;

  // Performance metrics
  correctRate: number;           // 0-1
  averageTime: number;           // Seconds per question
  consecutiveCorrect: number;    // Current streak

  // Learning curve
  attempts: number;              // Total questions answered
  recentTrend: 'improving' | 'stable' | 'declining';

  // Difficulty distribution
  easyCorrect: number;
  mediumCorrect: number;
  hardCorrect: number;

  // Dates
  firstAttempt: number;
  lastAttempt: number;
  estimatedMastery: number;      // 0-100
}

// 2. NEW: profileService.ts - Profile CRUD
export async function getProfile(childId: string): Promise<LearningProfile>;
export async function updateProfile(childId: string, updates: Partial<LearningProfile>): Promise<void>;
export async function subscribeToProfile(childId: string, callback: (profile: LearningProfile) => void): Unsubscribe;

// 3. NEW: signalService.ts - Signal processing
export async function processQuizSignal(session: StudySession, profile: LearningProfile): Promise<Partial<LearningProfile>>;
export async function processEvaluationSignal(evaluation: Evaluation, profile: LearningProfile): Promise<Partial<LearningProfile>>;
export async function processEngagementSignal(childId: string, signal: EngagementSignal): Promise<void>;

// 4. MODIFIED: geminiService.ts - Consume profile for personalization
export async function generateQuizQuestions(
  subject: string,
  topic: string,
  grade: GradeLevel,
  count: number,
  profile?: LearningProfile  // NEW: optional profile
): Promise<QuizQuestion[]>;

// 5. NEW: recommendationService.ts - AI-powered recommendations
export async function generateTopicRecommendations(
  childId: string,
  profile: LearningProfile,
  availableSubjects: Subject[]
): Promise<TopicRecommendation[]>;

// 6. MODIFIED: store.tsx - Add profiles to context
interface StoreContextType extends AppState {
  profiles: Record<string, LearningProfile>;  // childId -> profile
  // ...
}
```

## Patterns to Follow

### Pattern 1: Signal-First Updates

**What:** Every learning activity generates a signal that updates the profile asynchronously.

**When:** After quiz completion, evaluation upload, engagement tracking.

**Why:** Decouples profile updates from UI flow. Profile builds incrementally over time.

**Example:**
```typescript
// In store.tsx addSession callback
const addSession = useCallback(async (sessionData: StudySession) => {
  // 1. Save session (existing)
  await addSessionService(session);

  // 2. Award points (existing)
  await awardPoints(child.id, child.stars, child.streak, pointsEarned);

  // 3. NEW: Process learning signal
  const profile = profiles[session.childId];
  if (profile) {
    const updates = await processQuizSignal(session, profile);
    await updateProfile(session.childId, updates);
  }
}, [profiles]);
```

### Pattern 2: Profile-Aware AI Prompts

**What:** Modify AI prompts based on profile data.

**When:** Generating quiz questions, recommendations, feedback.

**Why:** Personalization happens at prompt construction, not post-processing.

**Example:**
```typescript
// In geminiService.ts
export async function generateQuizQuestions(
  subject: string,
  topic: string,
  grade: GradeLevel,
  count: number,
  profile?: LearningProfile
): Promise<QuizQuestion[]> {
  let prompt = `Generate ${count} questions...`;

  // Personalize based on profile
  if (profile?.topicMastery[topic]) {
    const mastery = profile.topicMastery[topic];

    if (mastery.estimatedMastery > 80) {
      prompt += `\nThis student has mastered basics. Include advanced questions.`;
    } else if (mastery.recentTrend === 'declining') {
      prompt += `\nStudent struggling recently. Start with easier questions to rebuild confidence.`;
    }

    if (mastery.averageTime > 120) {
      prompt += `\nStudent takes time to think. Avoid trick questions, focus on conceptual understanding.`;
    }
  }

  // ... rest of generation
}
```

### Pattern 3: Lazy Profile Initialization

**What:** Create profile on first quiz, not at child creation.

**When:** Child completes first activity.

**Why:** Avoid empty profiles. Only create when data exists.

**Example:**
```typescript
// In signalService.ts
export async function processQuizSignal(
  session: StudySession,
  profile: LearningProfile | null
): Promise<LearningProfile> {
  if (!profile) {
    // First quiz - initialize profile
    profile = {
      childId: session.childId,
      familyId: session.familyId,
      topicMastery: {},
      learningVelocity: 0,
      engagementLevel: 'medium',
      preferredDifficulty: 'medium',
      lastUpdated: Date.now(),
      totalQuizzes: 0,
      totalQuestions: 0
    };
  }

  // Update with new data
  return updateProfileFromSession(profile, session);
}
```

### Pattern 4: Weighted Recency

**What:** Recent performance weighs more than old data.

**When:** Calculating mastery, trends, difficulty preferences.

**Why:** Learning is dynamic. Old struggles shouldn't penalize current mastery.

**Example:**
```typescript
function calculateMastery(topic: TopicMastery): number {
  const sessions = getRecentSessions(topic, 10); // Last 10 sessions

  let weightedSum = 0;
  let totalWeight = 0;

  sessions.forEach((session, index) => {
    const recencyWeight = Math.exp(-0.1 * (sessions.length - index - 1));
    weightedSum += session.correctRate * recencyWeight;
    totalWeight += recencyWeight;
  });

  return weightedSum / totalWeight * 100;
}
```

### Pattern 5: Multi-Signal Aggregation

**What:** Combine signals from different sources (quizzes, evaluations, engagement).

**When:** Updating profile after any learning activity.

**Why:** Holistic view of learner. Quiz scores alone insufficient.

**Example:**
```typescript
interface LearningSignal {
  type: 'quiz' | 'evaluation' | 'engagement';
  childId: string;
  timestamp: number;
  data: QuizSignal | EvaluationSignal | EngagementSignal;
}

async function aggregateSignals(
  profile: LearningProfile,
  signals: LearningSignal[]
): Promise<Partial<LearningProfile>> {
  const updates: Partial<LearningProfile> = {};

  // Process each signal type
  for (const signal of signals) {
    switch (signal.type) {
      case 'quiz':
        Object.assign(updates, processQuizData(profile, signal.data));
        break;
      case 'evaluation':
        Object.assign(updates, processEvaluationData(profile, signal.data));
        break;
      case 'engagement':
        Object.assign(updates, processEngagementData(profile, signal.data));
        break;
    }
  }

  return updates;
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Profile Bloat

**What goes wrong:** Storing every raw event in the profile document.

**Why it happens:** "We might need this data later" mentality.

**Consequences:**
- Profile documents grow unbounded (Firestore 1MB limit)
- Slow reads/writes
- Expensive queries

**Instead:**
- Store aggregated metrics only in profile
- Keep raw events in separate collections (sessions, evaluations)
- Query historical data when needed, don't duplicate

**Example:**
```typescript
// BAD: Storing full session history in profile
interface LearningProfile {
  allSessions: StudySession[];  // ❌ Grows forever
  allEvaluations: Evaluation[];  // ❌ Could hit 1MB limit
}

// GOOD: Store aggregates, reference originals
interface LearningProfile {
  topicMastery: Record<string, TopicMastery>;  // ✅ Fixed size
  totalQuizzes: number;                        // ✅ Single number
  // Original sessions stored in 'sessions' collection
}
```

### Anti-Pattern 2: Synchronous Profile Updates

**What goes wrong:** Blocking UI on profile calculations.

**Why it happens:** Treating profile updates like critical path operations.

**Consequences:**
- Slow quiz completion
- Poor UX during session save
- Timeout errors

**Instead:**
- Update profile asynchronously after session save
- Use Firebase transactions for atomic updates
- UI doesn't wait for profile updates

**Example:**
```typescript
// BAD: Wait for profile update
async function finishSession() {
  const session = buildSession();
  await saveSession(session);
  await updateProfile(session);  // ❌ UI waits
  navigate('/dashboard');        // ❌ Blocked
}

// GOOD: Fire-and-forget profile update
async function finishSession() {
  const session = buildSession();
  await saveSession(session);
  navigate('/dashboard');        // ✅ Immediate

  // Background update (don't await)
  updateProfile(session).catch(err => {
    logger.error('Profile update failed', {}, err);
  });
}
```

### Anti-Pattern 3: Over-Personalization

**What goes wrong:** Every question tailored to learner, removing challenge.

**Why it happens:** Misunderstanding adaptive learning goal.

**Consequences:**
- Student never leaves comfort zone
- No growth, just validation
- Boredom from predictability

**Instead:**
- Zone of proximal development (slightly above current level)
- Mix 70% mastered + 30% challenging
- Gradual difficulty increase

**Example:**
```typescript
// BAD: Only generate questions at current mastery level
const difficulty = profile.topicMastery[topic].estimatedMastery < 50 ? 'easy' : 'hard';
// ❌ Student stuck at easy or hard

// GOOD: Mix of current + stretch
function selectDifficulty(mastery: number): DifficultyLevel[] {
  if (mastery < 40) {
    return ['easy', 'easy', 'easy', 'medium', 'medium'];  // 60% comfort, 40% growth
  } else if (mastery < 70) {
    return ['easy', 'medium', 'medium', 'medium', 'hard'];  // Balanced
  } else {
    return ['medium', 'medium', 'hard', 'hard', 'hard'];  // Challenge mastery
  }
}
```

### Anti-Pattern 4: Static Difficulty Mapping

**What goes wrong:** Hard-coded rules for difficulty assignment.

**Why it happens:** Simplicity over adaptability.

**Consequences:**
- Doesn't adapt to individual learning pace
- Grade-level assumptions don't fit all learners
- No room for acceleration or remediation

**Instead:**
- Use profile data to dynamically adjust difficulty
- Allow learners to move at their own pace
- AI can recommend difficulty based on performance history

**Example:**
```typescript
// BAD: Grade determines difficulty
const difficulty = child.grade === 'כיתה א' ? 'easy' : 'medium';
// ❌ All Grade 1 students get easy

// GOOD: Profile-driven difficulty
function recommendDifficulty(
  topic: string,
  profile: LearningProfile
): DifficultyLevel {
  const mastery = profile.topicMastery[topic];

  if (!mastery || mastery.attempts < 5) {
    return 'medium';  // Default for new topics
  }

  if (mastery.recentTrend === 'improving' && mastery.estimatedMastery > 70) {
    return 'hard';  // Challenge growth
  } else if (mastery.recentTrend === 'declining') {
    return 'easy';  // Rebuild confidence
  } else {
    return 'medium';  // Standard progression
  }
}
```

### Anti-Pattern 5: Recommendation Tunnel Vision

**What goes wrong:** Only recommending weak topics.

**Why it happens:** "Fix weaknesses" mentality dominates.

**Consequences:**
- Student always studying what they dislike
- Demotivation and burnout
- Ignoring strengths and interests

**Instead:**
- Balance weakness remediation with strength building
- Offer choice between recommended topics
- Celebrate mastery, don't just fix gaps

**Example:**
```typescript
// BAD: Only recommend weak areas
const recommendations = weakTopics.slice(0, 3);
// ❌ "Study what you're bad at"

// GOOD: Balanced recommendations
interface TopicRecommendation {
  topic: string;
  reason: 'weakness' | 'growth' | 'maintenance' | 'exploration';
  priority: number;
}

function generateRecommendations(profile: LearningProfile): TopicRecommendation[] {
  return [
    ...getWeakTopics(profile, 2),      // Fix 2 weaknesses
    ...getGrowthTopics(profile, 2),    // Challenge 2 improving areas
    ...getMaintenanceTopics(profile, 1) // Review 1 mastered topic
  ].sort((a, b) => b.priority - a.priority);
}
```

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Profile reads** | Direct Firestore reads | Add caching layer (Redis) | CDN-cached profile snapshots |
| **Signal processing** | In-app async updates | Cloud Functions for background processing | Event streaming (Kafka/Pub/Sub) |
| **AI personalization** | Per-request Gemini calls | Batch processing, caching | Pre-computed recommendation sets |
| **Profile storage** | Single Firestore doc per child | Sharded profiles (topics split across docs) | Tiered storage (hot/warm/cold) |
| **Real-time updates** | Firestore onSnapshot | Debounced subscriptions | WebSocket with selective updates |

### Study Buddy Context (Current Scale)

Study Buddy is a **family-scale app** (likely <100 concurrent users). Recommended starting point:

1. **Simple Firestore architecture**: One profile doc per child
2. **Client-side signal processing**: Update profiles in React after session save
3. **No caching layer**: Direct Firestore reads are fast enough
4. **AI on-demand**: Generate recommendations when user navigates to dashboard
5. **Subscription-based updates**: Existing `onSnapshot` pattern works well

**When to upgrade:**
- Profile reads >1000/day per child → Add caching
- Signal processing causing UI lag → Move to Cloud Functions
- AI costs >$100/month → Batch processing and caching

## Build Order (Dependency-Based)

### Phase 1: Profile Foundation (No AI yet)
**Goal:** Store and update profiles from quiz signals

1. **Define types** (`types.ts`)
   - `LearningProfile`, `TopicMastery`, `LearningSignal`
2. **Create profileService.ts**
   - `getProfile`, `updateProfile`, `subscribeToProfile`
   - CRUD operations, no complex logic yet
3. **Basic signal processing** (`signalService.ts`)
   - `processQuizSignal` - Update topic mastery from session
   - Simple aggregation: correct rate, attempts, last attempt date
4. **Integrate with store.tsx**
   - Add `profiles` to context
   - Call `processQuizSignal` after `addSession`
5. **UI: Display profile data**
   - Show topic mastery in ChildDetails > Analysis tab
   - "You've mastered X topics" summary

**Why this order:** Foundation before intelligence. Prove data collection works.

### Phase 2: Profile-Aware Quiz Generation
**Goal:** Consume profile to personalize questions

1. **Modify `generateQuizQuestions`**
   - Add optional `profile` parameter
   - Build prompt modifiers based on mastery, trends
2. **Update `useQuizSession` hook**
   - Fetch profile before loading questions
   - Pass profile to `generateQuizQuestions`
3. **Test personalization**
   - Quiz A: Student with 80% mastery → harder questions
   - Quiz B: Student with 40% mastery → easier questions

**Why this order:** Visible value to users. Builds on Phase 1 data.

### Phase 3: AI-Powered Recommendations
**Goal:** Suggest next topics based on profile

1. **Create `recommendationService.ts`**
   - `generateTopicRecommendations` - Call Gemini with profile data
   - Input: `LearningProfile`, available subjects
   - Output: Ranked list of `TopicRecommendation[]`
2. **Add recommendations to ChildDashboard**
   - "Recommended for you" section
   - Show 3-5 topics with reasons (weakness, growth, etc.)
3. **Integrate with existing "Next up" feature**
   - Replace static upcoming tests with AI suggestions

**Why this order:** AI shines with rich profile data. Needs Phase 1 history.

### Phase 4: Multi-Signal Aggregation
**Goal:** Incorporate evaluations, engagement into profile

1. **Evaluation signal processing**
   - `processEvaluationSignal` - Extract weak/strong topics
   - Update topic mastery based on school test results
2. **Engagement tracking**
   - Track time spent per session
   - Update `learningVelocity`, `engagementLevel`
3. **Signal weighting**
   - Evaluation signal > Quiz signal (teacher-validated)
   - Recent signals > Old signals (recency weighting)

**Why this order:** Advanced feature. Requires mature profile system.

### Phase 5: Profile Dashboard & Insights
**Goal:** Visualize learning progress over time

1. **Profile analytics UI**
   - Charts: Mastery over time, velocity trends
   - Badges: "Fast Learner", "Math Whiz", "Persistent"
2. **Parent insights**
   - "Sarah's learning velocity increased 20% this month"
   - "Recommendation: Focus on fractions this week"

**Why last:** Polish feature. Core functionality must work first.

## Critical Path for Study Buddy

**Must-have for MVP:**
- Phase 1: Profile storage and quiz signal processing
- Phase 2: Profile-aware question generation

**Nice-to-have:**
- Phase 3: AI recommendations
- Phase 4: Multi-signal aggregation
- Phase 5: Profile dashboard

**Suggested ordering rationale:**
- Start with Phase 1 (foundation) immediately
- Phase 2 proves value quickly (personalized quizzes)
- Phases 3-5 can be built incrementally based on user feedback

**Estimated complexity:**
- Phase 1: 2-3 days (types, service, store integration)
- Phase 2: 1-2 days (modify existing geminiService)
- Phase 3: 2-3 days (new AI service, UI integration)
- Phase 4: 2-3 days (evaluation processing)
- Phase 5: 3-4 days (charting, analytics UI)

**Total: ~10-15 days for full adaptive profile system**

## Key Decisions to Make

1. **Profile granularity:**
   - Store per-question performance or per-session aggregates?
   - Recommendation: Per-session (simpler, sufficient for personalization)

2. **Difficulty algorithm:**
   - Rule-based (if mastery > 70 → hard) or AI-driven (ask Gemini)?
   - Recommendation: Start rule-based, add AI if needed

3. **Recommendation frequency:**
   - Generate on every dashboard visit or cache for N hours?
   - Recommendation: Cache for 1 hour, regenerate on profile updates

4. **Profile initialization:**
   - Create empty profile at child creation or on first quiz?
   - Recommendation: On first quiz (avoids empty states)

5. **Evaluation weighting:**
   - How much should school evaluations override quiz history?
   - Recommendation: Evaluations set baseline, quizzes fine-tune

## Sources

**Confidence: MEDIUM - LOW**

- Architecture patterns: Based on training data about adaptive learning systems (as of January 2025)
- No current sources verified (WebSearch unavailable)
- Patterns drawn from: Intelligent Tutoring Systems, Learning Management Systems, educational technology best practices
- Study Buddy integration: HIGH confidence (direct codebase analysis)

**Recommendations:**
- Verify with current adaptive learning research papers (2024-2026)
- Check if Gemini API has new personalization features
- Review Firestore best practices for profile storage patterns
- Consult ITS (Intelligent Tutoring System) literature for signal processing algorithms

**Limitations:**
- No verification of current state-of-the-art (SOTA) in 2026
- WebSearch unavailable for recent examples
- Patterns may be outdated if significant advances occurred post-January 2025
