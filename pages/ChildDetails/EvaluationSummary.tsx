/**
 * EvaluationSummary Component
 *
 * Displays a summary panel in the evaluation review step showing:
 * - Evaluation details (type, subject, name)
 * - Score visualization
 * - OCR issues and confidence
 * - Profile impact preview (what will be saved)
 */

import React from 'react';
import {
  FileText,
  Award,
  AlertTriangle,
  CheckCircle,
  Info,
  BookOpen,
  Eye
} from 'lucide-react';
import {
  detectOcrIssues,
  getConfidenceLabel,
  getConfidenceColorClass,
  getScoreColorClass,
  getTestTypeLabel
} from '../../lib';
import type { EvaluationAnalysisResult } from '../../services';
import type { EvaluationType } from '../../types';

interface FormData {
  testName: string;
  testType: EvaluationType;
  subject: string;
  subjectId?: string;
  totalScore?: number;
  maxScore?: number;
  date: string;
  schoolTerm: string;
  teacherName: string;
  teacherComments: string;
  weakTopics: string[];
  strongTopics: string[];
  addWeakTopicsToStudyPlan: boolean;
}

interface EvaluationSummaryProps {
  analysisResult: EvaluationAnalysisResult;
  formData: FormData;
  subjectName?: string;
  onShowRawText: () => void;
}

export const EvaluationSummary: React.FC<EvaluationSummaryProps> = ({
  analysisResult,
  formData,
  subjectName,
  onShowRawText
}) => {
  const issues = detectOcrIssues(analysisResult);
  const hasIssues = issues.length > 0;

  // Calculate percentage from form data
  const percentage = formData.totalScore !== undefined && formData.maxScore
    ? Math.round((formData.totalScore / formData.maxScore) * 100)
    : undefined;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-2">
        <FileText size={20} />
        <h3 className="font-bold">סיכום הניתוח</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Evaluation Details */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            פרטי ההערכה
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">סוג:</span>
              <span className="mr-2 font-medium">{getTestTypeLabel(formData.testType)}</span>
            </div>
            <div>
              <span className="text-gray-500">מקצוע:</span>
              <span className="mr-2 font-medium">{subjectName || formData.subject || '—'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">שם:</span>
              <span className="mr-2 font-medium">{formData.testName || '—'}</span>
            </div>
            {formData.schoolTerm && (
              <div>
                <span className="text-gray-500">תקופה:</span>
                <span className="mr-2 font-medium">{formData.schoolTerm}</span>
              </div>
            )}
          </div>
        </div>

        {/* Score Section */}
        {(formData.totalScore !== undefined || percentage !== undefined) && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Award size={16} className="text-yellow-500" />
              ציון
            </h4>
            <div className="flex items-center gap-4">
              {percentage !== undefined && (
                <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${getScoreColorClass(percentage)}`}>
                  {percentage}%
                </div>
              )}
              {formData.totalScore !== undefined && formData.maxScore && (
                <div className="text-gray-600">
                  {formData.totalScore} / {formData.maxScore}
                </div>
              )}
            </div>
            {/* Progress bar */}
            {percentage !== undefined && (
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    percentage >= 85 ? 'bg-green-500' :
                    percentage >= 70 ? 'bg-yellow-500' :
                    percentage >= 55 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* OCR Issues Section */}
        {hasIssues && (
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              בעיות סריקה
            </h4>
            <div className="space-y-2">
              {/* Confidence indicator */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">רמת דיוק הסריקה:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${getConfidenceColorClass(analysisResult.confidence)}`}>
                  {analysisResult.confidence}% ({getConfidenceLabel(analysisResult.confidence)})
                </span>
              </div>
              {/* Issue list */}
              <ul className="space-y-1">
                {issues.map((issue, idx) => (
                  <li
                    key={idx}
                    className={`text-sm flex items-start gap-2 p-2 rounded ${
                      issue.severity === 'error'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    {issue.message}
                  </li>
                ))}
              </ul>
              {/* Show raw text button */}
              <button
                onClick={onShowRawText}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Eye size={14} />
                הצג טקסט גולמי מהסריקה
              </button>
            </div>
          </div>
        )}

        {/* High confidence indicator (when no issues) */}
        {!hasIssues && (
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={18} />
              <span className="font-medium">סריקה מוצלחת</span>
              <span className={`mr-auto px-2 py-1 rounded text-sm ${getConfidenceColorClass(analysisResult.confidence)}`}>
                {analysisResult.confidence}%
              </span>
            </div>
            <button
              onClick={onShowRawText}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <Eye size={14} />
              הצג טקסט גולמי
            </button>
          </div>
        )}

        {/* Profile Impact Preview */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <BookOpen size={16} className="text-purple-500" />
            מה יישמר בפרופיל
          </h4>
          <div className="space-y-3">
            {/* Weak topics */}
            {formData.weakTopics.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                  <AlertTriangle size={12} className="text-orange-500" />
                  נושאים לחיזוק:
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.weakTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                {formData.addWeakTopicsToStudyPlan && (
                  <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle size={10} />
                    יתווספו לתוכנית הלימודים
                  </div>
                )}
              </div>
            )}

            {/* Strong topics */}
            {formData.strongTopics.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                  <CheckCircle size={12} className="text-green-500" />
                  נושאים חזקים:
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.strongTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skills (for proficiency summaries) */}
            {analysisResult.skills && analysisResult.skills.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                  <Award size={12} className="text-blue-500" />
                  מיומנויות שזוהו:
                </div>
                <div className="text-sm text-gray-600">
                  {analysisResult.skills.length} מיומנויות
                </div>
              </div>
            )}

            {/* Empty state */}
            {formData.weakTopics.length === 0 &&
             formData.strongTopics.length === 0 &&
             (!analysisResult.skills || analysisResult.skills.length === 0) && (
              <div className="text-sm text-gray-400 italic">
                לא זוהו נושאים או מיומנויות - ניתן להוסיף ידנית בטופס למטה
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationSummary;
