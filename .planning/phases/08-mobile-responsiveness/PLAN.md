# Phase 8: Mobile Responsiveness

**Status:** In Progress
**Created:** 2026-01-27

## Goal

All ChildDetails components work smoothly on phones and tablets with touch-friendly interactions.

## Success Criteria

1. ChildDetails tab navigation collapses to horizontal scrollable tabs on screens < 768px
2. SkillRadarChart renders with appropriate sizing on screens < 640px (responsive width, readable labels)
3. ProgressTimeline adapts to mobile width with vertical month labels and touch-friendly tooltips
4. RecommendationsPanel cards stack vertically on mobile with full-width buttons and 16px minimum tap targets
5. AnalysisTab topic list uses card layout on mobile with large touch targets (48px minimum height per item)

## Implementation Plans

### Plan 1: Responsive Tab Navigation

**File:** `pages/ChildDetails/index.tsx`

**Current State:**
- Tab navigation uses `flex-1` for all tabs, causing text truncation on narrow screens
- No mobile-specific styling for touch targets

**Changes:**
1. On screens < 768px (md breakpoint):
   - Remove `flex-1` from tab buttons, use `flex-shrink-0` instead
   - Keep `overflow-x-auto` for horizontal scrolling
   - Add `scroll-snap-type: x mandatory` for better snap behavior
   - Add `scroll-snap-align: start` to each tab
   - Increase touch target: `min-h-[44px]` for accessibility (Apple HIG recommends 44px)
   - Add horizontal padding to container for edge tabs visibility

2. On screens >= 768px:
   - Keep current behavior (tabs fill container)

**Touch-friendly improvements:**
- Add `-webkit-overflow-scrolling: touch` for smooth iOS scrolling
- Hide scrollbar on mobile for cleaner look (webkit-scrollbar)

### Plan 2: Responsive SkillRadarChart

**File:** `pages/ChildDetails/SkillRadarChart.tsx`

**Current State:**
- Fixed height of 350px
- Label font size is 11px (may be too small on mobile)

**Changes:**
1. On screens < 640px (sm breakpoint):
   - Reduce chart height to 280px for better fit
   - Increase label font size to 12px for readability
   - Reduce `outerRadius` from 80% to 70% to prevent label clipping
   - Truncate labels at 10 chars instead of 12 on mobile

2. Use a custom hook or state to detect screen width:
   - Use `window.matchMedia` or `useMediaQuery` pattern
   - Or use Tailwind responsive classes where possible

3. Touch-friendly tooltip:
   - Tooltip already has good styling, ensure it works with touch events

### Plan 3: Responsive ProgressTimeline

**File:** `pages/ChildDetails/ProgressTimeline.tsx`

**Current State:**
- Fixed height of 280px
- XAxis labels are horizontal
- Dots have `r: 4` which may be too small for touch

**Changes:**
1. On screens < 640px:
   - Rotate XAxis labels to vertical (-45 degrees) for space efficiency
   - Increase dot radius to r: 6 for better touch targets
   - Increase `activeDot` to r: 8
   - Reduce chart height to 240px

2. Touch-friendly tooltips:
   - Add touch event support (recharts handles this automatically)
   - Ensure tooltip doesn't overflow screen edges on mobile

3. Improve XAxis for mobile:
   - Use `angle: -45` and `textAnchor: "end"` for vertical labels
   - Add more bottom padding to accommodate rotated labels

### Plan 4: Responsive RecommendationsPanel & RecommendationCard

**Files:**
- `pages/ChildDetails/RecommendationsPanel.tsx`
- `pages/ChildDetails/RecommendationCard.tsx`

**Current State:**
- Cards use `grid gap-4` with no responsive column config
- Buttons have flexible width via `flex-1`
- Touch targets not explicitly sized

**Changes to RecommendationsPanel:**
1. Cards already stack vertically (single column grid) - verify this works on mobile
2. Add responsive padding to container: `p-4 md:p-6`

**Changes to RecommendationCard:**
1. Ensure minimum touch target of 44px (Apple HIG) or 48px (Material Design):
   - Buttons: Add `min-h-[48px]` and `min-w-[48px]` for touch
   - Make buttons full-width on mobile: `flex-col sm:flex-row` for button group

2. On screens < 640px:
   - Stack action buttons vertically with `flex-col`
   - Full-width buttons: `w-full`
   - Reduce padding: `p-4` instead of `p-6`

3. Touch-friendly expandable section:
   - Increase tap target for "למה?" button
   - Add padding around expandable trigger

### Plan 5: Responsive AnalysisTab Topic List

**File:** `pages/ChildDetails/AnalysisTab.tsx`

**Current State:**
- TopicMasteryCard grid: `grid-cols-1 sm:grid-cols-2`
- Cards have `p-4` padding
- No explicit minimum height

**Changes:**
1. Ensure 48px minimum height for touch targets:
   - Add `min-h-[48px]` to TopicMasteryCard or ensure content provides sufficient height
   - Current cards are already > 48px due to content

2. On screens < 640px:
   - Cards already use single column (`grid-cols-1`) - verify this
   - Increase padding on touch areas if needed
   - Ensure clickable areas are clear

3. Subject filter pills:
   - Already have `overflow-x-auto` - good
   - Add `min-h-[44px]` to filter buttons
   - Add scroll padding for edge visibility

4. Touch-friendly interactions:
   - Add active states for better feedback: `active:scale-95`
   - Ensure prerequisite badges are tap-friendly

## Testing Checklist

- [ ] Tab navigation scrolls horizontally on iPhone SE (375px)
- [ ] Tabs snap correctly when scrolling
- [ ] SkillRadarChart labels are readable on mobile
- [ ] ProgressTimeline dates don't overlap
- [ ] Recommendation buttons are easy to tap
- [ ] Topic cards have sufficient touch targets
- [ ] All tooltips work with touch events
- [ ] No horizontal overflow on any screen size

## Files Modified

1. `pages/ChildDetails/index.tsx` - Tab navigation
2. `pages/ChildDetails/SkillRadarChart.tsx` - Radar chart sizing
3. `pages/ChildDetails/ProgressTimeline.tsx` - Timeline mobile adaptation
4. `pages/ChildDetails/RecommendationsPanel.tsx` - Container padding
5. `pages/ChildDetails/RecommendationCard.tsx` - Card mobile layout
6. `pages/ChildDetails/AnalysisTab.tsx` - Topic list touch targets

## Implementation Order

1. Tab navigation (highest visibility)
2. RecommendationCard & RecommendationsPanel (frequently used)
3. AnalysisTab topic list (large touch targets important)
4. SkillRadarChart (visual improvement)
5. ProgressTimeline (visual improvement)
