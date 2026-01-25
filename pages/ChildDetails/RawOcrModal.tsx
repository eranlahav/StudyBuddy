/**
 * RawOcrModal Component
 *
 * Displays the raw OCR text extracted from scanned documents.
 * Allows users to reference the original text when editing evaluation data.
 */

import React, { useState } from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';

interface RawOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  confidence: number;
}

export const RawOcrModal: React.FC<RawOcrModalProps> = ({
  isOpen,
  onClose,
  rawText,
  confidence
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" />
            <h3 className="font-bold text-gray-900">טקסט גולמי מהסריקה</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              דיוק: {confidence}%
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {rawText ? (
            <pre
              dir="auto"
              className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              {rawText}
            </pre>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p>לא נמצא טקסט גולמי</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            הטקסט נחלץ אוטומטית מהתמונות - ייתכנו שגיאות
          </p>
          {rawText && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-green-600" />
                  הועתק!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  העתק טקסט
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RawOcrModal;
