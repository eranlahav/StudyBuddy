# Requirements: Study Buddy v1.1

**Defined:** 2026-01-26
**Core Value:** Every child gets a personalized learning path that adapts to their actual needs - focusing on weaknesses, predicting mastery, and evolving with every interaction.

## v1.1 Requirements

Requirements for UI Enhancements milestone. Each maps to roadmap phases.

### Parent Notes

- [ ] **NOTES-01**: Parent can add observation note during session review (button per question)
- [ ] **NOTES-02**: Parent can select note category (guessed, struggled, skipped step, misunderstood, other)
- [ ] **NOTES-03**: Parent can write free-form observation text in Hebrew
- [ ] **NOTES-04**: System processes note through `processParentNoteSignal` to update profile
- [ ] **NOTES-05**: Parent can view history of notes for a child

### Prerequisite Display

- [ ] **PREREQ-01**: Topic list shows prerequisite dependencies (e.g., "requires: שברים בסיסיים")
- [ ] **PREREQ-02**: Recommendations explain prerequisite logic ("fix X first, then Y will make sense")
- [ ] **PREREQ-03**: System calls `detectPrerequisites` when displaying weak topics

### Mobile Responsiveness

- [ ] **MOBILE-01**: ChildDetails tabs work on mobile (responsive tab navigation)
- [ ] **MOBILE-02**: SkillRadarChart renders correctly on small screens
- [ ] **MOBILE-03**: ProgressTimeline adapts to mobile width
- [ ] **MOBILE-04**: RecommendationsPanel is mobile-friendly (cards stack, text readable)
- [ ] **MOBILE-05**: AnalysisTab topic list is touch-friendly on mobile

## Future Requirements

Deferred to v1.2+. Tracked but not in current roadmap.

### Extended Mobile

- **MOBILE-06**: Child quiz flow optimized for tablets
- **MOBILE-07**: Hebrew games touch controls improved
- **MOBILE-08**: PWA support for offline access

### Advanced Notes

- **NOTES-06**: Voice note transcription for parent observations
- **NOTES-07**: AI-suggested note categories based on answer patterns

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full prerequisite graph visualization | Complex UI (Sankey/force-directed), AI inference sufficient for v1.1 |
| Native mobile app | Web-first, Tailwind responsive approach sufficient |
| Parent notes visible to children | Keep kids in gamified experience, avoid showing "observations" |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NOTES-01 | Phase 6 | Pending |
| NOTES-02 | Phase 6 | Pending |
| NOTES-03 | Phase 6 | Pending |
| NOTES-04 | Phase 6 | Pending |
| NOTES-05 | Phase 6 | Pending |
| PREREQ-01 | Phase 7 | Pending |
| PREREQ-02 | Phase 7 | Pending |
| PREREQ-03 | Phase 7 | Pending |
| MOBILE-01 | Phase 8 | Pending |
| MOBILE-02 | Phase 8 | Pending |
| MOBILE-03 | Phase 8 | Pending |
| MOBILE-04 | Phase 8 | Pending |
| MOBILE-05 | Phase 8 | Pending |

**Coverage:**
- v1.1 requirements: 13 total
- Mapped to phases: 13/13 (100%)
- Unmapped: 0

**Phase mapping:**
- Phase 6 (Parent Notes UI): 5 requirements
- Phase 7 (Prerequisite Display): 3 requirements
- Phase 8 (Mobile Responsiveness): 5 requirements

---
*Requirements defined: 2026-01-26*
*Last updated: 2026-01-26 after roadmap creation*
