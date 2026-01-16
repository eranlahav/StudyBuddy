
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { generateQuizQuestions, generateExamRecommendations, analyzeMistakesAndGenerateTopics } from '../services/geminiService';
import { generateDictationQuestions } from '../services/dictationService';
import { QuizQuestion } from '../types';
import { Button } from '../components/Button';
import { CheckCircle, XCircle, ArrowLeft, Home, Calculator, Lightbulb, Volume2, Sparkles, Target, Zap } from 'lucide-react';
import Confetti from 'react-confetti';

export const QuizSession: React.FC = () => {
  const { childId, subjectId, topic } = useParams();
  const navigate = useNavigate();
  const { children, subjects, addSession, upcomingTests, addUpcomingTest } = useStore();
  
  const child = children.find(c => c.id === childId);
  const subject = subjects.find(s => s.id === subjectId);
  const decodedTopic = decodeURIComponent(topic || '');
  const isFinalReview = decodedTopic === 'final-review';

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showTip, setShowTip] = useState(false);
  
  // Final Review State
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [generatingRecs, setGeneratingRecs] = useState(false);
  const [createdRemediation, setCreatedRemediation] = useState(false);

  useEffect(() => {
    if (child && subject && decodedTopic) {
      setLoading(true);
      
      let targetTopics: string[] = [decodedTopic];
      let relevantTest = upcomingTests.find(t => 
        t.childId === child.id && 
        t.subjectId === subject.id && 
        t.topics.includes(decodedTopic)
      );

      // Handle Final Review Mode
      if (isFinalReview) {
          // Find the upcoming test for this subject (assuming closest one)
          relevantTest = upcomingTests
            .filter(t => t.childId === child.id && t.subjectId === subject.id)
            .sort((a, b) => a.date - b.date)[0];

          if (relevantTest) {
              targetTopics = relevantTest.topics;
          }
      }

      // Check if it's a Dictation
      if (relevantTest && relevantTest.type === 'dictation' && relevantTest.dictationWords) {
         // Local Generation
         const generated = generateDictationQuestions(relevantTest.dictationWords, relevantTest.dictationMode);
         setQuestions(generated);
         setLoading(false);
      } else {
         // AI Generation (Standard Quiz or Final Review)
         const count = isFinalReview ? 10 : (relevantTest?.numQuestions || 5);
         const difficulty = child.proficiency?.[subject.id] || 'medium';
         
         // If final review, join topics with comma for the AI prompt
         const topicPrompt = isFinalReview ? targetTopics.join(', ') : decodedTopic;

         generateQuizQuestions(subject.name, topicPrompt, child.grade, count, difficulty)
            .then(data => {
            if (data.length > 0) {
                setQuestions(data);
            } else {
                setError("אופס! הבינה המלאכותית לא הצליחה לייצר שאלות כרגע. נסו שוב.");
            }
            })
            .catch(() => setError("שגיאה בטעינת השאלות."))
            .finally(() => setLoading(false));
      }
    }
  }, [child, subject, decodedTopic, upcomingTests, isFinalReview]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel previous
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'he-IL';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Auto-play TTS for dictation recognition questions
  useEffect(() => {
    if (questions.length > 0 && !isFinished) {
        const q = questions[currentQIndex];
        if (q.audioText) {
            // Small delay to allow UI to render
            setTimeout(() => speakText(q.audioText!), 500);
        }
    }
  }, [currentQIndex, questions, isFinished]);

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    
    // Record answer
    const newAnswers = [...userAnswers];
    newAnswers[currentQIndex] = index;
    setUserAnswers(newAnswers);

    if (index === questions[currentQIndex].correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowTip(false);
    } else {
      finishSession();
    }
  };

  const finishSession = async () => {
    setIsFinished(true);
    
    // Final Review Logic: Generate Recommendations & Remediation
    let finalRecs: string[] = [];
    if (isFinalReview && child && subject) {
       setGeneratingRecs(true);
       try {
           // 1. Get Recommendations
           const relevantTest = upcomingTests
            .filter(t => t.childId === child.id && t.subjectId === subject.id)
            .sort((a, b) => a.date - b.date)[0];
           
           if (relevantTest) {
               finalRecs = await generateExamRecommendations(subject.name, relevantTest.topics, questions, userAnswers);
               setRecommendations(finalRecs);
           }

           // 2. CHECK FOR REMEDIATION (Score < 90%)
           const percentage = (score / questions.length) * 100;
           if (percentage < 90) {
              // Gather wrong answers
              const wrongAnswers = questions
                .map((q, i) => ({ q, ansIndex: userAnswers[i] }))
                .filter(item => item.ansIndex !== item.q.correctAnswerIndex)
                .map(item => ({ 
                    question: item.q.questionText, 
                    wrongAnswer: item.q.options[item.ansIndex] || "Skipped" 
                }));
              
              if (wrongAnswers.length > 0) {
                  const remediationTopics = await analyzeMistakesAndGenerateTopics(subject.name, wrongAnswers);
                  
                  // Create the new test
                  await addUpcomingTest({
                      id: `fix-${Date.now()}`,
                      childId: child.id,
                      subjectId: subject.id,
                      date: Date.now(), // TODAY
                      topics: remediationTopics.map(t => `⭐ חיזוק: ${t}`), // Prefix for UI
                      numQuestions: wrongAnswers.length + 2, // A bit more than errors
                      type: 'quiz'
                  });
                  setCreatedRemediation(true);
              }
           }
       } catch (e) {
           console.error("Failed recs/remediation", e);
       } finally {
           setGeneratingRecs(false);
       }
    }

    if (child && subject && topic) {
      const readiness = Math.round((score / questions.length) * 100);
      
      addSession({
        id: Date.now().toString(),
        childId: child.id,
        subjectId: subject.id,
        topic: decodedTopic,
        date: Date.now(),
        score,
        totalQuestions: questions.length,
        questions,
        userAnswers,
        isFinalReview: isFinalReview,
        readinessScore: isFinalReview ? readiness : undefined,
        recommendations: finalRecs.length > 0 ? finalRecs : undefined
      });
    }
  };

  if (!child || !subject) return <div>Invalid Session Data</div>;

  const isEnglish = subject.id === 'english';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-700">
             {isFinalReview ? 'מכינים את המבחן המסכם...' : 'הבינה המלאכותית חושבת...'}
          </h2>
          <p className="text-slate-500">
             {isFinalReview ? 'אוספים שאלות מכל הנושאים ביחד!' : `מכינים שאלות במיוחד בשביל ${child.name}!`}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => navigate('/child')}>חזור</Button>
      </div>
    );
  }

  if (isFinished) {
    const percentage = (score / questions.length) * 100;
    
    if (isFinalReview && generatingRecs) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-fade-in">
                <Sparkles className="w-16 h-16 text-yellow-500 animate-pulse" />
                <h2 className="text-2xl font-bold text-slate-800">מנתחים את התוצאות...</h2>
                <p className="text-slate-500">המורה הווירטואלי מכין לך טיפים למבחן מחר!</p>
            </div>
        );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in max-w-2xl mx-auto">
        {percentage > 70 && <Confetti numberOfPieces={200} recycle={false} />}
        
        <div className="text-8xl mb-6">
          {percentage === 100 ? '🏆' : percentage > 70 ? '🎉' : '👍'}
        </div>
        
        <h1 className="text-4xl font-bold text-slate-800 mb-2">
            {isFinalReview ? 'סיימת את החזרה הגנרלית!' : 'סיימת את התרגול!'}
        </h1>
        
        <p className="text-xl text-slate-600 mb-8">
          הניקוד שלך: <span className="font-bold text-indigo-600">{score}</span> מתוך <span className="font-bold text-indigo-600">{questions.length}</span>
        </p>
        
        {/* Remediation Created Message */}
        {createdRemediation && (
             <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 w-full mb-8 text-center shadow-lg transform scale-105">
                 <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                     <Zap size={24} className="fill-current" />
                 </div>
                 <h3 className="text-xl font-bold text-indigo-900 mb-2">
                     אל דאגה! הכנתי לך חיזוק אישי.
                 </h3>
                 <p className="text-indigo-700 text-sm mb-4">
                     ראיתי איפה היה קצת קשה, ויצרתי עבורך תרגול קצרצר שיתקן את זה בדיוק למבחן מחר.
                     <br/>
                     זה מופיע עכשיו בלוח שלך!
                 </p>
                 <Button onClick={() => navigate('/child')} size="md" variant="primary">
                     לך לתרגול החיזוק
                 </Button>
             </div>
        )}

        {/* Recommendation Card for Final Review */}
        {isFinalReview && recommendations.length > 0 && !createdRemediation && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 w-full mb-8 text-right shadow-sm">
                <h3 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
                    <Target /> המלצות למבחן מחר:
                </h3>
                <ul className="space-y-3">
                    {recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                            <span className="bg-yellow-200 text-yellow-800 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                                {idx + 1}
                            </span>
                            <span className="text-slate-700 font-medium">{rec}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {!isFinalReview && (
            <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 w-full max-w-md mb-8">
                <h3 className="font-bold text-slate-700 mb-4">הרווחת:</h3>
                <div className="flex items-center justify-center gap-2 text-3xl font-bold text-yellow-500">
                    <span>⭐</span> +{score * 10} כוכבים
                </div>
            </div>
        )}

        {!createdRemediation && (
            <Button variant="fun" size="xl" onClick={() => navigate('/child')}>
            <Home className="ml-2" /> חזרה ללוח
            </Button>
        )}
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  const isMath = subject.id === 'math';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Final Review Header Badge */}
      {isFinalReview && (
          <div className="bg-indigo-600 text-white text-center py-2 rounded-t-xl font-bold tracking-wider mb-[-10px] relative z-10 shadow-lg mx-4">
              🎓 חזרה גנרלית למבחן
          </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6 bg-slate-200 rounded-full h-4 overflow-hidden">
        <div 
          className="bg-indigo-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${((currentQIndex) / questions.length) * 100}%` }}
        ></div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-b-8 border-slate-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">שאלה {currentQIndex + 1} מתוך {questions.length}</span>
            <div className="flex gap-2">
              {currentQ.tip && !isAnswered && (
                <button 
                  onClick={() => setShowTip(!showTip)}
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-yellow-100 text-yellow-700 flex items-center gap-1 hover:bg-yellow-200 transition-colors"
                >
                  <Lightbulb size={12} />
                  {showTip ? 'הסתר רמז' : 'רמז'}
                </button>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                currentQ.difficulty === 'easy' ? 'bg-green-100 text-green-700' : 
                currentQ.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                'bg-red-100 text-red-700'
              }`}>
                {currentQ.difficulty}
              </span>
            </div>
          </div>
          
          {/* Tip Display */}
          {showTip && currentQ.tip && !isAnswered && (
             <div className="mb-6 bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-yellow-800 animate-fade-in flex gap-3 items-start">
               <Lightbulb className="flex-shrink-0 mt-0.5" />
               <p className="text-sm md:text-base font-medium">{currentQ.tip}</p>
             </div>
          )}
          
          <div className="relative mb-8 text-center">
            {currentQ.audioText && (
               <button 
                  onClick={() => speakText(currentQ.audioText!)}
                  className="mb-4 inline-flex items-center justify-center p-4 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-colors animate-bounce-slow"
               >
                 <Volume2 size={40} />
               </button>
            )}

            {isMath ? (
                <div className="relative bg-white border border-slate-300 rounded-lg p-8 shadow-inner overflow-hidden" 
                style={{
                    backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                    minHeight: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                >
                <div className="absolute top-0 right-10 bottom-0 w-0.5 bg-red-300 opacity-60 h-full z-0"></div>
                <div className="relative z-10 w-full text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight" dir="auto">
                    {currentQ.questionText}
                    </h2>
                </div>
                </div>
            ) : (
                <h2 
                className={`text-2xl md:text-3xl font-bold text-slate-800 leading-tight ${isEnglish ? 'text-left' : 'text-right'}`}
                dir={isEnglish ? 'ltr' : 'rtl'}
                >
                {currentQ.questionText}
                </h2>
            )}
          </div>

          <div className="space-y-4">
            {currentQ.options.map((option, idx) => {
              let btnClass = `w-full ${isEnglish ? 'text-left' : 'text-right'} p-4 rounded-xl text-lg font-medium transition-all border-2 `;
              
              if (isAnswered) {
                if (idx === currentQ.correctAnswerIndex) {
                   btnClass += "bg-green-100 border-green-500 text-green-800";
                } else if (idx === selectedOption) {
                   btnClass += "bg-red-50 border-red-500 text-red-800 opacity-75";
                } else {
                   btnClass += "bg-slate-50 border-transparent text-slate-400";
                }
              } else {
                btnClass += "bg-slate-50 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700";
              }

              // English uses A, B, C, D. Hebrew uses Aleph, Bet, Gimel, Dalet.
              const letter = isEnglish 
                ? String.fromCharCode(65 + idx) // A, B, C...
                : String.fromCharCode(1488 + idx); // Aleph, Bet...

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isAnswered}
                  className={btnClass}
                  dir={isEnglish ? 'ltr' : 'rtl'}
                >
                  <div className="flex items-center">
                    <span className={`w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold opacity-50 ${isEnglish ? 'mr-4' : 'ml-4'}`}>
                      {letter}
                    </span>
                    <span className={isMath ? "font-mono text-xl" : ""}>{option}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className="mt-8 animate-fade-in" dir="rtl">
              <div className={`p-4 rounded-xl flex gap-4 ${
                 selectedOption === currentQ.correctAnswerIndex 
                 ? 'bg-green-50 border border-green-200' 
                 : 'bg-indigo-50 border border-indigo-200'
              }`}>
                <div className="flex-shrink-0 mt-1">
                  {selectedOption === currentQ.correctAnswerIndex 
                    ? <CheckCircle className="text-green-600 w-6 h-6" />
                    : <div className="text-indigo-600 text-2xl">💡</div>
                  }
                </div>
                <div>
                   <h4 className={`font-bold ${
                     selectedOption === currentQ.correctAnswerIndex ? 'text-green-800' : 'text-indigo-800'
                   }`}>
                     {selectedOption === currentQ.correctAnswerIndex ? 'נכון!' : 'הסבר:'}
                   </h4>
                   <p className="text-slate-700 mt-1">{currentQ.explanation}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button onClick={nextQuestion} size="lg" className="shadow-xl">
                  {currentQIndex === questions.length - 1 ? 'סיים תרגול' : 'שאלה הבאה'} <ArrowLeft className="mr-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
