/**
 * AlertNotificationBanner - Regression Alert Notification
 *
 * Displays a dismissable amber warning banner when a child's
 * mastery regresses on a previously mastered topic.
 *
 * Features:
 * - Amber warning style (non-critical, informational)
 * - AlertTriangle icon for visual indicator
 * - Dismiss button to clear notification
 * - Accessible with role="alert" and aria-live
 * - Returns null if no alert (no DOM footprint)
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { RegressionAlert } from '../../types';

export interface AlertNotificationBannerProps {
  /** Alert to display (null = don't render) */
  alert: RegressionAlert | null;
  /** Callback when user dismisses the notification */
  onDismiss: () => void;
}

/**
 * Notification banner for regression alerts
 *
 * @example
 * <AlertNotificationBanner
 *   alert={activeNotification}
 *   onDismiss={dismissNotification}
 * />
 */
export const AlertNotificationBanner: React.FC<AlertNotificationBannerProps> = ({
  alert,
  onDismiss
}) => {
  // Don't render anything if no alert
  if (!alert) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in"
    >
      {/* Warning Icon */}
      <div className="flex-shrink-0 text-amber-600">
        <AlertTriangle size={24} />
      </div>

      {/* Alert Message */}
      <div className="flex-1 text-amber-800">
        <p className="font-medium">{alert.message}</p>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-800 transition-colors"
        aria-label="סגור התראה"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default AlertNotificationBanner;
