# Phase 7: Prerequisite Display - Implementation Plan

**Goal**: Topic dependencies are visible so parents understand why recommendations suggest certain sequences

**Created**: 2026-01-27

---

## Success Criteria (from ROADMAP.md)

1. Topic list in AnalysisTab shows prerequisite badges (e.g., "requires: שברים בסיסיים") for topics with detected dependencies
2. Recommendation cards explain prerequisite logic in reasoning section ("fix X first, then Y will make sense")
3. System calls `detectPrerequisites` when loading weak topics for display (cached per session to minimize AI calls)
4. Prerequisites display as interactive links that navigate to the required topic when clicked

---

## Architecture Analysis

### Existing Backend
- `services/prerequisiteService.ts` - Already implements:
  - `detectPrerequisites(weakTopics, allTopics, subjectName, gradeLevel)` - AI-powered detection
  - `getPrerequisiteMessage(relationship)` - Hebrew formatting
  - `PrerequisiteRelationship` interface with topic, prerequisite, confidence, rationale

### Components to Modify
1. **AnalysisTab.tsx** - Add prerequisite badges to TopicMasteryCard
2. **RecommendationCard.tsx** - Display prerequisite reasoning
3. **useRecommendations.ts** - Integrate prerequisite detection

### New Components/Services Needed
1. **usePrerequisites.ts** - Hook with session-level caching
2. **PrerequisiteBadge.tsx** - Reusable badge component with click navigation

---

## Implementation Plan

### Plan 1: Create usePrerequisites Hook with Session Cache

**File**: `hooks/usePrerequisites.ts`

**Purpose**: Centralized prerequisite detection with session-level caching to minimize AI calls

**Implementation**:
```typescript
// Session-level cache (cleared on page refresh)
const prerequisiteCache = new Map<string, PrerequisiteRelationship[]>();

export function usePrerequisites(
  profile: LearnerProfile | null,
  subjects: Subject[],
  childGrade: GradeLevel
) {
  // Returns: { prerequisites, isLoading, getPrerequisitesFor(subjectId) }
  // - Calls detectPrerequisites for weak topics (pKnown < 0.5)
  // - Caches results by childId + subjectId key
  // - Re-exports PrerequisiteRelationship type
}
```

**Dependencies**: None (first plan)

---

### Plan 2: Create PrerequisiteBadge Component

**File**: `components/PrerequisiteBadge.tsx`

**Purpose**: Reusable badge showing prerequisite relationship with click-to-navigate

**Implementation**:
```typescript
interface PrerequisiteBadgeProps {
  prerequisite: string;        // Topic name to display
  onClick?: () => void;        // Navigation callback
  compact?: boolean;           // Compact mode for cards
}

// Renders: "דורש: {prerequisite}" with Link2 icon
// On click: calls onClick (parent handles navigation to topic)
```

**Dependencies**: None (UI only)

---

### Plan 3: Integrate Prerequisites into AnalysisTab

**File**: `pages/ChildDetails/AnalysisTab.tsx`

**Changes**:
1. Import and use `usePrerequisites` hook
2. Modify `TopicMasteryCard` to accept optional prerequisite prop
3. Render `PrerequisiteBadge` for weak topics with detected prerequisites
4. Handle click to scroll/highlight prerequisite topic in same view

**Dependencies**: Plan 1, Plan 2

---

### Plan 4: Enhance RecommendationCard with Prerequisite Reasoning

**Files**:
- `pages/ChildDetails/RecommendationCard.tsx`
- `hooks/useRecommendations.ts`

**Changes to useRecommendations.ts**:
1. Import `usePrerequisites` hook
2. Add prerequisite info to `Recommendation` interface (extend in types.ts)
3. Include prerequisite reasoning in `reasoning[]` array

**Changes to RecommendationCard.tsx**:
1. Display prerequisite badges when present
2. Add prerequisite-specific reasoning in expanded section
3. Handle click navigation to prerequisite topic

**Dependencies**: Plan 1, Plan 2

---

### Plan 5: Add Prerequisite Type to Recommendation Interface

**File**: `types.ts`

**Changes**:
```typescript
export interface Recommendation {
  // ... existing fields
  prerequisite?: {
    topic: string;
    rationale: string;
  };
}
```

**Dependencies**: None (type-only change)

---

## Execution Order

1. Plan 5: Type changes (no runtime impact)
2. Plan 1: usePrerequisites hook (foundational)
3. Plan 2: PrerequisiteBadge component (UI building block)
4. Plan 3: AnalysisTab integration (Criterion 1 + partial Criterion 4)
5. Plan 4: RecommendationCard integration (Criterion 2 + partial Criterion 4)

---

## Testing Strategy

1. **Manual Testing**:
   - Create child with weak topics in math (e.g., fraction multiplication)
   - Verify prerequisite badges appear in AnalysisTab
   - Click badge and verify navigation to prerequisite topic
   - Check recommendations panel shows prerequisite reasoning

2. **Edge Cases**:
   - No weak topics (no prerequisites shown)
   - API key not configured (graceful degradation)
   - No prerequisites detected (clean display)

---

## Risk Mitigation

- **AI Call Cost**: Session-level caching ensures single call per subject per page load
- **Slow API**: Show loading state, don't block UI
- **No Prerequisites Found**: Display nothing (graceful empty state)
- **Navigation**: Use scrollIntoView with highlight for in-page navigation

---

*Plan ready for execution*
