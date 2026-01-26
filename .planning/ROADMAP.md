# Roadmap: UI Enhancements v1.1

**Milestone:** v1.1
**Created:** 2026-01-26
**Status:** Active

---

## Overview

Surface existing backend capabilities and improve mobile experience. Three focused phases wire up parent notes and prerequisite detection (both already implemented in backend), then optimize responsive design across all ChildDetails components.

## Phases

- [ ] **Phase 6: Parent Notes UI** - Parents can add and view observations that feed into learning profiles
- [ ] **Phase 7: Prerequisite Display** - Topic dependencies visible in recommendations and analysis
- [ ] **Phase 8: Mobile Responsiveness** - All ChildDetails components optimized for phones and tablets

## Phase Details

### Phase 6: Parent Notes UI
**Goal**: Parents can add contextual observations during session review that inform the learning profile

**Depends on**: Nothing (uses existing `processParentNoteSignal` from v1.0)

**Requirements**: NOTES-01, NOTES-02, NOTES-03, NOTES-04, NOTES-05

**Success Criteria** (what must be TRUE):
1. Parent can click "Add Note" button on any question in session review to open note dialog
2. Parent can select note category from dropdown (guessed, struggled, skipped step, misunderstood, other)
3. Parent can write free-form observation in Hebrew text area (supports RTL)
4. System processes note through `processParentNoteSignal` immediately (fire-and-forget, non-blocking)
5. Parent can view complete note history for a child in dedicated Notes tab showing date, topic, question, category, and text

**Plans**: TBD (will be determined during phase planning)

### Phase 7: Prerequisite Display
**Goal**: Topic dependencies are visible so parents understand why recommendations suggest certain sequences

**Depends on**: Phase 6

**Requirements**: PREREQ-01, PREREQ-02, PREREQ-03

**Success Criteria** (what must be TRUE):
1. Topic list in AnalysisTab shows prerequisite badges (e.g., "requires: שברים בסיסיים") for topics with detected dependencies
2. Recommendation cards explain prerequisite logic in reasoning section ("fix X first, then Y will make sense")
3. System calls `detectPrerequisites` when loading weak topics for display (cached per session to minimize AI calls)
4. Prerequisites display as interactive links that navigate to the required topic when clicked

**Plans**: TBD (will be determined during phase planning)

### Phase 8: Mobile Responsiveness
**Goal**: All ChildDetails components work smoothly on phones and tablets with touch-friendly interactions

**Depends on**: Phase 7

**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, MOBILE-05

**Success Criteria** (what must be TRUE):
1. ChildDetails tab navigation collapses to horizontal scrollable tabs on screens < 768px
2. SkillRadarChart renders with appropriate sizing on screens < 640px (responsive width, readable labels)
3. ProgressTimeline adapts to mobile width with vertical month labels and touch-friendly tooltips
4. RecommendationsPanel cards stack vertically on mobile with full-width buttons and 16px minimum tap targets
5. AnalysisTab topic list uses card layout on mobile with large touch targets (48px minimum height per item)

**Plans**: TBD (will be determined during phase planning)

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Parent Notes UI | 0/? | Pending | — |
| 7. Prerequisite Display | 0/? | Pending | — |
| 8. Mobile Responsiveness | 0/? | Pending | — |

**Total:** TBD plans across 3 phases

---
*Created: 2026-01-26*
*Last updated: 2026-01-26*
