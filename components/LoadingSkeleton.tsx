/**
 * Loading Skeleton Components
 *
 * Provides placeholder UI while content is loading.
 * Used with React.lazy() and Suspense for code-splitting.
 */

import React from 'react';

/**
 * Generic skeleton pulse animation wrapper
 */
const Pulse: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} style={style} />
);

/**
 * Tab content loading skeleton
 * Matches the general layout of tab content areas
 */
export const TabSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
    <Pulse className="h-8 w-48" />
    <div className="space-y-3">
      <Pulse className="h-4 w-full" />
      <Pulse className="h-4 w-5/6" />
      <Pulse className="h-4 w-4/6" />
    </div>
    <div className="grid grid-cols-2 gap-4 mt-6">
      <Pulse className="h-24" />
      <Pulse className="h-24" />
    </div>
  </div>
);

/**
 * Chart loading skeleton
 * For chart/graph areas in analytics
 */
export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-64' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${height}`}>
    <Pulse className="h-6 w-32 mb-4" />
    <div className="flex items-end justify-between h-40 gap-2">
      {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
        <Pulse key={i} className="flex-1" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

/**
 * Card loading skeleton
 * For test cards, session cards, etc.
 */
export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Pulse className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-4 w-3/4" />
        <Pulse className="h-3 w-1/2" />
      </div>
    </div>
    <Pulse className="h-3 w-full" />
  </div>
);

/**
 * List loading skeleton
 * For lists of items
 */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Full page loading skeleton
 * For entire page loading states
 */
export const PageSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Header skeleton */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center gap-6">
      <Pulse className="h-20 w-20 rounded-full" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-8 w-48" />
        <Pulse className="h-4 w-32" />
      </div>
    </div>

    {/* Tab navigation skeleton */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex gap-2">
      {[1, 2, 3, 4].map(i => (
        <Pulse key={i} className="flex-1 h-10" />
      ))}
    </div>

    {/* Content skeleton */}
    <TabSkeleton />
  </div>
);

/**
 * Inline loading spinner
 * For small loading indicators
 */
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600`} />
  );
};

/**
 * Centered loading state
 * Full-area centered spinner with optional message
 */
export const LoadingState: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-4">
    <Spinner size="lg" />
    {message && <p className="text-gray-500 text-sm">{message}</p>}
  </div>
);
