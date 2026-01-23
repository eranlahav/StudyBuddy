/**
 * Review Mode Banner - Welcome back message for returning children
 *
 * Displays when a child returns after 3+ weeks gap.
 * Informs parents/children that the next quiz will include review questions.
 *
 * Phase 5 - Profile Maintenance & Visualization
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ReviewModeBannerProps {
  /** Child's name for personalized message */
  childName: string;
  /** Whether review mode is active */
  isReviewMode: boolean;
}

/**
 * Welcome back banner shown when child returns after 3+ week gap.
 * Informs parents/children that quiz will include review questions.
 */
export function ReviewModeBanner({ childName, isReviewMode }: ReviewModeBannerProps) {
  if (!isReviewMode) return null;

  return (
    <div
      className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3"
      role="status"
      aria-live="polite"
    >
      <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-blue-800 font-medium">
          {/* Hebrew: "Welcome back, {name}! Let's do a quick review" */}
          ברוכה השיבה{childName ? `, ${childName}` : ''}! בואי נעשה חזרה מהירה
        </p>
        <p className="text-blue-700 text-sm mt-1">
          {/* Hebrew: "A few weeks have passed since last practice. The next quiz will include review questions to refresh memory." */}
          עברו כמה שבועות מאז התרגול האחרון. החידון הבא יכלול שאלות חזרה כדי לרענן את הזיכרון.
        </p>
      </div>
    </div>
  );
}

export default ReviewModeBanner;
