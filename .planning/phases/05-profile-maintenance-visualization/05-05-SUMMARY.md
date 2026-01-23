---
phase: 05-profile-maintenance-visualization
plan: 05
subsystem: visualization
tags: [recharts, radar-chart, area-chart, RTL, visualization]

dependency_graph:
  requires: ["05-01"]
  provides: ["skill-radar-chart", "progress-timeline-chart"]
  affects: []

tech_stack:
  added: []
  patterns:
    - "RadarChart for multi-topic skill visualization"
    - "AreaChart with gradient fill for progress timeline"
    - "RTL tooltip and legend configuration"

file_tracking:
  created:
    - pages/ChildDetails/SkillRadarChart.tsx
    - pages/ChildDetails/ProgressTimeline.tsx
  modified: []

decisions:
  - key: "min-3-topics-radar"
    choice: "Require 3+ topics for radar chart"
    reason: "Radar charts need minimum 3 points to form meaningful polygon"
  - key: "max-8-topics-radar"
    choice: "Limit radar to 8 topics"
    reason: "More than 8 topics makes labels unreadable"
  - key: "session-accuracy-proxy"
    choice: "Use session accuracy as historical mastery proxy"
    reason: "pKnown snapshots not stored in sessions (future enhancement)"

metrics:
  duration: "3 minutes"
  completed: "2026-01-23"
---

# Phase 5 Plan 5: Visualization Charts Summary

**One-liner:** Radar and area charts for skill distribution and progress timeline using recharts

## What Was Built

### 1. SkillRadarChart (129 LOC)

Radar/spider chart visualization for topic mastery distribution within a subject.

**Key features:**
- Shows pKnown values for all topics in selected subject
- Requires minimum 3 topics (empty state otherwise)
- Limits to 8 topics for readability
- RTL-compatible tooltip showing full topic name and attempt count
- Indigo color scheme matching existing design system

**Usage:**
```tsx
<SkillRadarChart
  profile={learnerProfile}
  subjectId="math-1"
  subjectName="מתמטיקה"
/>
```

### 2. ProgressTimeline (203 LOC)

Area chart showing mastery/accuracy progress over time for a specific topic.

**Key features:**
- Chronological session history for selected topic
- Uses session accuracy as proxy for historical mastery
- Includes current mastery point (dashed green line) if available
- Gradient fill for visual appeal
- RTL-compatible tooltip with session labels
- Graceful empty state for topics with no history

**Usage:**
```tsx
<ProgressTimeline
  topic="שברים"
  sessions={filteredSessions}
  currentMastery={topicMastery}
/>
```

## Technical Details

### Recharts Integration

Both components follow existing recharts patterns from `AnalysisTab.tsx`:
- `ResponsiveContainer` for fluid sizing
- RTL tooltip configuration with `direction: 'rtl'`
- Consistent color scheme (`#6366f1` indigo)
- Right-oriented Y-axis for RTL layout

### Data Transformation

**SkillRadarChart:**
- Filters `profile.topicMastery` by `subjectId`
- Sorts by `pKnown` (highest first)
- Truncates topic names to 12 chars for axis labels
- Preserves full topic name in tooltip

**ProgressTimeline:**
- Filters `sessions` by `topic`
- Sorts chronologically by `date`
- Calculates accuracy percentage per session
- Adds "today" point with current mastery if available

## Verification Results

| Check | Status |
|-------|--------|
| TypeScript compiles | Pass |
| SkillRadarChart >= 80 LOC | Pass (129) |
| ProgressTimeline >= 80 LOC | Pass (203) |
| RadarChart import from recharts | Pass |
| AreaChart import from recharts | Pass |
| Empty state for < 3 topics | Pass |
| RTL styling | Pass |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 0c7f09e | feat | SkillRadarChart component for skill distribution |
| bbfd883 | feat | ProgressTimeline component for mastery progress |

## Integration Notes

These components are ready for integration into the parent UI. Suggested placement:
- **SkillRadarChart**: AnalysisTab when a single subject is selected
- **ProgressTimeline**: Drill-down modal when clicking a topic card

Both export named and default exports for flexible import patterns.

## Next Steps

1. Integration into AnalysisTab UI (separate plan or user decision)
2. Consider storing pKnown snapshots in sessions for accurate historical mastery (Phase 6+)
3. Add click handlers for drill-down from radar to timeline
