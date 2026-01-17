/**
 * EvaluationsTab Component
 *
 * Main tab for managing school evaluations.
 * Shows:
 * - Upload button
 * - Trend chart
 * - List of evaluations
 */

import React, { useState, useCallback } from 'react';
import { Plus, FileText, Award } from 'lucide-react';
import { EvaluationsTabProps } from './types';
import { EvaluationCard } from './EvaluationCard';
import { EvaluationTrends } from './EvaluationTrends';
import { UploadEvaluationModal } from './UploadEvaluationModal';
import { Evaluation, UpcomingTest } from '../../types';
import { generateId } from '../../lib';
import { filterEvaluationsByChild, calculateEvaluationStats } from '../../services';

export const EvaluationsTab: React.FC<EvaluationsTabProps> = ({
  child,
  subjects,
  evaluations,
  addEvaluation,
  updateEvaluation,
  deleteEvaluation,
  addUpcomingTest
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter evaluations for this child
  const childEvaluations = filterEvaluationsByChild(evaluations, child.id);

  // Calculate stats
  const stats = calculateEvaluationStats(childEvaluations);

  // Handle saving evaluation from modal
  const handleSaveEvaluation = useCallback(async (evaluation: Omit<Evaluation, 'familyId'>) => {
    await addEvaluation(evaluation);
  }, [addEvaluation]);

  // Handle adding weak topics to study plan
  const handleAddWeakTopics = useCallback(async (topics: string[], subjectId: string) => {
    // Create an upcoming test with the weak topics for reinforcement
    const test: Omit<UpcomingTest, 'familyId'> = {
      id: generateId(),
      childId: child.id,
      subjectId,
      date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week from now
      topics,
      type: 'quiz',
      numQuestions: 5
    };

    await addUpcomingTest(test);
  }, [child.id, addUpcomingTest]);

  // Handle adding a new topic to an existing evaluation
  // This updates the evaluation AND auto-adds to study plan
  const handleAddTopic = useCallback(async (evaluationId: string, topic: string, subjectId: string) => {
    // Find the current evaluation to get existing weak topics
    const evaluation = childEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) return;

    // Update evaluation with new topic
    const updatedWeakTopics = [...evaluation.weakTopics, topic];
    await updateEvaluation(evaluationId, { weakTopics: updatedWeakTopics });

    // Auto-add the new topic to study plan
    await handleAddWeakTopics([topic], subjectId);
  }, [childEvaluations, updateEvaluation, handleAddWeakTopics]);

  // Handle delete evaluation
  const handleDeleteEvaluation = useCallback(async (id: string, fileUrls: string[]) => {
    await deleteEvaluation(id, fileUrls);
  }, [deleteEvaluation]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with stats and upload button */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">הערכות ומבחנים</h2>
              <p className="text-sm text-gray-500">
                {stats.totalEvaluations > 0
                  ? `${stats.totalEvaluations} הערכות • ממוצע ${stats.averageScore}%`
                  : 'העלו מבחנים והערכות מבית הספר'
                }
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={18} />
            העלה הערכה
          </button>
        </div>

        {/* Quick stats */}
        {stats.totalEvaluations > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalEvaluations}</div>
              <div className="text-sm text-gray-500">הערכות</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.averageScore}%</div>
              <div className="text-sm text-gray-500">ממוצע</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.strongTopicsCount}</div>
              <div className="text-sm text-gray-500">נושאים חזקים</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.weakTopicsCount}</div>
              <div className="text-sm text-gray-500">נושאים לחיזוק</div>
            </div>
          </div>
        )}
      </div>

      {/* Trends chart */}
      {childEvaluations.length > 0 && (
        <EvaluationTrends
          evaluations={childEvaluations}
          subjects={subjects}
        />
      )}

      {/* Evaluations list */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <FileText size={18} />
          הערכות אחרונות
        </h3>

        {childEvaluations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">עדיין לא הועלו הערכות</p>
            <p className="text-sm text-gray-400 mb-4">
              העלו תמונות או PDF של מבחנים והערכות מבית הספר
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              + העלה הערכה ראשונה
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {childEvaluations.map(evaluation => (
              <EvaluationCard
                key={evaluation.id}
                evaluation={evaluation}
                subject={subjects.find(s => s.id === evaluation.subject)}
                onDelete={handleDeleteEvaluation}
                onAddTopic={handleAddTopic}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        child={child}
        subjects={subjects}
        onSave={handleSaveEvaluation}
        onAddWeakTopics={handleAddWeakTopics}
      />
    </div>
  );
};

export default EvaluationsTab;
