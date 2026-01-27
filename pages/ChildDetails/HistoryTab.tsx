/**
 * History Tab - Session history for a child
 *
 * Shows all completed quiz sessions with expandable details
 * showing individual question results.
 * Parents can add observation notes to questions via NoteDialog.
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { HistoryTabProps } from './types';
import { StudySession, ParentNoteCategory } from '../../types';
import { useStore } from '../../store';
import { NoteDialog } from '../../components/NoteDialog';
import { addParentNote } from '../../services/parentNotesService';

export const HistoryTab: React.FC<HistoryTabProps> = ({
  child,
  subjects,
  sessions
}) => {
  const { family, parent } = useStore();
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // NoteDialog state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteContext, setNoteContext] = useState<{
    sessionId: string;
    questionIndex: number;
    questionText: string;
    topic: string;
    isCorrect: boolean;
  } | null>(null);

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  const handleAddNote = (
    sessionId: string,
    questionIndex: number,
    questionText: string,
    topic: string,
    isCorrect: boolean
  ) => {
    setNoteContext({ sessionId, questionIndex, questionText, topic, isCorrect });
    setNoteDialogOpen(true);
  };

  const handleNoteSubmit = async (category: ParentNoteCategory, note: string) => {
    if (!noteContext || !family || !parent) return;

    await addParentNote({
      childId: child.id,
      familyId: family.id,
      parentId: parent.id,
      sessionId: noteContext.sessionId,
      questionIndex: noteContext.questionIndex,
      topic: noteContext.topic,
      note,
      category,
      questionCorrect: noteContext.isCorrect
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 animate-fade-in">
        עדיין אין היסטוריית תרגולים.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 animate-fade-in">
        {sessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            subject={subjects.find(s => s.id === session.subjectId)}
            isExpanded={expandedSessionId === session.id}
            onToggle={() => toggleSessionExpand(session.id)}
            onAddNote={handleAddNote}
          />
        ))}
      </div>

      {/* NoteDialog for adding parent observations */}
      {noteContext && (
        <NoteDialog
          open={noteDialogOpen}
          onClose={() => setNoteDialogOpen(false)}
          onSubmit={handleNoteSubmit}
          questionText={noteContext.questionText}
          topic={noteContext.topic}
          isCorrect={noteContext.isCorrect}
        />
      )}
    </>
  );
};

// --- Sub-components ---

interface SessionCardProps {
  session: StudySession;
  subject: HistoryTabProps['subjects'][number] | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onAddNote: (
    sessionId: string,
    questionIndex: number,
    questionText: string,
    topic: string,
    isCorrect: boolean
  ) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  subject,
  isExpanded,
  onToggle,
  onAddNote
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
                onAddNote={() => onAddNote(
                  session.id,
                  idx,
                  q.questionText,
                  session.topic,
                  isCorrect
                )}
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
  onAddNote: () => void;
}

const QuestionResult: React.FC<QuestionResultProps> = ({
  questionText,
  isCorrect,
  userAnswer,
  correctAnswer,
  onAddNote
}) => (
  <div className="bg-white p-3 rounded-lg border border-gray-200">
    <div className="flex gap-2 mb-2">
      <div className="mt-1">
        {isCorrect
          ? <CheckCircle size={16} className="text-green-500" />
          : <XCircle size={16} className="text-red-500" />
        }
      </div>
      <div className="font-medium text-gray-900 flex-1">{questionText}</div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddNote();
        }}
        className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors whitespace-nowrap"
        title="הוסף הערה"
      >
        <MessageSquare size={14} />
        <span>הוסף הערה</span>
      </button>
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
