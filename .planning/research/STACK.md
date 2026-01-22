# Technology Stack - Adaptive Learning Profiles

**Project:** Study Buddy (לומדים-בבית)
**Researched:** 2026-01-22
**Confidence:** HIGH (existing stack) / MEDIUM (adaptive patterns)

## Executive Summary

For adaptive learning profiles in Study Buddy, the optimal approach is to **extend the existing stack** rather than introduce new dependencies. The current React/Firebase/Gemini architecture already provides all necessary primitives for effective learner modeling.

**Key Recommendation:** Use a hybrid approach combining Bayesian Knowledge Tracing (BKT) for probability-based skill tracking with rule-based adjustments for parent control. Store learning profiles as Firestore subcollections under each child, leverage Gemini for semantic topic understanding, and implement client-side analytics with React hooks.

## Recommended Stack

### Core Framework (No Changes)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.2.0 | UI Framework | Already established, hooks pattern perfect for profile state |
| TypeScript | ~5.8.2 | Type Safety | Critical for complex profile data structures |
| Vite | ^6.2.0 | Build Tool | Fast HMR for profile UI development |

### Backend & Storage (No Changes)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase Firestore | 12.7.0 | Database | Real-time sync for live profile updates, subcollections for profile history |
| Firebase Auth | 12.7.0 | Authentication | Existing multi-tenant isolation |
| Gemini AI | ^1.34.0 | AI Service | Already integrated for quiz generation, extend for semantic topic matching |

### New Learning Profile Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **NONE** | - | - | **Implement custom BKT** - Educational domain libraries are outdated or enterprise-focused |

**Rationale for Zero Dependencies:**
- Educational tech libraries (e.g., `bayesiankt`, `edm-js`) are either unmaintained or designed for LMS platforms
- BKT algorithm is ~150 LOC of math - trivial to implement
- Custom implementation provides parent override hooks (commercial tools don't)
- No licensing concerns for parent-facing product

### Data Structures & Patterns

#### 1. Learner Model Storage (Firestore)

```typescript
// NEW: Learning profile stored per child
interface LearnerProfile {
  childId: string;
  familyId: string;
  lastUpdated: number;

  // Skill mastery tracking (Bayesian Knowledge Tracing)
  skills: Record<string, SkillState>;

  // Topic relationships (extracted from Gemini)
  topicGraph: TopicNode[];

  // Performance history (for trend analysis)
  performanceWindow: PerformanceSnapshot[]; // Last 30 days

  // Parent overrides (takes precedence over AI)
  parentAdjustments: ParentOverride[];
}

interface SkillState {
  skillId: string;
  name: string;              // e.g., "חיבור שברים"
  subjectId: string;

  // BKT parameters (updated after each quiz)
  pKnown: number;            // Probability student knows skill (0-1)
  pLearn: number;            // Probability of learning from practice
  pGuess: number;            // Probability of lucky guess
  pSlip: number;             // Probability of careless mistake

  // Metadata
  lastPracticed: number;
  totalAttempts: number;
  correctStreak: number;

  // Forgetting curve adjustment
  decayRate: number;         // How fast this skill is forgotten
}

interface TopicNode {
  topicId: string;
  name: string;
  prerequisiteIds: string[]; // Skills needed before this
  dependentIds: string[];    // Skills this unlocks
}

interface PerformanceSnapshot {
  date: number;
  subjectId: string;
  topic: string;
  score: number;
  difficulty: DifficultyLevel;
  timeSpent: number;         // Seconds
}

interface ParentOverride {
  skillId: string;
  type: 'force_easy' | 'force_medium' | 'force_hard' | 'skip' | 'focus';
  reason?: string;
  appliedAt: number;
  expiresAt?: number;        // Optional auto-revert
}
```

**Storage Pattern:**
```
/children/{childId}/learnerProfile (document)
/children/{childId}/profileHistory/{date} (subcollection for archival)
/children/{childId}/sessions/{sessionId} (existing - enrich with skillId tags)
```

#### 2. Bayesian Knowledge Tracing Implementation

**Why BKT?**
- Industry standard for learner modeling (Khan Academy, Duolingo use variants)
- Probabilistic → handles uncertainty gracefully
- Simple 4-parameter model → fast, interpretable
- Proven effective for K-8 education (your target)

**Implementation Pattern:**
```typescript
// lib/learnerModel.ts

interface BKTParams {
  pKnown: number;   // P(student knows skill at time t)
  pLearn: number;   // P(student learns skill if didn't know)
  pGuess: number;   // P(correct answer even if didn't know)
  pSlip: number;    // P(wrong answer even if knew)
}

/**
 * Update skill probability after observing performance
 *
 * @param current - Current BKT parameters
 * @param isCorrect - Whether student answered correctly
 * @returns Updated probability that student knows skill
 */
export function updateBKT(
  current: BKTParams,
  isCorrect: boolean
): number {
  const { pKnown, pLearn, pGuess, pSlip } = current;

  if (isCorrect) {
    // Bayes rule: P(known | correct)
    const numerator = pKnown * (1 - pSlip);
    const denominator = pKnown * (1 - pSlip) + (1 - pKnown) * pGuess;
    const pKnownGivenCorrect = numerator / denominator;

    // Student might have learned from this question
    return pKnownGivenCorrect + (1 - pKnownGivenCorrect) * pLearn;
  } else {
    // Bayes rule: P(known | incorrect)
    const numerator = pKnown * pSlip;
    const denominator = pKnown * pSlip + (1 - pKnown) * (1 - pGuess);
    const pKnownGivenIncorrect = numerator / denominator;

    return pKnownGivenIncorrect + (1 - pKnownGivenIncorrect) * pLearn;
  }
}

/**
 * Recommend difficulty based on skill mastery
 */
export function recommendDifficulty(pKnown: number): DifficultyLevel {
  if (pKnown < 0.3) return 'easy';
  if (pKnown < 0.7) return 'medium';
  return 'hard';
}

/**
 * Apply forgetting curve decay over time
 *
 * @param pKnown - Current mastery probability
 * @param daysSinceLastPractice - Days elapsed
 * @param decayRate - Skill-specific forgetting rate (default 0.05)
 */
export function applyForgetting(
  pKnown: number,
  daysSinceLastPractice: number,
  decayRate: number = 0.05
): number {
  // Exponential decay: p(t) = p(0) * e^(-decay * t)
  return pKnown * Math.exp(-decayRate * daysSinceLastPractice);
}
```

**Initial Parameter Tuning (Grade-Specific):**
```typescript
// lib/constants.ts

export const BKT_DEFAULTS: Record<string, BKTParams> = {
  'grades_1_3': {
    pKnown: 0.1,   // Young learners start lower
    pLearn: 0.3,   // Learn faster per attempt
    pGuess: 0.25,  // 4 options = 25% guess rate
    pSlip: 0.1     // Less careless mistakes (simpler questions)
  },
  'grades_4_6': {
    pKnown: 0.2,
    pLearn: 0.2,
    pGuess: 0.25,
    pSlip: 0.15    // More complex questions = more slips
  },
  'grades_7_8': {
    pKnown: 0.3,   // More prior knowledge
    pLearn: 0.15,  // Slower learning (harder material)
    pGuess: 0.25,
    pSlip: 0.2     // Most slip potential
  }
};
```

#### 3. Topic Graph Extraction (Gemini Integration)

**Extend Existing `geminiService.ts`:**

```typescript
/**
 * Extract prerequisite relationships between topics
 *
 * Used to build topic dependency graph for adaptive sequencing
 */
export async function extractTopicDependencies(
  subject: string,
  topics: string[],
  grade: GradeLevel
): Promise<TopicNode[]> {
  const prompt = `
  You are analyzing a ${grade} ${subject} curriculum.

  Topics: ${topics.join(', ')}

  For each topic, identify:
  1. Prerequisites (topics that must be mastered FIRST)
  2. Dependents (topics this enables)

  Rules:
  - Only include prerequisites that are IN the provided topic list
  - Be conservative - only mark as prerequisite if truly necessary
  - Elementary topics may have no prerequisites

  Example: "חיבור שברים" requires "זיהוי שברים" first
  `;

  // Similar retry pattern to generateQuizQuestions
  // Returns array of TopicNode
}
```

**Why This Approach:**
- Gemini already knows curriculum standards (trained on educational content)
- Avoids hardcoding prerequisite trees per grade/subject
- Parents can visualize "what unlocks what" in UI

#### 4. React Hooks for Profile Management

**New hooks:**
```typescript
// hooks/useLearnerProfile.ts

export function useLearnerProfile(childId: string) {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firestore profile document
  useEffect(() => {
    const unsubscribe = subscribeToProfile(
      childId,
      (updatedProfile) => {
        // Apply forgetting curve decay for stale skills
        const decayedProfile = applyDecayToProfile(updatedProfile);
        setProfile(decayedProfile);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [childId]);

  const updateSkillMastery = useCallback(async (
    skillId: string,
    isCorrect: boolean
  ) => {
    if (!profile) return;

    const skill = profile.skills[skillId];
    const newPKnown = updateBKT(skill, isCorrect);

    // Update Firestore
    await updateSkill(childId, skillId, { pKnown: newPKnown });
  }, [profile, childId]);

  const getRecommendedTopics = useCallback(() => {
    if (!profile) return [];

    // Check parent overrides first
    const forcedFocus = profile.parentAdjustments
      .filter(adj => adj.type === 'focus')
      .map(adj => adj.skillId);

    if (forcedFocus.length > 0) {
      return forcedFocus; // Parent wins
    }

    // Find skills with pKnown < 0.5 (struggling)
    const weakSkills = Object.values(profile.skills)
      .filter(skill => skill.pKnown < 0.5)
      .sort((a, b) => a.pKnown - b.pKnown); // Weakest first

    return weakSkills.slice(0, 3).map(s => s.name);
  }, [profile]);

  return {
    profile,
    loading,
    updateSkillMastery,
    getRecommendedTopics,
    applyParentOverride: (override: ParentOverride) =>
      addParentOverride(childId, override)
  };
}
```

#### 5. Integration with Existing Quiz Flow

**Enrich `StudySession` with skill tracking:**
```typescript
// MODIFY: types.ts

export interface StudySession {
  // ... existing fields

  // NEW: Skill-level analytics
  skillsTested: string[];           // Skill IDs covered in this session
  skillPerformance: Record<string, {
    attempts: number;
    correct: number;
    avgTimeSeconds: number;
  }>;

  // NEW: Adaptive context
  wasAdaptive: boolean;             // True if AI recommended this topic
  recommendationReason?: string;    // Why AI suggested this
}
```

**Modified quiz generation flow:**
```typescript
// services/geminiService.ts

/**
 * Generate adaptive quiz based on learner profile
 *
 * @param profile - Child's current mastery state
 * @param subject - Subject to practice
 * @param focusSkills - Optional parent-specified focus areas
 */
export async function generateAdaptiveQuiz(
  profile: LearnerProfile,
  subject: string,
  focusSkills?: string[]
): Promise<{
  questions: QuizQuestion[];
  targetSkills: string[];
  difficulty: DifficultyLevel;
}> {
  // 1. Determine target skills
  const skills = focusSkills || identifyWeakSkills(profile, subject);

  // 2. Choose difficulty based on average pKnown
  const avgMastery = skills.reduce((sum, id) =>
    sum + profile.skills[id].pKnown, 0) / skills.length;
  const difficulty = recommendDifficulty(avgMastery);

  // 3. Generate questions (existing function)
  const topic = skills.join(', ');
  const questions = await generateQuizQuestions(
    subject,
    topic,
    profile.grade,
    5,
    difficulty
  );

  return { questions, targetSkills: skills, difficulty };
}
```

### Visualization & Analytics

#### UI Components (React + Recharts)

**New Charts:**
```typescript
// components/SkillRadarChart.tsx
// - Shows pKnown across all skills in a subject
// - Uses existing recharts library (already installed)

// components/ProgressTimeline.tsx
// - Line chart of skill mastery over time
// - Uses performanceWindow data

// components/TopicMapGraph.tsx
// - Visual prerequisite tree
// - Uses SVG (no new deps) or recharts Sankey diagram
```

**Parent Dashboard Integration:**
```tsx
// pages/ChildDetails.tsx (already 1,066 LOC - this adds more complexity)

<section className="learning-profile">
  <h3>פרופיל למידה</h3>

  {/* Skill mastery radar */}
  <SkillRadarChart skills={profile.skills} />

  {/* Recommended focus areas */}
  <RecommendationPanel
    recommendations={profile.getRecommendedTopics()}
    onOverride={(skillId) => profile.applyParentOverride({
      skillId,
      type: 'focus',
      appliedAt: Date.now()
    })}
  />

  {/* Topic dependency map */}
  <TopicMapGraph graph={profile.topicGraph} />
</section>
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Learner Model | Custom BKT | Knowledge Space Theory (KST) | KST requires expert-authored Q-matrices (no automation) |
| Learner Model | Custom BKT | Item Response Theory (IRT) | IRT needs 100+ responses per item for calibration (too slow) |
| Learner Model | Custom BKT | Deep Knowledge Tracing (DKT) | Requires TensorFlow.js + large dataset for training |
| Storage | Firestore subcollections | PostgreSQL + Timescale | Introduces new infrastructure, loses real-time sync |
| Topic Graph | Gemini extraction | Manual curriculum mapping | Not scalable across subjects/grades |
| Visualization | Recharts (existing) | D3.js | Overkill for simple charts, large bundle |
| Recommendation | Hybrid BKT + rules | Pure ML (collaborative filtering) | Needs 1000+ users for cold start, no parent control |

## Anti-Patterns to Avoid

### 1. Over-Engineering with ML
**Don't:** Use neural networks, collaborative filtering, or reinforcement learning
**Why:**
- Requires massive datasets (Study Buddy is per-family)
- Black box → parents can't understand recommendations
- Overkill for K-8 domain (BKT is proven sufficient)

### 2. Real-Time Adaptation During Quiz
**Don't:** Change difficulty mid-quiz based on current answers
**Why:**
- Confusing for children (inconsistent difficulty)
- Israeli education emphasizes "fair" assessments (static difficulty)
- Adds complexity to `useQuizSession` hook

**Do:** Adapt NEXT quiz based on THIS quiz's results

### 3. Global Skill Database
**Don't:** Create shared skill taxonomy across all families
**Why:**
- Privacy concerns (multi-tenant app)
- Israeli curriculum varies by school/region
- Parents want customization per child

**Do:** Let each family's skills emerge organically from their usage

### 4. Premature Optimization
**Don't:** Pre-compute all topic dependencies on app load
**Why:**
- Gemini API calls are slow
- Most families use 2-3 subjects actively

**Do:** Lazy-load topic graph when parent views profile

## Installation & Setup

```bash
# No new dependencies needed!
# All logic implemented in existing codebase
```

**New Files to Create:**
```
lib/learnerModel.ts       # BKT algorithm + forgetting curve
lib/topicGraph.ts         # Prerequisite graph utilities
hooks/useLearnerProfile.ts # Profile state management
services/profileService.ts # Firestore CRUD for profiles
components/profile/       # Skill charts + recommendation UI
```

**Modify Existing:**
```
types.ts                  # Add LearnerProfile, SkillState, etc.
services/geminiService.ts # Add extractTopicDependencies
pages/QuizSession.tsx     # Track skill performance
pages/ChildDetails.tsx    # Add profile visualizations
```

## Performance Considerations

| Concern | At 1 Child | At 5 Children | At 20 Children/Family |
|---------|-----------|---------------|----------------------|
| Firestore reads | ~10/month/child | ~50/month | ~200/month (well under free tier) |
| BKT computation | <1ms client-side | <5ms | <20ms (negligible) |
| Gemini API calls | +1 call per subject (topic graph) | +3-5 calls | +10-15 calls (still within quota) |
| Bundle size | +0 KB (no new deps) | +0 KB | +0 KB |

**Scaling Strategy:**
- Profile updates: Write-behind pattern (batch every 10 seconds)
- Topic graphs: Cache in localStorage (refresh weekly)
- Skill decay: Compute on-demand (not on every load)

## Migration Path

**Phase 1 (MVP):**
1. Add `LearnerProfile` type and Firestore structure
2. Implement BKT algorithm (lib/learnerModel.ts)
3. Hook into existing quiz flow (enrich StudySession)
4. Basic skill list UI (no charts yet)

**Phase 2 (Visualization):**
5. Add SkillRadarChart component
6. Add recommendation panel
7. Parent override UI

**Phase 3 (Advanced):**
8. Topic dependency graph (Gemini integration)
9. Forgetting curve decay
10. Trend analysis (30-day performance window)

## Confidence Assessment

| Component | Confidence | Notes |
|-----------|------------|-------|
| BKT Implementation | **HIGH** | Well-documented algorithm, proven in production |
| Firestore Schema | **HIGH** | Matches existing multi-tenant patterns |
| Gemini Integration | **MEDIUM** | Topic extraction is heuristic (accuracy varies) |
| Forgetting Curve | **MEDIUM** | Parameter tuning requires per-child calibration |
| UI/UX Patterns | **HIGH** | Recharts + existing components sufficient |

## Sources

**Bayesian Knowledge Tracing:**
- Corbett, A. T., & Anderson, J. R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge. *User Modeling and User-Adapted Interaction*.
- Khan Academy engineering blog (2015): "How We Use Bayesian Knowledge Tracing"

**Forgetting Curve:**
- Ebbinghaus, H. (1885/1964). Memory: A Contribution to Experimental Psychology.
- Duolingo research blog (2020): "Half-Life Regression for personalized practice"

**Educational Technology Patterns:**
- Carnegie Learning Cognitive Tutor (BKT-based, K-12 math)
- Knewton adaptive learning platform (defunct, but open research papers)

**Firebase Firestore:**
- Official documentation: https://firebase.google.com/docs/firestore
- Multi-tenant data modeling: https://firebase.google.com/docs/firestore/solutions/multi-tenant

**Gemini AI:**
- Already integrated in project (services/geminiService.ts)
- Existing patterns for structured JSON output with responseSchema

**React Patterns:**
- Existing codebase already follows hooks-based state management
- Context + subscriptions pattern established in store.tsx

---

## Summary

**Use Custom BKT + Gemini + Firestore.** No new dependencies. Extend existing patterns. Parent control built in. Simple, proven, and scales to thousands of children per family.

**Confidence Level: HIGH** for core implementation, **MEDIUM** for AI-driven topic extraction (needs tuning).
