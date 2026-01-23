/**
 * OverrideModal
 *
 * Captures parent's reason for dismissing a recommendation.
 * Structured options + optional free-text for "other".
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { OverrideReason } from '../../types';
import { Button } from '../../components/Button';

interface OverrideModalProps {
  topic: string;
  isOpen: boolean;
  onConfirm: (reason: OverrideReason, customReason?: string) => void;
  onCancel: () => void;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  topic,
  isOpen,
  onConfirm,
  onCancel
}) => {
  const [selectedReason, setSelectedReason] = useState<OverrideReason>('too_easy');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const reasonOptions: Array<{ value: OverrideReason; label: string }> = [
    { value: 'too_easy', label: 'הילד/ה כבר יודע/ת את זה' },
    { value: 'too_hard', label: 'עדיין מתקדם מדי' },
    { value: 'wrong_priority', label: 'יש דברים חשובים יותר עכשיו' },
    { value: 'other', label: 'סיבה אחרת' }
  ];

  const handleConfirm = () => {
    onConfirm(
      selectedReason,
      selectedReason === 'other' ? customReason : undefined
    );
    // Reset form
    setSelectedReason('too_easy');
    setCustomReason('');
  };

  const handleCancel = () => {
    // Reset form
    setSelectedReason('too_easy');
    setCustomReason('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">למה לדחות את ההמלצה?</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Topic Name */}
        <p className="text-gray-600 mb-6">
          נושא: <span className="font-medium text-gray-900">{topic}</span>
        </p>

        {/* Radio Options */}
        <div className="space-y-3 mb-6">
          {reasonOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
            >
              <input
                type="radio"
                name="override-reason"
                value={option.value}
                checked={selectedReason === option.value}
                onChange={(e) => setSelectedReason(e.target.value as OverrideReason)}
                className="mt-1 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>

        {/* Conditional Textarea for "other" */}
        {selectedReason === 'other' && (
          <div className="mb-6">
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="פרט/י את הסיבה..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleCancel}
            variant="secondary"
            className="flex-1"
          >
            ביטול
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1"
            disabled={selectedReason === 'other' && !customReason.trim()}
          >
            אישור
          </Button>
        </div>
      </div>
    </div>
  );
};
