/**
 * EvaluationCard Component
 *
 * Displays a single evaluation with score, date, and weak topics.
 * Supports expand/collapse for detailed view.
 */

import React, { useState } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  Trash2,
  ExternalLink,
  Plus,
  Loader2,
  Check
} from 'lucide-react';
import { Evaluation, Subject } from '../../types';

interface EvaluationCardProps {
  evaluation: Evaluation;
  subject?: Subject;
  onDelete?: (id: string, fileUrls: string[]) => void;
  onAddTopic?: (evaluationId: string, topic: string, subjectId: string) => Promise<void>;
}

export const EvaluationCard: React.FC<EvaluationCardProps> = ({
  evaluation,
  subject,
  onDelete,
  onAddTopic
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmed = window.confirm('האם למחוק את ההערכה הזו?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(evaluation.id, evaluation.fileUrls);
    } catch (error) {
      console.error('Failed to delete evaluation:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddTopic = async () => {
    const trimmed = newTopic.trim();
    if (!onAddTopic || !trimmed) return;

    setIsAddingTopic(true);
    try {
      await onAddTopic(evaluation.id, trimmed, evaluation.subject);
      setNewTopic(''); // Clear input on success
    } catch (error) {
      console.error('Failed to add topic:', error);
    } finally {
      setIsAddingTopic(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getScoreColor = (percentage?: number) => {
    if (!percentage) return 'bg-gray-100 text-gray-700';
    if (percentage >= 85) return 'bg-green-100 text-green-700';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-700';
    if (percentage >= 55) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const getTestTypeLabel = (type: Evaluation['testType']) => {
    switch (type) {
      case 'rubric': return 'משוב';
      case 'proficiency_summary': return 'סיכום הערכה';
      case 'test': return 'מבחן';
      default: return 'הערכה';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - clickable */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${subject?.color || 'bg-gray-400'} text-white`}>
            {subject?.icon || <FileText size={20} />}
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{evaluation.testName}</h4>
            <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(evaluation.date)}
              </span>
              <span>•</span>
              <span>{evaluation.subjectName}</span>
              {evaluation.schoolTerm && (
                <>
                  <span>•</span>
                  <span>{evaluation.schoolTerm}</span>
                </>
              )}
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                {getTestTypeLabel(evaluation.testType)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {evaluation.percentage !== undefined && (
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(evaluation.percentage)}`}>
              {evaluation.percentage}%
            </div>
          )}
          {evaluation.totalScore !== undefined && evaluation.maxScore && (
            <div className="text-sm text-gray-500">
              {evaluation.totalScore}/{evaluation.maxScore}
            </div>
          )}
          {isExpanded
            ? <ChevronUp size={20} className="text-gray-400" />
            : <ChevronDown size={20} className="text-gray-400" />
          }
        </div>
      </div>

      {/* Weak topics indicator */}
      {evaluation.weakTopics.length > 0 && !isExpanded && (
        <div className="px-4 pb-3 flex items-center gap-2 text-sm text-orange-600">
          <AlertTriangle size={14} />
          <span>נושאים לחיזוק: {evaluation.weakTopics.slice(0, 2).join(', ')}</span>
          {evaluation.weakTopics.length > 2 && (
            <span className="text-gray-400">+{evaluation.weakTopics.length - 2} נוספים</span>
          )}
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-gray-50 p-4 border-t border-gray-100 space-y-4 animate-fade-in">
          {/* Weak Topics with inline editor */}
          <div className="space-y-2">
            <h5 className="font-medium text-gray-700 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              נושאים לחיזוק
            </h5>
            <div className="flex flex-wrap gap-2">
              {evaluation.weakTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
            {/* Inline topic editor */}
            {onAddTopic && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                  placeholder="הוסף נושא לחיזוק..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isAddingTopic}
                />
                <button
                  onClick={handleAddTopic}
                  disabled={isAddingTopic || !newTopic.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingTopic ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  הוסף
                </button>
              </div>
            )}
          </div>

          {/* Strong Topics */}
          {evaluation.strongTopics.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                נושאים חזקים
              </h5>
              <div className="flex flex-wrap gap-2">
                {evaluation.strongTopics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills (for proficiency summaries) */}
          {evaluation.skills && evaluation.skills.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700 flex items-center gap-2">
                <Award size={16} className="text-blue-500" />
                מיומנויות
              </h5>
              <div className="space-y-2">
                {evaluation.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200"
                  >
                    <span className="font-medium">{skill.name}</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      skill.level === 'שולט/ת היטב' ? 'bg-green-100 text-green-700' :
                      skill.level === 'שולט/ת' ? 'bg-blue-100 text-blue-700' :
                      skill.level === 'שולט/ת באופן חלקי' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {skill.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teacher Comments */}
          {evaluation.teacherComments && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">הערות המורה</h5>
              <p className="text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                {evaluation.teacherComments}
              </p>
            </div>
          )}

          {/* Files */}
          {evaluation.fileUrls.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">קבצים מצורפים</h5>
              <div className="flex flex-wrap gap-2">
                {evaluation.fileUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <ExternalLink size={14} />
                    {evaluation.fileNames[idx] || `קובץ ${idx + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Confidence */}
          {evaluation.aiConfidence !== undefined && (
            <div className="text-sm text-gray-400 flex items-center gap-2">
              רמת דיוק הניתוח: {evaluation.aiConfidence}%
              {evaluation.parentEdited && (
                <span className="text-green-600">• נערך ע״י הורה</span>
              )}
            </div>
          )}

          {/* Delete button */}
          {onDelete && (
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isDeleting ? 'מוחק...' : 'מחק הערכה'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvaluationCard;
