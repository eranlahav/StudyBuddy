/**
 * GoalForm
 *
 * Allows parents to add learning goals (targets).
 * Structured input: topic dropdown + optional date + description.
 */

import React, { useState } from 'react';
import { Target, X, Plus } from 'lucide-react';
import { LearningGoal, Subject } from '../../types';
import { Button } from '../../components/Button';
import { addLearningGoal, deleteLearningGoal } from '../../services/goalsService';
import { useStore } from '../../store';
import { useErrorState } from '../../hooks/useErrorHandler';

interface GoalFormProps {
  childId: string;
  familyId: string;
  subject: Subject;
  existingGoals: LearningGoal[];
  onAdd: (goal: LearningGoal) => void;
  onDelete: (goalId: string) => void;
}

export const GoalForm: React.FC<GoalFormProps> = ({
  childId,
  familyId,
  subject,
  existingGoals,
  onAdd,
  onDelete
}) => {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { parent } = useStore();
  const { handleError } = useErrorState();

  // Filter out topics that already have goals
  const existingGoalTopics = new Set(existingGoals.map(g => g.topic));
  const availableTopics = subject.topics.filter(topic => !existingGoalTopics.has(topic));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic.trim() || !parent) return;

    setIsSubmitting(true);
    try {
      const goal = await addLearningGoal(
        childId,
        familyId,
        subject.id,
        parent.id,
        selectedTopic,
        targetDate ? new Date(targetDate).getTime() : null,
        description.trim()
      );
      onAdd(goal);
      // Reset form
      setSelectedTopic('');
      setTargetDate('');
      setDescription('');
    } catch (err) {
      handleError(err, 'GoalForm.handleSubmit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await deleteLearningGoal(goalId);
      onDelete(goalId);
    } catch (err) {
      handleError(err, 'GoalForm.handleDelete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Goal Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={20} className="text-indigo-600" />
          הוסף יעד למידה
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Topic Input with Suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              נושא
            </label>
            <input
              type="text"
              list="topic-suggestions"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              placeholder="בחר או הקלד נושא..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <datalist id="topic-suggestions">
              {availableTopics.map(topic => (
                <option key={topic} value={topic} />
              ))}
            </datalist>
            <p className="text-sm text-gray-500 mt-2">
              בחר מהרשימה או הקלד נושא חדש
            </p>
          </div>

          {/* Target Date (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תאריך יעד (אופציונלי)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              הערות (אופציונלי)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="למשל: להתכונן למבחן חודשי, או לחזק את הנושא לפני המעבר לכיתה הבאה"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!selectedTopic.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'מוסיף...' : 'הוסף יעד'}
          </Button>
        </form>
      </div>

      {/* Existing Goals List */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target size={20} className="text-indigo-600" />
          יעדים קיימים
        </h3>

        {existingGoals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">אין יעדים מוגדרים</p>
        ) : (
          <div className="space-y-3">
            {existingGoals.map(goal => {
              const isCustomTopic = !subject.topics.includes(goal.topic);
              return (
              <div
                key={goal.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                    {goal.topic}
                    {isCustomTopic && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        נושא מותאם
                      </span>
                    )}
                  </div>
                  {goal.targetDate && (
                    <div className="text-sm text-gray-600 mb-1">
                      יעד: {new Date(goal.targetDate).toLocaleDateString('he-IL')}
                    </div>
                  )}
                  {goal.description && (
                    <div className="text-sm text-gray-600">{goal.description}</div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                  title="מחק יעד"
                >
                  <X size={20} />
                </button>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
