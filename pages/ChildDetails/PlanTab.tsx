/**
 * Plan Tab - Test planning and management
 *
 * Allows parents to create, edit, and delete upcoming tests and dictations.
 * Includes AI-assisted topic extraction from images/text.
 */

import React, { useState, useRef } from 'react';
import { Button } from '../../components/Button';
import { extractTopicsFromInput } from '../../services/geminiService';
import { TestType, DictationMode, UpcomingTest } from '../../types';
import {
  Trash2, CheckCircle, X, Sparkles, Wand2,
  Image as ImageIcon, Mic, Plus
} from 'lucide-react';
import { PlanTabProps } from './types';
import { RecommendationsPanel } from './RecommendationsPanel';

export const PlanTab: React.FC<PlanTabProps> = ({
  child,
  subjects,
  upcomingTests,
  addUpcomingTest,
  updateUpcomingTest,
  removeUpcomingTest
}) => {
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  // Subject selector for recommendations
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Common Form Fields
  const [testType, setTestType] = useState<TestType>('quiz');
  const [newTestSubject, setNewTestSubject] = useState('');
  const [newTestDate, setNewTestDate] = useState('');

  // Quiz Fields
  const [newTestTopics, setNewTestTopics] = useState('');
  const [newTestNumQuestions, setNewTestNumQuestions] = useState(5);
  const [teacherMessage, setTeacherMessage] = useState('');

  // Dictation Fields
  const [dictationName, setDictationName] = useState('');
  const [dictationWords, setDictationWords] = useState('');
  const [dictationMode, setDictationMode] = useState<DictationMode>('recognition');

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter tests for this child
  const childTests = upcomingTests
    .filter(t => t.childId === child.id)
    .sort((a, b) => a.date - b.date);

  // --- Handlers ---
  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestSubject || !newTestDate) return;

    let topicsArray: string[] = [];
    let wordsArray: string[] | undefined = undefined;

    if (testType === 'quiz') {
      if (!newTestTopics) return;
      topicsArray = newTestTopics.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } else {
      if (!dictationName || !dictationWords) return;
      topicsArray = [dictationName];
      wordsArray = dictationWords.split(',').map(w => w.trim()).filter(w => w.length > 0);
    }

    const testData: Partial<UpcomingTest> = {
      subjectId: newTestSubject,
      date: new Date(newTestDate).getTime(),
      topics: topicsArray,
      numQuestions: testType === 'quiz' ? (Number(newTestNumQuestions) || 5) : wordsArray?.length,
      type: testType,
      dictationWords: wordsArray,
      dictationMode: testType === 'dictation' ? dictationMode : undefined
    };

    if (editingTestId) {
      await updateUpcomingTest(editingTestId, testData);
    } else {
      await addUpcomingTest({
        id: Date.now().toString(),
        childId: child.id,
        subjectId: newTestSubject,
        date: new Date(newTestDate).getTime(),
        topics: topicsArray,
        numQuestions: testType === 'quiz' ? (Number(newTestNumQuestions) || 5) : wordsArray?.length || 0,
        type: testType,
        dictationWords: wordsArray,
        dictationMode: testType === 'dictation' ? dictationMode : undefined
      });
    }

    resetForm();
  };

  const handleEditTest = (test: UpcomingTest) => {
    setEditingTestId(test.id);
    setNewTestSubject(test.subjectId);
    setNewTestDate(new Date(test.date).toISOString().split('T')[0]);

    const type = test.type || 'quiz';
    setTestType(type);

    if (type === 'quiz') {
      setNewTestTopics(test.topics.join(', '));
      setNewTestNumQuestions(test.numQuestions || 5);
    } else {
      setDictationName(test.topics[0] || '');
      setDictationWords(test.dictationWords?.join(', ') || '');
      setDictationMode(test.dictationMode || 'recognition');
    }

    setTeacherMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingTestId(null);
    setNewTestSubject('');
    setNewTestDate('');
    setNewTestTopics('');
    setNewTestNumQuestions(5);
    setTeacherMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    setTestType('quiz');
    setDictationName('');
    setDictationWords('');
    setDictationMode('recognition');
  };

  const handleOpenForm = (type: TestType, preSelectedSubject?: string) => {
    if (isFormOpen && testType === type && !editingTestId) {
      resetForm();
      return;
    }

    resetForm();
    setTestType(type);
    if (preSelectedSubject) {
      setNewTestSubject(preSelectedSubject);
    }
    setIsFormOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyzeContent = async () => {
    if (!teacherMessage.trim() && !selectedImage) return;

    setIsAnalyzing(true);
    try {
      let imageBase64: string | undefined = undefined;
      let mimeType: string | undefined = undefined;

      if (selectedImage) {
        imageBase64 = await fileToBase64(selectedImage);
        mimeType = selectedImage.type;
      }

      const topics = await extractTopicsFromInput(teacherMessage, imageBase64, mimeType);

      if (topics.length > 0) {
        if (testType === 'quiz') {
          setNewTestTopics(topics.join(', '));
        } else {
          setDictationWords(topics.join(', '));
        }
      } else {
        alert('לא הצלחנו לזהות נושאים. אנא נסו שוב או כתבו אותם ידנית.');
      }
    } catch (e) {
      console.error(e);
      alert('אירעה שגיאה בניתוח התוכן');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get selected subject object
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* AI Recommendations Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <h3 className="font-bold text-gray-900 text-lg mb-4">המלצות AI מותאמות אישית</h3>
        <p className="text-gray-600 text-sm mb-4">
          בחר/י מקצוע כדי לקבל המלצות לימוד מבוססות על ביצועי הילד/ה, מבחנים מתוכננים ויעדים אישיים
        </p>

        {/* Subject Selector */}
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          <option value="">בחר/י מקצוע...</option>
          {child.subjects.map(subId => {
            const sub = subjects.find(s => s.id === subId);
            if (!sub) return null;
            return (
              <option key={subId} value={subId}>
                {sub.icon} {sub.name}
              </option>
            );
          })}
        </select>

        {/* Show RecommendationsPanel when subject selected */}
        {selectedSubject && (
          <div className="mt-6">
            <RecommendationsPanel child={child} subject={selectedSubject} />
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* Active Subjects List */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4">מקצועות פעילים</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {child.subjects.map(subId => {
            const sub = subjects.find(s => s.id === subId);
            if (!sub) return null;
            const nextTest = childTests.find(t => t.subjectId === subId);
            return (
              <div key={subId} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${sub.color} text-white`}>{sub.icon}</div>
                  <span className="font-bold text-gray-800">{sub.name}</span>
                </div>
                {nextTest ? (
                  <div className="text-sm text-indigo-600 bg-indigo-50 p-2 rounded-lg mb-3">
                    מבחן ב-{new Date(nextTest.date).toLocaleDateString('he-IL')}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded-lg mb-3">
                    אין מבחן קרוב (תרגול שוטף)
                  </div>
                )}
                <Button size="sm" variant="secondary" onClick={() => handleOpenForm('quiz', subId)}>
                  + הוסף מבחן
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => handleOpenForm('quiz')}
          className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 font-bold"
        >
          <Plus size={24} /> הוסף מבחן רגיל
        </button>
        <button
          onClick={() => handleOpenForm('dictation')}
          className="p-4 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-3 font-bold"
        >
          <Mic size={24} /> הוסף הכתבה
        </button>
      </div>

      {/* Test Form */}
      {isFormOpen && (
        <TestForm
          testType={testType}
          editingTestId={editingTestId}
          subjects={subjects}
          newTestSubject={newTestSubject}
          setNewTestSubject={setNewTestSubject}
          newTestDate={newTestDate}
          setNewTestDate={setNewTestDate}
          newTestTopics={newTestTopics}
          setNewTestTopics={setNewTestTopics}
          newTestNumQuestions={newTestNumQuestions}
          setNewTestNumQuestions={setNewTestNumQuestions}
          teacherMessage={teacherMessage}
          setTeacherMessage={setTeacherMessage}
          dictationName={dictationName}
          setDictationName={setDictationName}
          dictationWords={dictationWords}
          setDictationWords={setDictationWords}
          dictationMode={dictationMode}
          setDictationMode={setDictationMode}
          selectedImage={selectedImage}
          imagePreview={imagePreview}
          isAnalyzing={isAnalyzing}
          fileInputRef={fileInputRef}
          onSubmit={handleSaveTest}
          onCancel={resetForm}
          onImageSelect={handleImageSelect}
          onClearImage={clearImage}
          onAnalyzeContent={handleAnalyzeContent}
        />
      )}

      {/* Tests List */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 text-lg">מבחנים והכתבות קרובים</h3>
        {childTests.length > 0 ? (
          childTests.map(test => (
            <TestCard
              key={test.id}
              test={test}
              subject={subjects.find(s => s.id === test.subjectId)}
              onEdit={() => handleEditTest(test)}
              onDelete={() => {
                if (confirm('למחוק את המבחן?')) removeUpcomingTest(test.id);
              }}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500">אין מבחנים מוגדרים כרגע.</p>
            <p className="text-sm text-gray-400 mt-1">הוסיפו מבחן כדי להתחיל תוכנית אימונים אישית.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-components ---

interface TestFormProps {
  testType: TestType;
  editingTestId: string | null;
  subjects: PlanTabProps['subjects'];
  newTestSubject: string;
  setNewTestSubject: (value: string) => void;
  newTestDate: string;
  setNewTestDate: (value: string) => void;
  newTestTopics: string;
  setNewTestTopics: (value: string) => void;
  newTestNumQuestions: number;
  setNewTestNumQuestions: (value: number) => void;
  teacherMessage: string;
  setTeacherMessage: (value: string) => void;
  dictationName: string;
  setDictationName: (value: string) => void;
  dictationWords: string;
  setDictationWords: (value: string) => void;
  dictationMode: DictationMode;
  setDictationMode: (value: DictationMode) => void;
  selectedImage: File | null;
  imagePreview: string | null;
  isAnalyzing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onAnalyzeContent: () => void;
}

const TestForm: React.FC<TestFormProps> = ({
  testType,
  editingTestId,
  subjects,
  newTestSubject,
  setNewTestSubject,
  newTestDate,
  setNewTestDate,
  newTestTopics,
  setNewTestTopics,
  newTestNumQuestions,
  setNewTestNumQuestions,
  teacherMessage,
  setTeacherMessage,
  dictationName,
  setDictationName,
  dictationWords,
  setDictationWords,
  dictationMode,
  setDictationMode,
  selectedImage,
  imagePreview,
  isAnalyzing,
  fileInputRef,
  onSubmit,
  onCancel,
  onImageSelect,
  onClearImage,
  onAnalyzeContent
}) => (
  <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-indigo-100 animate-fade-in">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
        {editingTestId ? 'עריכת מבחן' : (testType === 'quiz' ? 'הוספת מבחן חדש' : 'הוספת הכתבה')}
      </h3>
      <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X /></button>
    </div>

    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מקצוע</label>
          <select
            value={newTestSubject}
            onChange={e => setNewTestSubject(e.target.value)}
            className="w-full rounded-lg border-gray-300 p-2.5 bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">בחר מקצוע...</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תאריך המבחן</label>
          <input
            type="date"
            value={newTestDate}
            onChange={e => setNewTestDate(e.target.value)}
            className="w-full rounded-lg border-gray-300 p-2.5 bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
      </div>

      {testType === 'quiz' ? (
        <QuizFormFields
          newTestTopics={newTestTopics}
          setNewTestTopics={setNewTestTopics}
          newTestNumQuestions={newTestNumQuestions}
          setNewTestNumQuestions={setNewTestNumQuestions}
          teacherMessage={teacherMessage}
          setTeacherMessage={setTeacherMessage}
          selectedImage={selectedImage}
          imagePreview={imagePreview}
          isAnalyzing={isAnalyzing}
          fileInputRef={fileInputRef}
          onImageSelect={onImageSelect}
          onClearImage={onClearImage}
          onAnalyzeContent={onAnalyzeContent}
        />
      ) : (
        <DictationFormFields
          dictationName={dictationName}
          setDictationName={setDictationName}
          dictationWords={dictationWords}
          setDictationWords={setDictationWords}
          dictationMode={dictationMode}
          setDictationMode={setDictationMode}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>ביטול</Button>
        <Button type="submit">שמור מבחן</Button>
      </div>
    </form>
  </div>
);

interface QuizFormFieldsProps {
  newTestTopics: string;
  setNewTestTopics: (value: string) => void;
  newTestNumQuestions: number;
  setNewTestNumQuestions: (value: number) => void;
  teacherMessage: string;
  setTeacherMessage: (value: string) => void;
  selectedImage: File | null;
  imagePreview: string | null;
  isAnalyzing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onAnalyzeContent: () => void;
}

const QuizFormFields: React.FC<QuizFormFieldsProps> = ({
  newTestTopics,
  setNewTestTopics,
  newTestNumQuestions,
  setNewTestNumQuestions,
  teacherMessage,
  setTeacherMessage,
  selectedImage,
  imagePreview,
  isAnalyzing,
  fileInputRef,
  onImageSelect,
  onClearImage,
  onAnalyzeContent
}) => (
  <div className="space-y-4 border-t border-gray-100 pt-4">
    {/* AI Analysis Section */}
    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
      <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
        <Wand2 size={18} /> עזרה מהבינה המלאכותית
      </h4>
      <p className="text-sm text-indigo-700 mb-4">
        העלו צילום של חומר למבחן או הודעה מהמורה, ואנחנו נחלץ את הנושאים אוטומטית.
      </p>

      <div className="space-y-3">
        <textarea
          className="w-full rounded-lg border-gray-300 p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px]"
          placeholder="הדביקו כאן הודעה מהוואטסאפ של הכיתה..."
          value={teacherMessage}
          onChange={e => setTeacherMessage(e.target.value)}
        />

        <div className="flex gap-2 items-center">
          <input
            type="file"
            accept="image/*"
            onChange={onImageSelect}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
          >
            <ImageIcon size={18} /> {selectedImage ? 'החלף תמונה' : 'העלה תמונה'}
          </button>
          {selectedImage && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle size={14} /> נבחרה תמונה
              <button type="button" onClick={onClearImage} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
            </span>
          )}

          <div className="flex-1"></div>

          <Button
            type="button"
            onClick={onAnalyzeContent}
            disabled={isAnalyzing || (!teacherMessage && !selectedImage)}
            isLoading={isAnalyzing}
            size="sm"
          >
            <Sparkles size={16} className="ml-1" /> נתח תוכן
          </Button>
        </div>

        {imagePreview && (
          <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-gray-200 relative group">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">נושאים למבחן (מופרדים בפסיקים)</label>
      <input
        type="text"
        value={newTestTopics}
        onChange={e => setNewTestTopics(e.target.value)}
        className="w-full rounded-lg border-gray-300 p-2.5 bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        placeholder="לדוגמה: שברים, כפל במאונך, בעיות מילוליות"
        required
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">מספר שאלות בתרגול היומי</label>
      <select
        value={newTestNumQuestions}
        onChange={e => setNewTestNumQuestions(Number(e.target.value))}
        className="w-full rounded-lg border-gray-300 p-2.5 bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value={5}>5 שאלות (קצר)</option>
        <option value={10}>10 שאלות (רגיל)</option>
        <option value={15}>15 שאלות (ארוך)</option>
      </select>
    </div>
  </div>
);

interface DictationFormFieldsProps {
  dictationName: string;
  setDictationName: (value: string) => void;
  dictationWords: string;
  setDictationWords: (value: string) => void;
  dictationMode: DictationMode;
  setDictationMode: (value: DictationMode) => void;
}

const DictationFormFields: React.FC<DictationFormFieldsProps> = ({
  dictationName,
  setDictationName,
  dictationWords,
  setDictationWords,
  dictationMode,
  setDictationMode
}) => (
  <div className="space-y-4 border-t border-gray-100 pt-4">
    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
      <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
        <Mic size={18} /> בונה ההכתבות
      </h4>
      <p className="text-sm text-purple-700 mb-4">
        הזינו את רשימת המילים, ואנחנו ניצור מבחן הכתבה שבו הילד שומע את המילה וצריך לזהות או לכתוב אותה.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-purple-900 mb-1">שם ההכתבה</label>
          <input
            type="text"
            value={dictationName}
            onChange={e => setDictationName(e.target.value)}
            className="w-full rounded-lg border-purple-200 p-2.5 bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500"
            placeholder='לדוגמה: מילים עם צליל "אה"'
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-900 mb-1">רשימת מילים (מופרדות בפסיקים)</label>
          <textarea
            className="w-full rounded-lg border-purple-200 p-3 text-sm focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
            placeholder="חתול, כלב, שולחן, כיסא..."
            value={dictationWords}
            onChange={e => setDictationWords(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-900 mb-1">סוג מבחן</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dmode"
                value="recognition"
                checked={dictationMode === 'recognition'}
                onChange={() => setDictationMode('recognition')}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm">זיהוי (שמיעה ובחירה)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dmode"
                value="spelling"
                checked={dictationMode === 'spelling'}
                onChange={() => setDictationMode('spelling')}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm">השלמת אותיות</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface TestCardProps {
  test: UpcomingTest;
  subject: PlanTabProps['subjects'][number] | undefined;
  onEdit: () => void;
  onDelete: () => void;
}

const TestCard: React.FC<TestCardProps> = ({ test, subject, onEdit, onDelete }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-300 transition-colors">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full ${subject?.color || 'bg-gray-400'} flex items-center justify-center text-2xl text-white shadow-sm`}>
        {test.type === 'dictation' ? '🎤' : (subject?.icon || '📅')}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-gray-900 text-lg">
            {test.type === 'dictation' ? 'הכתבה' : (subject?.name || 'מבחן')}
          </h4>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
            {new Date(test.date).toLocaleDateString('he-IL')}
          </span>
        </div>
        <p className="text-gray-600 text-sm mt-1">
          {test.type === 'dictation'
            ? `מילים: ${test.dictationWords?.slice(0, 3).join(', ')}...`
            : `נושאים: ${test.topics.join(', ')}`
          }
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <button
        onClick={onEdit}
        className="flex-1 sm:flex-none py-2 px-4 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition-colors"
      >
        ערוך
      </button>
      <button
        onClick={onDelete}
        className="py-2 px-3 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  </div>
);

export default PlanTab;
