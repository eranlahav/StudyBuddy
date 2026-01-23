---
phase: "05"
plan: "06"
subsystem: profile-integration
tags: [forgetting-curve, regression-alerts, notifications, hooks]
dependency-graph:
  requires: ["05-01", "05-02", "05-03"]
  provides: ["decay-wrapper", "regression-notifications", "alert-banner"]
  affects: ["dashboard-display", "parent-notifications"]
tech-stack:
  added: []
  patterns: ["real-time-regression-detection", "auto-dismiss-notifications", "cooldown-tracking"]
file-tracking:
  created:
    - pages/ChildDetails/AlertNotificationBanner.tsx
  modified:
    - services/profileService.ts
    - services/index.ts
    - hooks/useLearnerProfile.ts
    - pages/ChildDetails/index.tsx
decisions:
  - id: "05-06-01"
    name: "decayed-profile-via-usememo"
    choice: "Compute decayed profile via useMemo in hook"
    reason: "Auto-updates when profile changes without manual refresh"
  - id: "05-06-02"
    name: "notification-auto-dismiss"
    choice: "8 second auto-dismiss timeout for notifications"
    reason: "Balance between visibility and non-intrusiveness"
  - id: "05-06-03"
    name: "subjects-as-hook-param"
    choice: "Pass subjects array to useLearnerProfile"
    reason: "Enable subject name lookup for alert messages"
metrics:
  duration: "3 min"
  completed: "2026-01-23"
---

# Phase 05 Plan 06: Decay & Alert Wiring Summary

**One-liner:** Wire forgetting curve decay into profile reads and regression detection with in-app notification banner

## What Was Built

### Task 1: Decay wrapper in profile service
Added `getProfileWithDecay` function to profileService.ts:
- Imports `applyForgettingCurveToProfile` from lib
- Async wrapper that gets profile and applies decay
- Returns null if no profile exists
- For use in recommendations/display (not profile updates)
- Exported via services/index.ts

### Task 2: Regression detection in useLearnerProfile hook
Extended useLearnerProfile with comprehensive regression detection:
- Import alertService functions (detectRegression, createRegressionAlert, shouldAlertForRegression)
- Import applyForgettingCurveToProfile from lib/forgettingCurve
- Added alerts and activeNotification state
- Track previous profile via prevProfileRef for comparison
- Track alert cooldowns per topic via alertCooldownRef (14-day cooldown)
- Compare current vs previous profile in subscription callback
- Create alerts when regression detected (respecting cooldown)
- Auto-dismiss notifications after 8 seconds (configurable via options)
- Added dismissAlert and dismissNotification functions
- Added decayedProfile state (profile with forgetting curve applied via useMemo)
- Accept subjects parameter for getting subject names in alerts
- Reset alerts when child changes

### Task 3: AlertNotificationBanner component
Created AlertNotificationBanner.tsx:
- Amber warning banner styling (non-critical, informational)
- AlertTriangle icon for visual indicator
- Dismiss button with X icon
- Accessible (role="alert", aria-live="polite")
- Returns null when no alert (no DOM footprint)

Wired into ChildDetails/index.tsx:
- Import AlertNotificationBanner
- Pass subjects to useLearnerProfile for alert messages
- Get activeNotification and dismissNotification from hook
- Render banner between ProfileHeader and TabNavigation

## Implementation Details

### Forgetting Curve Integration
```typescript
// profileService.ts
export async function getProfileWithDecay(childId: string): Promise<LearnerProfile | null> {
  const profile = await getProfile(childId);
  if (!profile) return null;
  return applyForgettingCurveToProfile(profile);
}
```

### Regression Detection Flow
```typescript
// In useLearnerProfile subscription callback
for (const [topicKey, currentMastery] of Object.entries(data.topicMastery)) {
  const previousMastery = prevProfileRef.current.topicMastery[topicKey];
  if (detectRegression(currentMastery, previousMastery)) {
    if (shouldAlertForRegression(currentMastery, lastAlerted)) {
      const alert = createRegressionAlert(child, currentMastery, subjectName, previousPKnown);
      // Add to alerts, show as notification
    }
  }
}
```

### New Hook Interface
```typescript
interface UseLearnerProfileReturn {
  profile: LearnerProfile | null;
  decayedProfile: LearnerProfile | null;  // NEW: decay applied
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getTopicsByMastery: (level: MasteryLevel) => TopicMastery[];
  getConfidenceLevel: () => 'low' | 'medium' | 'high';
  alerts: RegressionAlert[];              // NEW: all alerts
  activeNotification: RegressionAlert | null;  // NEW: current notification
  dismissAlert: (alertId: string) => void;     // NEW
  dismissNotification: () => void;              // NEW
}
```

## Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| 1 | Add decay wrapper to profile service | d08347c | feat |
| 2 | Add regression detection to useLearnerProfile | a1765ae | feat |
| 3 | Create AlertNotificationBanner and wire into ChildDetails | f7fc1d5 | feat |

## Files Changed

**Created:**
- `pages/ChildDetails/AlertNotificationBanner.tsx` - Notification banner component

**Modified:**
- `services/profileService.ts` - Added getProfileWithDecay function
- `services/index.ts` - Export getProfileWithDecay
- `hooks/useLearnerProfile.ts` - Added regression detection, alerts, decayedProfile
- `pages/ChildDetails/index.tsx` - Wired AlertNotificationBanner

## Key Links Verified

| From | To | Via | Status |
|------|----|-----|--------|
| services/profileService.ts | lib/forgettingCurve.ts | applyForgettingCurveToProfile import | Verified (via lib/index.ts) |
| hooks/useLearnerProfile.ts | services/alertService.ts | detectRegression import | Verified |
| pages/ChildDetails/index.tsx | AlertNotificationBanner.tsx | Component import | Verified |

## Verification

- [x] TypeScript compiles without errors
- [x] getProfileWithDecay applies forgetting curve
- [x] useLearnerProfile detects regressions and shows notifications
- [x] AlertNotificationBanner displays when activeNotification is set

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

Phase 5 is nearing completion. Remaining:
- Plan 05-05: Visualization Charts (in progress)

After Phase 5:
- User acceptance testing
- Production deployment
