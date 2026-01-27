/**
 * PrerequisiteBadge Component
 *
 * Displays a prerequisite topic badge with optional click-to-navigate.
 * Used in AnalysisTab topic cards and RecommendationCard.
 *
 * Example: "דורש: שברים בסיסיים" (requires: basic fractions)
 */

import React from 'react';
import { Link2 } from 'lucide-react';

interface PrerequisiteBadgeProps {
  /** The prerequisite topic name to display */
  prerequisite: string;
  /** Optional click handler for navigation */
  onClick?: () => void;
  /** Compact mode for smaller cards */
  compact?: boolean;
  /** Optional rationale tooltip */
  rationale?: string;
}

export const PrerequisiteBadge: React.FC<PrerequisiteBadgeProps> = ({
  prerequisite,
  onClick,
  compact = false,
  rationale
}) => {
  const baseClasses = `
    inline-flex items-center gap-1 rounded-full
    bg-amber-50 border border-amber-200 text-amber-700
    ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
    ${onClick ? 'cursor-pointer hover:bg-amber-100 hover:border-amber-300 transition-colors' : ''}
  `;

  const content = (
    <>
      <Link2 size={compact ? 12 : 14} className="flex-shrink-0" />
      <span className="font-medium">
        {compact ? prerequisite : `דורש: ${prerequisite}`}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={baseClasses}
        title={rationale || `עבור ל-${prerequisite}`}
        aria-label={`דורש קודם: ${prerequisite}. לחץ לניווט`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={baseClasses} title={rationale}>
      {content}
    </span>
  );
};

export default PrerequisiteBadge;
