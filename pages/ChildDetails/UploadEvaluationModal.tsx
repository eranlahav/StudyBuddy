/**
 * UploadEvaluationModal Component
 *
 * Multi-step wizard for uploading and analyzing school evaluations:
 * 1. File Upload - Select images/PDFs
 * 2. AI Processing - Analyze documents
 * 3. Review & Edit - Parent can edit extracted data
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  FileText,
  Loader2,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EvaluationSummary } from './EvaluationSummary';
import { RawOcrModal } from './RawOcrModal';
import {
  Evaluation,
  EvaluationType,
  Subject,
  ChildProfile,
  proficiencyToDifficulty
} from '../../types';
import {
  uploadEvaluationFiles,
  fileToBase64,
  getMimeType,
  isSupportedFileType,
  analyzeEvaluationDocument
} from '../../services';
import { generateId } from '../../lib';
import { processEvaluationSignal } from '../../services/signalService';
import type { EvaluationAnalysisResult } from '../../services';

interface UploadEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: ChildProfile;
  subjects: Subject[];
  onSave: (evaluation: Omit<Evaluation, 'familyId'>) => Promise<void>;
  onAddWeakTopics: (topics: string[], subjectId: string) => Promise<void>;
}

type Step = 'upload' | 'processing' | 'review';

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

const SCHOOL_TERMS = ['מחצית א\'', 'מחצית ב\'', 'שלישון א\'', 'שלישון ב\'', 'שלישון ג\''];

export const UploadEvaluationModal: React.FC<UploadEvaluationModalProps> = ({
  isOpen,
  onClose,
  child,
  subjects,
  onSave,
  onAddWeakTopics
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<EvaluationAnalysisResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    testName: '',
    testType: 'test',
    subject: '',
    subjectId: undefined,
    totalScore: undefined,
    maxScore: undefined,
    date: new Date().toISOString().split('T')[0],
    schoolTerm: '',
    teacherName: '',
    teacherComments: '',
    weakTopics: [],
    strongTopics: [],
    addWeakTopicsToStudyPlan: true
  });

  const [newWeakTopic, setNewWeakTopic] = useState('');
  const [showRawOcrModal, setShowRawOcrModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach(file => {
      if (isSupportedFileType(file)) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: סוג קובץ לא נתמך`);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Process files with AI
  const processFiles = async () => {
    if (files.length === 0) return;

    setStep('processing');
    setProcessingProgress(10);
    setError(null);

    try {
      // Convert files to base64
      setProcessingProgress(20);
      const base64Array: string[] = [];
      const mimeTypes: string[] = [];

      for (const file of files) {
        const base64 = await fileToBase64(file);
        base64Array.push(base64);
        mimeTypes.push(getMimeType(file));
      }

      setProcessingProgress(40);

      // Analyze with AI
      const result = await analyzeEvaluationDocument(
        base64Array,
        mimeTypes,
        child.grade,
        subjects
      );

      setProcessingProgress(80);
      setAnalysisResult(result);

      // Pre-fill form with analysis results
      const matchedSubject = subjects.find(s =>
        s.id === result.subjectId ||
        s.name === result.subject
      );

      setFormData({
        testName: result.testName || '',
        testType: result.testType,
        subject: result.subject || '',
        subjectId: matchedSubject?.id,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        date: new Date().toISOString().split('T')[0],
        schoolTerm: result.schoolTerm || '',
        teacherName: '',
        teacherComments: result.teacherComments || '',
        weakTopics: result.weakTopics || [],
        strongTopics: result.strongTopics || [],
        addWeakTopicsToStudyPlan: true
      });

      setProcessingProgress(100);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בניתוח המסמך');
      setStep('upload');
    }
  };

  // Save evaluation
  const handleSave = async () => {
    if (!formData.testName || !formData.subject) {
      setError('נא למלא את שם המבחן והמקצוע');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Upload files to storage
      const { urls, names } = await uploadEvaluationFiles(
        child.familyId,
        child.id,
        files
      );

      // Calculate percentage
      const percentage = formData.totalScore !== undefined && formData.maxScore
        ? Math.round((formData.totalScore / formData.maxScore) * 100)
        : undefined;

      // Build evaluation object - filter out undefined values for Firestore
      const evaluation: Omit<Evaluation, 'familyId'> = {
        id: generateId(),
        childId: child.id,
        date: new Date(formData.date).getTime(),
        uploadedAt: Date.now(),
        subject: formData.subjectId || formData.subject,
        subjectName: subjects.find(s => s.id === formData.subjectId)?.name || formData.subject,
        testName: formData.testName,
        testType: formData.testType,
        weakTopics: formData.weakTopics,
        strongTopics: formData.strongTopics,
        fileUrls: urls,
        fileNames: names,
        parentEdited: true, // Always true since parent can edit
        // Optional fields - only include if they have values
        ...(formData.schoolTerm && { schoolTerm: formData.schoolTerm }),
        ...(formData.teacherName && { teacherName: formData.teacherName }),
        ...(formData.teacherComments && { teacherComments: formData.teacherComments }),
        ...(formData.totalScore !== undefined && { totalScore: formData.totalScore }),
        ...(formData.maxScore !== undefined && { maxScore: formData.maxScore }),
        ...(percentage !== undefined && { percentage }),
        ...(analysisResult?.skills && analysisResult.skills.length > 0 && {
          skills: analysisResult.skills.map(s => ({
            ...s,
            suggestedDifficulty: proficiencyToDifficulty(s.level)
          }))
        }),
        ...(analysisResult?.questions && analysisResult.questions.length > 0 && {
          questions: analysisResult.questions
        }),
        ...(analysisResult?.rawText && { rawOcrText: analysisResult.rawText }),
        ...(analysisResult?.confidence !== undefined && { aiConfidence: analysisResult.confidence })
      };

      await onSave(evaluation);

      // Fire profile signal (fire-and-forget)
      processEvaluationSignal(evaluation as Evaluation, child).catch(() => {
        // Silently ignore - fire-and-forget pattern
      });

      // Add weak topics to study plan if requested
      if (formData.addWeakTopicsToStudyPlan && formData.weakTopics.length > 0 && formData.subjectId) {
        await onAddWeakTopics(formData.weakTopics, formData.subjectId);
      }

      onClose();
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת ההערכה');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset modal state
  const resetModal = () => {
    setStep('upload');
    setFiles([]);
    setProcessingProgress(0);
    setError(null);
    setAnalysisResult(null);
    setFormData({
      testName: '',
      testType: 'test',
      subject: '',
      subjectId: undefined,
      totalScore: undefined,
      maxScore: undefined,
      date: new Date().toISOString().split('T')[0],
      schoolTerm: '',
      teacherName: '',
      teacherComments: '',
      weakTopics: [],
      strongTopics: [],
      addWeakTopicsToStudyPlan: true
    });
    setNewWeakTopic('');
    setShowRawOcrModal(false);
    setShowEditForm(false);
  };

  // Add weak topic
  const addWeakTopic = () => {
    if (newWeakTopic.trim()) {
      setFormData(prev => ({
        ...prev,
        weakTopics: [...prev.weakTopics, newWeakTopic.trim()]
      }));
      setNewWeakTopic('');
    }
  };

  // Remove weak topic
  const removeWeakTopic = (index: number) => {
    setFormData(prev => ({
      ...prev,
      weakTopics: prev.weakTopics.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">העלאת הערכה</h2>
          <button
            onClick={() => { onClose(); resetModal(); }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
              >
                <Upload size={40} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">גררו קבצים לכאן או לחצו לבחירה</p>
                <p className="text-sm text-gray-400 mt-2">JPG, PNG, PDF, HEIC (עד 10MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>

              {/* Selected files */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">קבצים שנבחרו:</h4>
                  <div className="space-y-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {file.type.startsWith('image/') ? (
                            <ImageIcon size={20} className="text-blue-500" />
                          ) : (
                            <FileText size={20} className="text-red-500" />
                          )}
                          <span className="text-sm truncate max-w-xs">{file.name}</span>
                          <span className="text-xs text-gray-400">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Trash2 size={16} className="text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Continue button */}
              <div className="flex justify-end">
                <button
                  onClick={processFiles}
                  disabled={files.length === 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  המשך לניתוח
                  <span className="mr-1">←</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">מנתח את המסמך...</h3>
              <p className="text-gray-500 mb-4">זה עשוי לקחת מספר שניות</p>

              {/* Progress bar */}
              <div className="max-w-xs mx-auto">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400 mt-2">{processingProgress}%</span>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && analysisResult && (
            <div className="space-y-6">
              {/* Success message */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <Check size={20} className="text-green-600" />
                <span className="text-green-700">
                  הניתוח הושלם! בדקו ותקנו את הנתונים אם צריך.
                </span>
              </div>

              {/* Summary Panel */}
              <EvaluationSummary
                analysisResult={analysisResult}
                formData={formData}
                subjectName={subjects.find(s => s.id === formData.subjectId)?.name}
                onShowRawText={() => setShowRawOcrModal(true)}
              />

              {/* Collapsible Edit Form */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowEditForm(!showEditForm)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-700">עריכת פרטים</span>
                  {showEditForm ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </button>

                {showEditForm && (
                  <div className="p-4 pt-0 space-y-4 border-t border-gray-100">
                    {/* Form */}
                    <div className="grid grid-cols-2 gap-4">
                {/* Test Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    סוג מסמך
                  </label>
                  <select
                    value={formData.testType}
                    onChange={(e) => setFormData(prev => ({ ...prev, testType: e.target.value as EvaluationType }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="test">מבחן</option>
                    <option value="rubric">משוב</option>
                    <option value="proficiency_summary">סיכום הערכה</option>
                    <option value="other">אחר</option>
                  </select>
                </div>

                {/* Test Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם המבחן *
                  </label>
                  <input
                    type="text"
                    value={formData.testName}
                    onChange={(e) => setFormData(prev => ({ ...prev, testName: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="לדוגמה: מבדק כפל וחילוק"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מקצוע *
                  </label>
                  <select
                    value={formData.subjectId || ''}
                    onChange={(e) => {
                      const subject = subjects.find(s => s.id === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        subjectId: e.target.value,
                        subject: subject?.name || prev.subject
                      }));
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">בחר מקצוע</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    תאריך המבחן
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ציון
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.totalScore ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        totalScore: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="w-20 p-2 border border-gray-300 rounded-lg text-center"
                      placeholder="76"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      value={formData.maxScore ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        maxScore: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="w-20 p-2 border border-gray-300 rounded-lg text-center"
                      placeholder="100"
                    />
                  </div>
                </div>

                {/* School Term */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מחצית
                  </label>
                  <select
                    value={formData.schoolTerm}
                    onChange={(e) => setFormData(prev => ({ ...prev, schoolTerm: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">בחר מחצית</option>
                    {SCHOOL_TERMS.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Weak Topics */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  נושאים לחיזוק
                </label>

                <div className="flex flex-wrap gap-2">
                  {formData.weakTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm flex items-center gap-2"
                    >
                      {topic}
                      <button
                        onClick={() => removeWeakTopic(idx)}
                        className="hover:text-orange-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWeakTopic}
                    onChange={(e) => setNewWeakTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addWeakTopic()}
                    className="flex-1 p-2 border border-gray-300 rounded-lg"
                    placeholder="הוסף נושא לחיזוק..."
                  />
                  <button
                    onClick={addWeakTopic}
                    disabled={!newWeakTopic.trim()}
                    className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {formData.weakTopics.length > 0 && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.addWeakTopicsToStudyPlan}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        addWeakTopicsToStudyPlan: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <span className="text-gray-600">
                      הוסף נושאים אלה לתוכנית הלימודים אוטומטית
                    </span>
                  </label>
                )}
              </div>

              {/* Teacher Comments */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        הערות המורה
                      </label>
                      <textarea
                        value={formData.teacherComments}
                        onChange={(e) => setFormData(prev => ({ ...prev, teacherComments: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        rows={3}
                        placeholder="הערות או משוב מהמורה..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => { setStep('upload'); setError(null); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  חזרה
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      שמור הערכה
                    </>
                  )}
                </button>
              </div>

              {/* Raw OCR Modal */}
              <RawOcrModal
                isOpen={showRawOcrModal}
                onClose={() => setShowRawOcrModal(false)}
                rawText={analysisResult.rawText}
                confidence={analysisResult.confidence}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadEvaluationModal;
