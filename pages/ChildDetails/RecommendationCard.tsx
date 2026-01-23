/**
 * RecommendationCard
 *
 * Displays a single topic recommendation with:
 * - Priority badge (urgent/important/review)
 * - Confidence indicator (low/medium/high)
 * - Expandable reasoning section
 * - Action buttons (Start Quiz, Override)
 */

import React, { useState } from 'react';
import { Target, ChevronDown, CheckCircle, Minus, HelpCircle } from 'lucide-react';
import { Recommendation } from '../../types';
import { Button } from '../../components/Button';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onStartQuiz: (topic: string) => void;
  onOverride: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onStartQuiz,
  onOverride
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Priority badge configuration
  const priorityConfig = {
    urgent: { color: 'bg-red-100 text-red-800', label: 'דחוף' },
    important: { color: 'bg-yellow-100 text-yellow-800', label: 'חשוב' },
    review: { color: 'bg-green-100 text-green-800', label: 'חיזוק' }
  };

  // Confidence indicator configuration
  const confidenceConfig = {
    high: {
      icon: <CheckCircle size={16} />,
      label: 'דיוק גבוה',
      color: 'text-green-600'
    },
    medium: {
      icon: <Minus size={16} />,
      label: 'דיוק בינוני',
      color: 'text-yellow-600'
    },
    low: {
      icon: <HelpCircle size={16} />,
      label: 'אומדן ראשוני',
      color: 'text-gray-500'
    }
  };

  // Category labels in Hebrew
  const categoryLabels = {
    weakness: 'חיזוק חולשות',
    growth: 'צמיחה והתקדמות',
    maintenance: 'תחזוקה וביסוס'
  };

  const priority = priorityConfig[recommendation.priority];
  const confidence = confidenceConfig[recommendation.confidence];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-indigo-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900">{recommendation.topic}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${priority.color}`}>
              {priority.label}
            </span>
            <span className={`flex items-center gap-1 text-sm ${confidence.color}`}>
              {confidence.icon}
              {confidence.label}
            </span>
          </div>
        </div>
      </div>

      {/* Score and Category */}
      <div className="text-sm text-gray-600 mb-4">
        <span className="font-medium">קטגוריה:</span> {categoryLabels[recommendation.category]}
        {' '}·{' '}
        <span className="font-medium">ציון:</span> {Math.round(recommendation.score)}
      </div>

      {/* Expandable Reasoning */}
      <div className="mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
          למה?
        </button>
        {isExpanded && (
          <div className="bg-gray-50 rounded-lg p-4 mt-2">
            <ul className="space-y-2 text-sm text-gray-700">
              {recommendation.reasoning.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => onStartQuiz(recommendation.topic)}
          className="flex-1"
        >
          התחל תרגול
        </Button>
        <Button
          onClick={onOverride}
          variant="secondary"
          className="px-4"
        >
          דחה
        </Button>
      </div>
    </div>
  );
};
