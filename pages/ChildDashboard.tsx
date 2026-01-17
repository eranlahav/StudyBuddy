
import React, { useState, useCallback } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { ChildProfile, Subject } from '../types';
import { ChevronLeft, Calendar, CheckCircle, Clock, Circle, Gamepad2, BookOpen, Pencil, X, Smile, Trophy, Sparkles, Lightbulb, Zap, ArrowRight, Coffee, Book, LogIn } from 'lucide-react';
import { Button } from '../components/Button';
import { HebrewGame } from '../games/HebrewGame';
import { PINPad } from '../components/PINPad';
import { verifyPin, hasPinSet, isLockedOut } from '../services';
import { getUserMessage } from '../lib';

const AVATAR_OPTIONS = [
  '🦁', '🐯', '🐻', '🐶', '🐱', '🐼', '🐨', '🐸', 
  '🦄', '🐲', '🦖', '🦕', '🐳', '🐬', '🐙', '🦋',
  '👩‍🚀', '👨‍🚀', '🦸‍♂️', '🦸‍♀️', '🧚‍♀️', '🧜‍♀️', '🧙‍♂️', '🥷',
  '🤖', '👽', '👻', '🤡', '🤠', '👑', '🎩', '👓',
  '⚽', '🏀', '🏈', '🎾', '🎸', '🎨', '🚀', '🚗'
];

export const ChildDashboard: React.FC = () => {
  const { children, subjects, upcomingTests, sessions, updateChild, parent } = useStore();
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<'practice' | 'games'>('practice');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [pinError, setPinError] = useState('');

  // Check lockout status when child is selected
  const lockoutStatus = selectedChild ? isLockedOut(selectedChild.id) : { locked: false, secondsRemaining: 0 };

  // Handle PIN verification
  const handlePinSubmit = useCallback(async (pin: string) => {
    if (!selectedChild) return;

    try {
      const isValid = await verifyPin(selectedChild.id, pin, selectedChild.pinHash);
      if (isValid) {
        setIsAuthenticated(true);
        setPinError('');
        // Store in session
        sessionStorage.setItem('authenticated_child', selectedChild.id);
      }
    } catch (error) {
      setPinError(getUserMessage(error));
    }
  }, [selectedChild]);

  // Reset when going back to selection
  const handleBackToSelection = () => {
    setSelectedChild(null);
    setIsAuthenticated(false);
    setPinError('');
    setViewMode('practice');
    sessionStorage.removeItem('authenticated_child');
  };

  // Check if parent is logged in (required for child access)
  if (!parent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-200 max-w-md text-center">
          <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="text-indigo-600 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">נדרשת התחברות הורה</h1>
          <p className="text-slate-500 mb-6">
            כדי להיכנס לאזור הילדים, צריך קודם שההורים יתחברו למערכת.
          </p>
          <Button onClick={() => navigate('/login')} size="lg">
            <LogIn className="ml-2" size={20} />
            כניסת הורים
          </Button>
        </div>
      </div>
    );
  }

  // Phase 1: Select Profile
  if (!selectedChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-8 text-center">מי לומד היום?</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className="bg-white rounded-3xl p-6 shadow-lg border-b-8 border-slate-200 hover:border-indigo-400 hover:-translate-y-2 transition-all duration-300 flex flex-col items-center group"
            >
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">{child.avatar}</div>
              <h2 className="text-2xl font-bold text-slate-700 group-hover:text-indigo-600">{child.name}</h2>
              <div className="mt-2 text-slate-400 font-medium">{child.grade}</div>
              <div className="mt-4 flex items-center gap-1 text-yellow-500 font-bold bg-yellow-50 px-3 py-1 rounded-full">
                <span>⭐</span> {child.stars}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Phase 1.5: PIN Authentication (if child has PIN set)
  if (selectedChild && hasPinSet(selectedChild.pinHash) && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-200 w-full max-w-sm">
          <PINPad
            onSubmit={handlePinSubmit}
            error={pinError}
            isLocked={lockoutStatus.locked}
            lockoutSeconds={lockoutStatus.secondsRemaining}
            childName={selectedChild.name}
          />

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={handleBackToSelection}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowRight size={16} />
              חזרה לבחירת פרופיל
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Dashboard Content
  const childTests = (upcomingTests || [])
    .filter(t => t.childId === selectedChild.id)
    .sort((a, b) => a.date - b.date);
  
  // Collect Global Remediation Tasks
  const globalRemediationTasks: { subject: Subject, topic: string }[] = [];
  const testTopicsBySubject: Record<string, Set<string>> = {};
  
  childTests.forEach(test => {
    if (!testTopicsBySubject[test.subjectId]) {
      testTopicsBySubject[test.subjectId] = new Set();
    }
    test.topics.forEach(topic => {
        testTopicsBySubject[test.subjectId].add(topic);
        // Check for remediation globally
        if (topic.includes('⭐') || topic.includes('חיזוק')) {
            const subject = subjects.find(s => s.id === test.subjectId);
            if (subject) {
                globalRemediationTasks.push({ subject, topic });
            }
        }
    });
  });

  // Show all subjects assigned to the child
  const activeSubjects = subjects.filter(s => selectedChild.subjects.includes(s.id));

  // Helper to determine topic status
  const getTopicStatus = (subjectId: string, topic: string) => {
    const topicSessions = sessions.filter(s => 
      s.childId === selectedChild.id && 
      s.subjectId === subjectId && 
      s.topic === topic
    );

    if (topicSessions.length === 0) return 'new';

    const totalScore = topicSessions.reduce((acc, s) => acc + (s.score / s.totalQuestions), 0);
    const avgPercentage = (totalScore / topicSessions.length) * 100;

    return avgPercentage >= 80 ? 'mastered' : 'needs_work';
  };

  const handleAvatarChange = async (newAvatar: string) => {
    if (selectedChild) {
      await updateChild(selectedChild.id, { avatar: newAvatar });
      setSelectedChild({ ...selectedChild, avatar: newAvatar }); 
      setIsAvatarModalOpen(false);
    }
  };

  const getDaysUntilTest = (timestamp: number) => {
    const now = new Date();
    const testDate = new Date(timestamp);
    now.setHours(0,0,0,0);
    testDate.setHours(0,0,0,0);
    const diffTime = testDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Child Header */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <button
            onClick={handleBackToSelection}
            className="bg-slate-100 p-2 rounded-full shadow-sm text-slate-400 hover:text-indigo-600 transition-colors"
            >
            <svg className="w-6 h-6 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            </button>
            
            <div className="flex items-center gap-3">
                <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
                    <span className="text-5xl md:text-6xl transition-transform group-hover:scale-110 block">{selectedChild.avatar}</span>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border border-slate-200 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil size={14} />
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">היי, {selectedChild.name}!</h1>
                    <p className="text-slate-500 font-medium">כיף שחזרת ללמוד!</p>
                </div>
            </div>
        </div>
        
        <div className="flex-1 w-full md:w-auto flex justify-center md:justify-end gap-3">
             <div className="bg-yellow-100 text-yellow-700 px-5 py-2 rounded-2xl font-bold flex items-center gap-2 shadow-sm border border-yellow-200 text-lg">
                <span>⭐</span> {selectedChild.stars}
             </div>
             <div className="bg-orange-100 text-orange-700 px-5 py-2 rounded-2xl font-bold flex items-center gap-2 shadow-sm border border-orange-200 text-lg">
                <span>🔥</span> {selectedChild.streak}
             </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center mb-6">
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm inline-flex">
            <button
                onClick={() => setViewMode('practice')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-lg ${
                    viewMode === 'practice' 
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
            >
                <BookOpen size={24} />
                תרגול למבחן
            </button>
            {selectedChild.showGames && selectedChild.gameSettings && (
            <button
                onClick={() => setViewMode('games')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-lg ${
                    viewMode === 'games'
                    ? 'bg-purple-100 text-purple-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
            >
                <Gamepad2 size={24} />
                משחקים
            </button>
            )}
        </div>
      </div>

      {/* GLOBAL REMEDIATION BANNER */}
      {viewMode === 'practice' && globalRemediationTasks.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 shadow-lg mb-8 text-white relative overflow-hidden animate-fade-in border-b-8 border-indigo-700">
              <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="bg-white/20 p-2 rounded-full animate-pulse">
                         <Zap size={28} className="text-yellow-300 fill-current" />
                      </div>
                      <h2 className="text-2xl font-bold">יש לנו משימה חשובה!</h2>
                  </div>
                  <p className="text-indigo-100 mb-6 font-medium max-w-lg">
                      זיהינו כמה נושאים שצריך לחזק כדי להצליח בגדול במבחן. בואו נסיים אותם ונקבל בונוס כוכבים!
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {globalRemediationTasks.map((task, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigate(`/session/${selectedChild.id}/${task.subject.id}/${encodeURIComponent(task.topic)}`)}
                            className="bg-white text-indigo-700 p-3 rounded-xl font-bold flex items-center justify-between hover:bg-indigo-50 hover:scale-[1.02] transition-all shadow-md group"
                          >
                              <div className="flex items-center gap-3">
                                  <span className="text-xl">{task.subject.icon}</span>
                                  <span>{task.topic.replace('⭐ חיזוק:', '').replace('⭐', '')}</span>
                              </div>
                              <ArrowRight size={20} className="text-indigo-400 group-hover:text-indigo-700" />
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* PRACTICE VIEW */}
      {viewMode === 'practice' && (
        <>
            {activeSubjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeSubjects.map(subject => {
                    // Extract ONLY topics that are in active tests for this child
                    const testTopicsSet = testTopicsBySubject[subject.id] || new Set();
                    const testTopicsArray = Array.from(testTopicsSet);
                    
                    // Filter: 1. Remediation
                    const remediationTopics = testTopicsArray.filter(t => t.includes('⭐') || t.includes('חיזוק'));
                    // Filter: 2. Regular Test Topics
                    const activeTestTopics = testTopicsArray.filter(t => !t.includes('⭐') && !t.includes('חיזוק'));
                    
                    const hasRemediation = remediationTopics.length > 0;

                    const upcomingTest = childTests.find(t => t.subjectId === subject.id);
                    const daysUntil = upcomingTest ? getDaysUntilTest(upcomingTest.date) : 999;
                    const isLastPractice = daysUntil <= 1; // Tomorrow or Today
                    
                    // Final Review Logic
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const finalReviewSession = sessions.find(s => 
                       s.childId === selectedChild.id &&
                       s.subjectId === subject.id &&
                       s.isFinalReview && 
                       s.date >= today.getTime()
                    );
                    
                    // Only show Final Review CTA if no active remediation AND there is an upcoming test
                    const showFinalReviewUI = isLastPractice && !hasRemediation && upcomingTest;
                    
                    // If no active test topics, show general practice topics from the subject definition
                    const showGeneralPractice = activeTestTopics.length === 0 && !hasRemediation && !showFinalReviewUI;
                    const defaultTopics = subject.topics || [];
                    
                    // Determine Mode for Badge
                    const isTestMode = activeTestTopics.length > 0 || hasRemediation;

                    return (
                    <div key={subject.id} className="bg-white rounded-3xl p-6 shadow-md border-b-4 border-slate-100 hover:border-indigo-200 transition-all flex flex-col h-full relative overflow-hidden">
                        {/* MODE BADGE */}
                        <div className={`absolute top-0 left-0 px-4 py-1.5 rounded-br-2xl font-bold text-xs text-white shadow-sm flex items-center gap-1 ${isTestMode ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                           {isTestMode ? (
                               <>
                                <Calendar size={12} />
                                מתכוננים למבחן
                               </>
                           ) : (
                               <>
                                <BookOpen size={12} />
                                תרגול שוטף
                               </>
                           )}
                        </div>

                        <div className="flex items-center gap-4 mb-6 mt-2">
                        <div className={`w-14 h-14 rounded-2xl ${subject.color} flex items-center justify-center text-3xl text-white shadow-lg transform rotate-3`}>
                            {subject.icon}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-700">{subject.name}</h2>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                            {/* 1. REMEDIATION SECTION inside card (if exists) */}
                            {hasRemediation && (
                                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 text-indigo-800 font-bold mb-3">
                                        <Zap size={20} className="fill-current text-yellow-400" />
                                        <span>חיזוקים דחופים</span>
                                    </div>
                                    <div className="space-y-2">
                                        {remediationTopics.map(topic => (
                                            <button
                                                key={topic}
                                                onClick={() => navigate(`/session/${selectedChild.id}/${subject.id}/${encodeURIComponent(topic)}`)}
                                                className="w-full text-right bg-white p-3 rounded-xl border border-indigo-200 shadow-sm text-indigo-700 font-bold flex justify-between items-center hover:bg-indigo-100 hover:scale-[1.02] transition-all"
                                            >
                                                <span>{topic.replace('⭐ חיזוק:', '').replace('⭐', '')}</span>
                                                <ChevronLeft size={18} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 2. FINAL REVIEW (If applicable and no remediation) */}
                            {showFinalReviewUI ? (
                                <div className="animate-fade-in">
                                    {finalReviewSession ? (
                                        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3 text-green-600">
                                                    <Trophy size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-green-800 mb-1">אתם מוכנים!</h3>
                                            <p className="text-green-700 font-medium text-sm">ציון מוכנות: {finalReviewSession.readinessScore}%</p>
                                        </div>
                                    ) : (
                                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6 text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-md z-10">
                                                מחר!
                                            </div>
                                            <h3 className="text-lg font-bold text-indigo-900 mb-2">חזרה גנרלית 🎓</h3>
                                            <Button 
                                                onClick={() => navigate(`/session/${selectedChild.id}/${subject.id}/final-review`)}
                                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                                                size="md"
                                            >
                                                <Sparkles className="ml-2 w-4 h-4 animate-pulse" />
                                                התחל
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            {/* 3. ACTIVE TEST TOPICS */}
                            {activeTestTopics.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-indigo-600 font-bold text-sm uppercase tracking-wider pl-1 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                        <Calendar size={14} /> 
                                        נושאים למבחן הקרוב
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {activeTestTopics.map(topic => {
                                            const status = getTopicStatus(subject.id, topic);
                                            return (
                                                <TopicButton 
                                                    key={topic} 
                                                    topic={topic} 
                                                    status={status} 
                                                    childId={selectedChild.id} 
                                                    subjectId={subject.id} 
                                                    navigate={navigate}
                                                    highlight
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 4. GENERAL PRACTICE (Fallback if no test) */}
                            {showGeneralPractice && (
                                <div className="space-y-3">
                                    <h3 className="text-emerald-600 font-bold text-sm uppercase tracking-wider pl-1 flex items-center gap-2 border-b border-emerald-100 pb-1">
                                        <Book size={14} /> 
                                        נושאים לתרגול שוטף
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {defaultTopics.map(topic => (
                                            <TopicButton 
                                                key={topic} 
                                                topic={topic} 
                                                status={getTopicStatus(subject.id, topic)} 
                                                childId={selectedChild.id} 
                                                subjectId={subject.id} 
                                                navigate={navigate}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    );
                })}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-6xl mb-4">🤷‍♂️</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">לא נמצאו מקצועות לימוד</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                    נראה שעדיין לא הוגדרו מקצועות עבור ילד זה. בקשו מההורים להוסיף מקצועות בלוח הבקרה.
                </p>
                </div>
            )}
        </>
      )}

      {/* GAMES VIEW */}
      {viewMode === 'games' && selectedChild.showGames && selectedChild.gameSettings && (
        <div className="animate-fade-in pb-12">
            <HebrewGame settings={selectedChild.gameSettings} />
        </div>
      )}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border-4 border-white transform transition-all scale-100">
              <div className="bg-indigo-50 p-6 flex justify-between items-center border-b border-indigo-100">
                 <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full text-indigo-500">
                       <Smile size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-indigo-900">בחרו דמות חדשה!</h2>
                 </div>
                 <button 
                   onClick={() => setIsAvatarModalOpen(false)}
                   className="p-2 hover:bg-white rounded-full text-indigo-400 hover:text-indigo-600 transition-colors"
                 >
                    <X size={28} />
                 </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto bg-slate-50">
                 <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-4">
                    {AVATAR_OPTIONS.map((emoji, idx) => (
                       <button
                         key={idx}
                         onClick={() => handleAvatarChange(emoji)}
                         className={`
                           text-4xl p-4 rounded-2xl transition-all duration-200 
                           ${selectedChild.avatar === emoji 
                             ? 'bg-indigo-600 scale-110 shadow-lg ring-4 ring-indigo-200' 
                             : 'bg-white hover:bg-indigo-100 hover:scale-110 shadow-sm hover:shadow-md'
                           }
                         `}
                       >
                         {emoji}
                       </button>
                    ))}
                 </div>
              </div>
              <div className="p-4 bg-white border-t border-slate-100 text-center">
                 <Button onClick={() => setIsAvatarModalOpen(false)} variant="secondary">
                    ביטול
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Reusable Topic Button Component to reduce duplication
type TopicStatus = 'new' | 'needs_work' | 'mastered';

interface TopicButtonProps {
  topic: string;
  status: TopicStatus;
  childId: string;
  subjectId: string;
  navigate: (path: string) => void;
  highlight?: boolean;
}

const TopicButton: React.FC<TopicButtonProps> = ({ topic, status, childId, subjectId, navigate, highlight }) => {
    return (
        <button
        onClick={() => navigate(`/session/${childId}/${subjectId}/${encodeURIComponent(topic)}`)}
        className={`
            text-right px-4 py-3 rounded-xl font-bold transition-all flex justify-between items-center group border-l-4 shadow-sm relative overflow-hidden
            ${highlight ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-100' : ''}
            ${!highlight && status === 'mastered' ? 'bg-green-50 text-green-800 border-green-500 hover:bg-green-100' : ''}
            ${!highlight && status === 'needs_work' ? 'bg-orange-50 text-orange-800 border-orange-400 hover:bg-orange-100' : ''}
            ${!highlight && status === 'new' ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-white hover:text-indigo-700 hover:border-indigo-400' : ''}
        `}
        >
        <div className="flex flex-col relative z-10">
            <span className={`text-base ${highlight ? 'text-indigo-800' : ''}`}>{topic}</span>
            <span className="text-xs font-normal opacity-80 mt-1 flex items-center gap-1">
            {status === 'mastered' && <><CheckCircle size={10} /> שולט בחומר!</>}
            {status === 'needs_work' && <><Clock size={10} /> כדאי לתרגל עוד</>}
            {status === 'new' && <><Circle size={10} /> טרם תורגל</>}
            </span>
        </div>
        <div className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-colors relative z-10
            ${highlight ? 'bg-indigo-200 text-indigo-700' : ''}
            ${!highlight && status === 'mastered' ? 'bg-green-200 text-green-700' : ''}
            ${!highlight && status === 'needs_work' ? 'bg-orange-200 text-orange-700' : ''}
            ${!highlight && status === 'new' ? 'bg-white text-slate-400 group-hover:bg-indigo-200 group-hover:text-indigo-600' : ''}
        `}>
            {status === 'mastered' ? '🏆' : <ChevronLeft className="w-5 h-5" />}
        </div>
        </button>
    );
};
