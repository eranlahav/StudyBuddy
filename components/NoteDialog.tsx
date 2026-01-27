/**
 * NoteDialog - Modal dialog for adding parent observation notes
 *
 * Used in HistoryTab to add contextual notes about quiz questions.
 * Notes feed into the learning profile via processParentNoteSignal.
 */

import React, { useState } from 'react';
import { X, MessageSquarePlus, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './Button';
import { ParentNoteCategory } from '../types';

interface NoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (category: ParentNoteCategory, note: string) => Promise<void>;
  questionText: string;
  topic: string;
  isCorrect: boolean;
}

/**
 * Hebrew labels for note categories
 */
const CATEGORY_OPTIONS: { value: ParentNoteCategory; label: string }[] = [
  { value: 'guessed', label: 'ניחש/ה' },
  { value: 'struggled', label: 'התקשה/התה' },
  { value: 'skipped_step', label: 'דילג/ה על שלב' },
  { value: 'misunderstood', label: 'לא הבין/ה את השאלה' },
  { value: 'other', label: 'אחר' }
];

export const NoteDialog: React.FC<NoteDialogProps> = ({
  open,
  onClose,
  onSubmit,
  questionText,
  topic,
  isCorrect
}) => {
  const [category, setCategory] = useState<ParentNoteCategory>('other');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!note.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(category, note.trim());
      // Reset form on success
      setCategory('other');
      setNote('');
      onClose();
    } catch (error) {
      console.error('Failed to submit note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCategory('other');
      setNote('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-indigo-600" />
            הוספת הערה
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Question Context */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 mb-1">
                  נושא: <span className="font-medium text-gray-700">{topic}</span>
                </p>
                <p className="text-gray-900 line-clamp-3">{questionText}</p>
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              סוג ההערה
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ParentNoteCategory)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              disabled={isSubmitting}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תיאור ההתרשמות
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="תאר/י מה הבחנת בזמן שהילד/ה ענה/תה על השאלה..."
              rows={4}
              dir="rtl"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !note.trim()}
            isLoading={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'שומר...' : 'שמור הערה'}
          </Button>
        </div>
      </div>
    </div>
  );
};
