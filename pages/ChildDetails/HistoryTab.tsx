/**
 * History Tab - Session history for a child
 *
 * Shows all completed quiz sessions with expandable details
 * showing individual question results.
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { HistoryTabProps } from './types';
import { StudySession } from '../../types';

export const HistoryTab: React.FC<HistoryTabProps> = ({
  subjects,
  sessions
}) => {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 animate-fade-in">
        עדיין אין היסטוריית תרגולים.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {sessions.map(session => (
        <SessionCard
          key={session.id}
          session={session}
          subject={subjects.find(s => s.id === session.subjectId)}
          isExpanded={expandedSessionId === session.id}
          onToggle={() => toggleSessionExpand(session.id)}
        />
      ))}
    </div>
  );
};

// --- Sub-components ---

interface SessionCardProps {
  session: StudySession;
  subject: HistoryTabProps['subjects'][number] | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  subject,
  isExpanded,
  onToggle
}) => {
  const scorePercentage = session.score / session.totalQuestions;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - clickable */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${subject?.color || 'bg-gray-400'} text-white`}>
            {subject?.icon}
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{session.topic}</h4>
            <div className="text-sm text-gray-500 flex gap-2">
              <span>
                {new Date(session.date).toLocaleDateString('he-IL', {
                  day: 'numeric',
                  month: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {session.isFinalReview && (
                <span className="text-purple-600 font-bold">• חזרה למבחן</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ScoreBadge score={session.score} total={session.totalQuestions} percentage={scorePercentage} />
          {isExpanded
            ? <ChevronUp size={20} className="text-gray-400" />
            : <ChevronDown size={20} className="text-gray-400" />
          }
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-gray-50 p-4 border-t border-gray-100 space-y-3 animate-fade-in">
          {session.questions.map((q, idx) => {
            const userAnswer = session.userAnswers ? session.userAnswers[idx] : -1;
            const isCorrect = userAnswer === q.correctAnswerIndex;

            return (
              <QuestionResult
                key={idx}
                questionText={q.questionText}
                isCorrect={isCorrect}
                userAnswer={q.options[userAnswer]}
                correctAnswer={q.options[q.correctAnswerIndex]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ScoreBadgeProps {
  score: number;
  total: number;
  percentage: number;
}

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, total, percentage }) => (
  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
    percentage > 0.8
      ? 'bg-green-100 text-green-700'
      : 'bg-yellow-100 text-yellow-700'
  }`}>
    {score}/{total}
  </div>
);

interface QuestionResultProps {
  questionText: string;
  isCorrect: boolean;
  userAnswer: string | undefined;
  correctAnswer: string;
}

const QuestionResult: React.FC<QuestionResultProps> = ({
  questionText,
  isCorrect,
  userAnswer,
  correctAnswer
}) => (
  <div className="bg-white p-3 rounded-lg border border-gray-200">
    <div className="flex gap-2 mb-2">
      <div className="mt-1">
        {isCorrect
          ? <CheckCircle size={16} className="text-green-500" />
          : <XCircle size={16} className="text-red-500" />
        }
      </div>
      <div className="font-medium text-gray-900">{questionText}</div>
    </div>
    {!isCorrect && (
      <div className="mr-6 text-sm">
        <span className="text-red-600 line-through ml-2">{userAnswer}</span>
        <span className="text-green-600 font-bold">{correctAnswer}</span>
      </div>
    )}
  </div>
);

export default HistoryTab;
