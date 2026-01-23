/**
 * RecommendationsPanel
 *
 * Main container for topic recommendations in ChildDetails.
 * Shows recommendations + goals section for selected subject.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Target, ChevronDown, RefreshCw, Info } from 'lucide-react';
import { ChildProfile, Subject, LearningGoal, OverrideReason } from '../../types';
import { useRecommendations } from '../../hooks/useRecommendations';
import { subscribeToGoals } from '../../services/goalsService';
import { RecommendationCard } from './RecommendationCard';
import { OverrideModal } from './OverrideModal';
import { GoalForm } from './GoalForm';
import { Button } from '../../components/Button';

interface RecommendationsPanelProps {
  child: ChildProfile;
  subject: Subject;
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  child,
  subject
}) => {
  const navigate = useNavigate();

  // State for goals (subscribe via Firestore)
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  // State for override modal
  const [overrideTopic, setOverrideTopic] = useState<string | null>(null);

  // Get recommendations
  const {
    recommendations,
    isLoading,
    handleOverride,
    refresh
  } = useRecommendations(child, subject, goals);

  // Subscribe to goals for this child
  useEffect(() => {
    const unsubscribe = subscribeToGoals(child.id, (updatedGoals) => {
      // Filter goals for current subject
      const subjectGoals = updatedGoals.filter(g => g.subjectId === subject.id);
      setGoals(subjectGoals);
    });

    return () => unsubscribe();
  }, [child.id, subject.id]);

  // Handlers
  const handleStartQuiz = (topic: string) => {
    navigate(`/session/${child.id}/${subject.id}/${encodeURIComponent(topic)}`);
  };

  const handleOpenOverride = (topic: string) => {
    setOverrideTopic(topic);
  };

  const handleConfirmOverride = async (reason: OverrideReason, customReason?: string) => {
    if (!overrideTopic) return;
    await handleOverride(overrideTopic, reason, customReason);
    setOverrideTopic(null);
  };

  const handleCancelOverride = () => {
    setOverrideTopic(null);
  };

  const handleAddGoal = (goal: LearningGoal) => {
    // Goals automatically update via subscription
  };

  const handleDeleteGoal = (goalId: string) => {
    // Goals automatically update via subscription
  };

  return (
    <div className="space-y-6">
      {/* Recommendations Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">המלצות ללמידה</h2>
            <button
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="ההמלצות מבוססות על ניתוח ביצועי הילד/ה, מבחנים מתוכננים ויעדי הלמידה שלך"
            >
              <Info size={18} />
            </button>
          </div>
          <Button
            onClick={refresh}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            רענן
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && recommendations.length === 0 && (
          <div className="text-center py-12">
            <Lightbulb className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 text-lg">אין מספיק נתונים להמלצות</p>
            <p className="text-gray-400 text-sm mt-2">
              לאחר שהילד/ה יפתור עוד כמה תרגולים, המערכת תוכל להמליץ על נושאים מתאימים
            </p>
          </div>
        )}

        {/* Recommendations List */}
        {!isLoading && recommendations.length > 0 && (
          <div className="grid gap-4">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.topic}
                recommendation={rec}
                onStartQuiz={handleStartQuiz}
                onOverride={() => handleOpenOverride(rec.topic)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Goals Section (Collapsible) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <button
          onClick={() => setGoalsExpanded(!goalsExpanded)}
          className="flex items-center justify-between w-full mb-4"
        >
          <div className="flex items-center gap-2">
            <Target className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">יעדי למידה</h2>
            {goals.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-sm font-medium">
                {goals.length}
              </span>
            )}
          </div>
          <ChevronDown
            size={20}
            className={`text-gray-400 transition-transform ${goalsExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {goalsExpanded && (
          <div className="pt-4 border-t border-gray-200">
            <GoalForm
              childId={child.id}
              familyId={child.familyId}
              subject={subject}
              existingGoals={goals}
              onAdd={handleAddGoal}
              onDelete={handleDeleteGoal}
            />
          </div>
        )}
      </div>

      {/* Override Modal */}
      <OverrideModal
        topic={overrideTopic || ''}
        isOpen={overrideTopic !== null}
        onConfirm={handleConfirmOverride}
        onCancel={handleCancelOverride}
      />
    </div>
  );
};
