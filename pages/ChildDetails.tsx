
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/Button';
import { extractTopicsFromInput } from '../services/geminiService';
import { DifficultyLevel, GameSettings, TestType, DictationMode } from '../types';
import { VOWELS } from '../games/hebrewData';
import { DEFAULT_GAME_SETTINGS } from '../constants';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Trophy, TrendingUp, AlertCircle, Calendar,
  BookOpen, Trash2, CheckCircle, Pencil, Percent, Settings, RotateCcw, ChevronDown, ChevronUp, XCircle, Sparkles, Wand2, Gauge, Image as ImageIcon, Upload, X, Gamepad2, Save, Mic, Plus, Filter
} from 'lucide-react';

export const ChildDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { children, sessions, subjects, upcomingTests, addUpcomingTest, updateUpcomingTest, removeUpcomingTest, resetChildStats, updateChild } = useStore();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'analysis' | 'plan' | 'games' | 'history' | 'settings'>('analysis');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  
  // NEW: Analysis Filter
  const [analysisFilter, setAnalysisFilter] = useState<string>('all'); // 'all' or subjectId

  // Test Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  
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

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Game Settings State
  const [localGameSettings, setLocalGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  
  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const child = children.find(c => c.id === id);
  
  useEffect(() => {
    if (child && child.gameSettings) {
      setLocalGameSettings(child.gameSettings);
    } else if (child) {
      setLocalGameSettings(DEFAULT_GAME_SETTINGS);
    }
  }, [child]);

  if (!child) return <div className="p-8">Child not found</div>;

  const childSessions = sessions
    .filter(s => s.childId === id)
    .sort((a, b) => b.date - a.date); // Newest first

  const childTests = (upcomingTests || [])
    .filter(t => t.childId === id)
    .sort((a, b) => a.date - b.date);

  // --- ANALYSIS LOGIC ---
  const analysisData = useMemo(() => {
    // Filter sessions based on selected subject
    const filteredSessions = analysisFilter === 'all' 
      ? childSessions 
      : childSessions.filter(s => s.subjectId === analysisFilter);

    // 1. Progress over time
    // Take last 20 sessions for chart clarity, reverse for chronological order in chart
    const sessionsForChart = [...filteredSessions].slice(0, 20).reverse();
    
    const progressData = sessionsForChart.map(s => ({
      date: new Date(s.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
      score: Math.round((s.score / s.totalQuestions) * 100),
      topic: s.topic,
      subjectName: subjects.find(sub => sub.id === s.subjectId)?.name
    }));

    // 2. Aggregate stats
    const topicStats: Record<string, { correct: number; total: number; subjectName: string, rawTopic: string }> = {};
    let totalCorrect = 0;
    let totalQuestions = 0;
    
    filteredSessions.forEach(s => {
        const key = `${s.topic}::${s.subjectId}`;
        if (!topicStats[key]) {
            topicStats[key] = { 
                correct: 0, 
                total: 0, 
                subjectName: subjects.find(sub => sub.id === s.subjectId)?.name || '', 
                rawTopic: s.topic 
            };
        }
        topicStats[key].correct += s.score;
        topicStats[key].total += s.totalQuestions;
        totalCorrect += s.score;
        totalQuestions += s.totalQuestions;
    });

    const topicPerformance = Object.values(topicStats).map((stats) => ({
        topicOnly: stats.rawTopic,
        subject: stats.subjectName,
        percentage: Math.round((stats.correct / stats.total) * 100),
        count: stats.total
    }));

    const overallAverage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const strongTopics = [...topicPerformance].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
    const weakTopics = [...topicPerformance].filter(t => t.percentage < 80).sort((a, b) => a.percentage - b.percentage).slice(0, 3);
    const allTopics = [...topicPerformance].sort((a, b) => b.percentage - a.percentage);

    return { progressData, strongTopics, weakTopics, overallAverage, allTopics };
  }, [childSessions, subjects, analysisFilter]);


  // --- HANDLERS ---
  const handleSaveTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestSubject || !newTestDate) return;

    let topicsArray: string[] = [];
    let wordsArray: string[] | undefined = undefined;

    if (testType === 'quiz') {
       if(!newTestTopics) return;
       topicsArray = newTestTopics.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } else {
       if(!dictationName || !dictationWords) return;
       topicsArray = [dictationName];
       wordsArray = dictationWords.split(',').map(w => w.trim()).filter(w => w.length > 0);
    }

    const testData = {
        subjectId: newTestSubject,
        date: new Date(newTestDate).getTime(),
        topics: topicsArray,
        numQuestions: testType === 'quiz' ? (Number(newTestNumQuestions) || 5) : wordsArray?.length,
        type: testType,
        dictationWords: wordsArray,
        dictationMode: testType === 'dictation' ? dictationMode : undefined
    };

    if (editingTestId) {
      updateUpcomingTest(editingTestId, testData);
    } else {
      addUpcomingTest({
        id: Date.now().toString(),
        childId: child.id,
        ...testData
      });
    }

    resetForm();
  };

  const handleEditTest = (test: any) => {
    setEditingTestId(test.id);
    setNewTestSubject(test.subjectId);
    setNewTestDate(new Date(test.date).toISOString().split('T')[0]);
    
    // Determine Type
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
    
    // Quiz Reset
    setNewTestTopics('');
    setNewTestNumQuestions(5);
    setTeacherMessage('');
    setSelectedImage(null);
    setImagePreview(null);

    // Dictation Reset
    setTestType('quiz');
    setDictationName('');
    setDictationWords('');
    setDictationMode('recognition');
  };
  
  const handleOpenForm = (type: TestType) => {
    if (isFormOpen && testType === type && !editingTestId) {
        resetForm();
        return;
    }
    
    // Manual reset fields
    setEditingTestId(null);
    setNewTestSubject('');
    setNewTestDate('');
    setNewTestTopics('');
    setNewTestNumQuestions(5);
    setTeacherMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    setDictationName('');
    setDictationWords('');
    setDictationMode('recognition');

    setTestType(type);
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

  const handleResetStats = () => {
    if (window.confirm('האם אתה בטוח שברצונך לאפס את הכוכבים והרצף של הילד? פעולה זו לא ניתנת לביטול.')) {
      resetChildStats(child.id);
    }
  };
  
  const handleProficiencyChange = (subjectId: string, level: DifficultyLevel) => {
    const currentProficiency = child.proficiency || {};
    updateChild(child.id, {
      proficiency: {
        ...currentProficiency,
        [subjectId]: level
      }
    });
  };

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };
  
  const handleSaveGameSettings = () => {
    updateChild(child.id, { gameSettings: localGameSettings });
    alert('הגדרות המשחק נשמרו בהצלחה!');
  };

  const toggleVowel = (vowelName: string) => {
    const current = localGameSettings.allowedVowels || [];
    if (current.includes(vowelName)) {
      if (current.length === 1) return; // Prevent disabling all
      setLocalGameSettings({ ...localGameSettings, allowedVowels: current.filter(v => v !== vowelName) });
    } else {
      setLocalGameSettings({ ...localGameSettings, allowedVowels: [...current, vowelName] });
    }
  };

  const toggleCategory = (category: string) => {
    const current = localGameSettings.allowedCategories || [];
    if (current.includes(category)) {
      if (current.length === 1) return; // Prevent disabling all
      setLocalGameSettings({ ...localGameSettings, allowedCategories: current.filter(c => c !== category) });
    } else {
      setLocalGameSettings({ ...localGameSettings, allowedCategories: [...current, category] });
    }
  };

  const CATEGORIES = [
    { id: 'animals', label: 'בעלי חיים 🦁' },
    { id: 'food', label: 'אוכל 🍔' },
    { id: 'objects', label: 'חפצים 🎒' },
    { id: 'transport', label: 'כלי תחבורה 🚗' },
    { id: 'nature', label: 'טבע 🌳' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="text-6xl bg-indigo-50 p-4 rounded-full">{child.avatar}</div>
        <div className="text-center md:text-right flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{child.name}</h1>
          <p className="text-gray-500">{child.grade}</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-yellow-50 px-6 py-3 rounded-xl border border-yellow-100 text-center">
            <div className="text-sm text-gray-500">כוכבים</div>
            <div className="text-2xl font-bold text-yellow-600 flex items-center gap-1 justify-center">
              <Trophy size={20} /> {child.stars}
            </div>
          </div>
          <div className="bg-orange-50 px-6 py-3 rounded-xl border border-orange-100 text-center">
            <div className="text-sm text-gray-500">רצף ימים</div>
            <div className="text-2xl font-bold text-orange-600 flex items-center gap-1 justify-center">
              <Sparkles size={20} /> {child.streak}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'analysis' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <TrendingUp size={18} /> ניתוח ביצועים
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'plan' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Calendar size={18} /> תוכנית לימודים
        </button>
        
        {/* Only show Games tab if the child has gameSettings enabled (e.g. Uri) */}
        {child.gameSettings && (
          <button
            onClick={() => setActiveTab('games')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'games' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Gamepad2 size={18} /> הגדרות משחק
          </button>
        )}

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <RotateCcw size={18} /> היסטוריה
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Settings size={18} /> הגדרות
        </button>
      </div>

      {/* ANALYSIS TAB */}
      {activeTab === 'analysis' && (
        <div className="space-y-6 animate-fade-in">
          {/* Subject Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button 
              onClick={() => setAnalysisFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border shadow-sm ${analysisFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              הכל
            </button>
            {subjects.map(sub => (
              <button
                key={sub.id}
                onClick={() => setAnalysisFilter(sub.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border shadow-sm flex items-center gap-2 ${analysisFilter === sub.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <span>{sub.icon}</span>
                {sub.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                 <TrendingUp size={20} className="text-indigo-600" /> מגמת שיפור
                 {analysisFilter !== 'all' && <span className="text-sm font-normal text-gray-500">({subjects.find(s=>s.id === analysisFilter)?.name})</span>}
              </h3>
              <div className="h-64">
                {analysisData.progressData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisData.progressData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={false} />
                        <YAxis tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} orientation="right" />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', direction: 'rtl' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#6366f1" 
                            strokeWidth={3}
                            dot={{ fill: '#6366f1', strokeWidth: 2 }} 
                        />
                    </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        אין מספיק נתונים להצגת גרף
                    </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Strengths */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                 <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                    <Trophy size={20} /> נקודות חוזקה
                 </h3>
                 {analysisData.strongTopics.length > 0 ? (
                    <div className="space-y-3">
                        {analysisData.strongTopics.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <div>
                                    <div className="font-bold text-gray-800">{item.topicOnly}</div>
                                    <div className="text-xs text-green-600">{item.subject}</div>
                                </div>
                                <div className="text-green-700 font-bold">{item.percentage}%</div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-gray-500">עדיין אין מספיק נתונים לזיהוי חוזקות.</p>
                 )}
              </div>

              {/* Weaknesses */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                 <h3 className="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2">
                    <AlertCircle size={20} /> נושאים לחיזוק
                 </h3>
                 {analysisData.weakTopics.length > 0 ? (
                    <div className="space-y-3">
                        {analysisData.weakTopics.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                                <div>
                                    <div className="font-bold text-gray-800">{item.topicOnly}</div>
                                    <div className="text-xs text-orange-600">{item.subject}</div>
                                </div>
                                <div className="text-orange-700 font-bold">{item.percentage}%</div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-gray-500">
                        {analysisData.progressData.length > 0 ? "מצוין! אין נושאים חלשים כרגע." : "עדיין אין מספיק נתונים."}
                    </p>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAN TAB */}
      {activeTab === 'plan' && (
        <div className="space-y-6 animate-fade-in">
           {/* Active Subjects List - VISIBLE EVEN WITHOUT TESTS */}
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
                            <Button size="sm" variant="secondary" onClick={() => { handleOpenForm('quiz'); setNewTestSubject(subId); }}>
                                + הוסף מבחן
                            </Button>
                        </div>
                    )
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

           {/* ADD/EDIT FORM */}
           {isFormOpen && (
               <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-indigo-100 animate-fade-in">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                           {editingTestId ? 'עריכת מבחן' : (testType === 'quiz' ? 'הוספת מבחן חדש' : 'הוספת הכתבה')}
                       </h3>
                       <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X /></button>
                   </div>
                   
                   <form onSubmit={handleSaveTest} className="space-y-6">
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
                            <>
                                {/* QUIZ SPECIFIC INPUTS */}
                                <div className="space-y-4 border-t border-gray-100 pt-4">
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
                                                    onChange={handleImageSelect}
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
                                                        <button type="button" onClick={clearImage} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                                                    </span>
                                                )}
                                                
                                                <div className="flex-1"></div>
                                                
                                                <Button 
                                                    type="button" 
                                                    onClick={handleAnalyzeContent} 
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
                            </>
                        ) : (
                            <>
                                {/* DICTATION SPECIFIC INPUTS */}
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
                            </>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={resetForm}>ביטול</Button>
                            <Button type="submit">שמור מבחן</Button>
                        </div>
                   </form>
               </div>
           )}

           {/* TESTS LIST */}
           <div className="space-y-4">
               <h3 className="font-bold text-gray-900 text-lg">מבחנים והכתבות קרובים</h3>
               {childTests.length > 0 ? (
                   childTests.map(test => {
                       const subject = subjects.find(s => s.id === test.subjectId);
                       return (
                           <div key={test.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-300 transition-colors">
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
                                      onClick={() => handleEditTest(test)}
                                      className="flex-1 sm:flex-none py-2 px-4 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition-colors"
                                   >
                                       ערוך
                                   </button>
                                   <button 
                                      onClick={() => {
                                          if(confirm('למחוק את המבחן?')) removeUpcomingTest(test.id);
                                      }}
                                      className="py-2 px-3 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                   >
                                       <Trash2 size={18} />
                                   </button>
                               </div>
                           </div>
                       );
                   })
               ) : (
                   <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                       <p className="text-gray-500">אין מבחנים מוגדרים כרגע.</p>
                       <p className="text-sm text-gray-400 mt-1">הוסיפו מבחן כדי להתחיל תוכנית אימונים אישית.</p>
                   </div>
               )}
           </div>
        </div>
      )}

      {/* GAMES TAB */}
      {activeTab === 'games' && child.gameSettings && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                 <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                     <Gamepad2 size={24} />
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-gray-900">הגדרות משחק - ממלכת המילים</h3>
                     <p className="text-gray-500 text-sm">התאימו את המשחקים לרמה של {child.name}</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Vowels Selection */}
                  <div>
                      <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">ניקוד פעיל</h4>
                      <div className="grid grid-cols-2 gap-2">
                          {VOWELS.map(v => (
                              <label key={v.name} className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                  <input 
                                      type="checkbox" 
                                      checked={localGameSettings.allowedVowels?.includes(v.name)}
                                      onChange={() => toggleVowel(v.name)}
                                      className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                                  />
                                  <span className="text-2xl w-8 text-center bg-gray-100 rounded">{v.char}</span>
                                  <span className="text-sm font-medium text-gray-700">
                                      {v.name === 'kamatz' && 'קמץ'}
                                      {v.name === 'patach' && 'פתח'}
                                      {v.name === 'tzeire' && 'צירה'}
                                      {v.name === 'segol' && 'סגול'}
                                      {v.name === 'hiriq' && 'חיריק'}
                                      {v.name === 'holam' && 'חולם'}
                                      {v.name === 'qubuts' && 'קובוץ'}
                                      {v.name === 'shva' && 'שווא'}
                                  </span>
                              </label>
                          ))}
                      </div>
                  </div>

                  {/* Categories & Settings */}
                  <div className="space-y-6">
                      <div>
                          <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">קטגוריות מילים</h4>
                          <div className="flex flex-wrap gap-2">
                              {CATEGORIES.map(cat => (
                                  <button
                                      key={cat.id}
                                      onClick={() => toggleCategory(cat.id)}
                                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                          localGameSettings.allowedCategories?.includes(cat.id)
                                          ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm'
                                          : 'bg-white text-gray-500 border-gray-200 opacity-60'
                                      }`}
                                  >
                                      {cat.label}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">כללי</h4>
                          <div className="space-y-3">
                              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <span className="text-sm text-gray-700">רמז באות חסרה (אימוג'י)</span>
                                  <input 
                                    type="checkbox" 
                                    checked={localGameSettings.showMissingLetterHint} 
                                    onChange={e => setLocalGameSettings({...localGameSettings, showMissingLetterHint: e.target.checked})}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                                  />
                              </label>
                              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <span className="text-sm text-gray-700">הקראת מילים (צליל סוגר)</span>
                                  <input 
                                    type="checkbox" 
                                    checked={localGameSettings.enableTTS} 
                                    onChange={e => setLocalGameSettings({...localGameSettings, enableTTS: e.target.checked})}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                                  />
                              </label>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm text-gray-700">אתגר מהירות (שניות)</span>
                                      <span className="font-bold text-indigo-600">{localGameSettings.speedChallengeSeconds}</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="2" max="10" 
                                    value={localGameSettings.speedChallengeSeconds}
                                    onChange={e => setLocalGameSettings({...localGameSettings, speedChallengeSeconds: Number(e.target.value)})}
                                    className="w-full accent-indigo-600"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="mt-8 flex justify-end">
                  <Button onClick={handleSaveGameSettings} size="lg">
                      <Save size={18} className="ml-2" /> שמור שינויים
                  </Button>
              </div>
           </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-fade-in">
           {childSessions.length > 0 ? (
             childSessions.map(session => (
               <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSessionExpand(session.id)}
                 >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${subjects.find(s => s.id === session.subjectId)?.color || 'bg-gray-400'} text-white`}>
                         {subjects.find(s => s.id === session.subjectId)?.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{session.topic}</h4>
                        <div className="text-sm text-gray-500 flex gap-2">
                           <span>{new Date(session.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                           {session.isFinalReview && <span className="text-purple-600 font-bold">• חזרה למבחן</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                           (session.score / session.totalQuestions) > 0.8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                       }`}>
                           {session.score}/{session.totalQuestions}
                       </div>
                       {expandedSessionId === session.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </div>
                 </div>
                 
                 {expandedSessionId === session.id && (
                    <div className="bg-gray-50 p-4 border-t border-gray-100 space-y-3 animate-fade-in">
                        {session.questions.map((q, idx) => {
                            const userAnswer = session.userAnswers ? session.userAnswers[idx] : -1;
                            const isCorrect = userAnswer === q.correctAnswerIndex;
                            return (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="flex gap-2 mb-2">
                                        <div className="mt-1">
                                            {isCorrect ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                                        </div>
                                        <div className="font-medium text-gray-900">{q.questionText}</div>
                                    </div>
                                    {!isCorrect && (
                                        <div className="mr-6 text-sm">
                                            <span className="text-red-600 line-through ml-2">{q.options[userAnswer]}</span>
                                            <span className="text-green-600 font-bold">{q.options[q.correctAnswerIndex]}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                 )}
               </div>
             ))
           ) : (
             <div className="text-center py-12 text-gray-500">עדיין אין היסטוריית תרגולים.</div>
           )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Gauge size={20} /> רמת קושי לפי מקצוע
                </h3>
                <div className="space-y-4">
                    {subjects.map(subject => (
                        <div key={subject.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{subject.icon}</span>
                                <span className="font-medium text-gray-900">{subject.name}</span>
                            </div>
                            <select 
                                value={child.proficiency?.[subject.id] || 'medium'}
                                onChange={(e) => handleProficiencyChange(subject.id, e.target.value as DifficultyLevel)}
                                className="bg-white border-gray-300 rounded-lg text-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="easy">קל - מתחילים</option>
                                <option value="medium">בינוני - רגיל</option>
                                <option value="hard">קשה - מתקדמים</option>
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <h3 className="text-lg font-bold text-red-900 mb-2">אזור מסוכן</h3>
                <p className="text-sm text-red-700 mb-4">פעולות אלו לא ניתנות לביטול.</p>
                <button 
                    onClick={handleResetStats}
                    className="flex items-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors font-medium"
                >
                    <RotateCcw size={16} /> איפוס נקודות ורצף
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
