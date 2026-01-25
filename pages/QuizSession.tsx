/**
 * Quiz Session Page
 *
 * Displays an interactive quiz with questions from Gemini AI or dictation.
 * Supports both regular practice and final review mode for upcoming tests.
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/Button';
import {
  CheckCircle,
  ArrowLeft,
  Home,
  Lightbulb,
  Volume2,
  Sparkles,
  Target,
  Zap,
  RefreshCw
} from 'lucide-react';
import Confetti from 'react-confetti';
import { useQuizSession, useAutoSpeak, useConfetti, getScoreEmoji, useSpeechSynthesis, useLearnerProfile } from '../hooks';

export const QuizSession: React.FC = () => {
  const { childId, subjectId, topic } = useParams();
  const navigate = useNavigate();
  const { children, subjects, addSession, upcomingTests, addUpcomingTest } = useStore();

  const child = children.find(c => c.id === childId);
  const subject = subjects.find(s => s.id === subjectId);
  const decodedTopic = decodeURIComponent(topic || '');
  const isFinalReview = decodedTopic === 'final-review';

  // Fetch learner profile for adaptive quiz generation
  const { profile } = useLearnerProfile(child || null);

  // Initialize quiz session hook with learner profile for adaptive generation
  const quiz = useQuizSession({
    child: child!,
    subject: subject!,
    topic: decodedTopic,
    upcomingTests,
    isFinalReview,
    profile, // Pass learner profile for adaptive quiz generation
    onSessionSave: async (sessionData) => {
      if (child && subject) {
        try {
          // Build session object, only including optional fields if they have values
          // Firestore doesn't accept undefined values
          const session: Parameters<typeof addSession>[0] = {
            id: Date.now().toString(),
            childId: child.id,
            subjectId: subject.id,
            topic: decodedTopic,
            date: Date.now(),
            score: sessionData.score,
            totalQuestions: sessionData.totalQuestions,
            questions: sessionData.questions,
            userAnswers: sessionData.userAnswers,
            isFinalReview
          };

          // Only add optional fields if they have actual values
          if (sessionData.readinessScore !== undefined) {
            session.readinessScore = sessionData.readinessScore;
          }
          if (sessionData.recommendations !== undefined) {
            session.recommendations = sessionData.recommendations;
          }

          await addSession(session);
        } catch (error) {
          console.error('Failed to save session:', error);
        }
      }
    },
    onAddRemediationTest: addUpcomingTest
  });

  // Auto-speak for dictation questions
  useAutoSpeak(quiz.currentQuestion?.audioText, {
    enabled: !quiz.isFinished && !quiz.isLoading
  });

  // Confetti for celebrations
  const { showConfetti, confettiProps } = useConfetti({ threshold: 70 });

  // Handle invalid session data
  if (!child || !subject) {
    return (
      <div className="text-center py-12" dir="rtl">
        <p className="text-red-500 mb-4">נתוני הפגישה לא תקינים</p>
        <Button onClick={() => navigate('/child')}>חזרה ללוח</Button>
      </div>
    );
  }

  const isEnglish = subject.id === 'english';

  // Loading state
  if (quiz.isLoading) {
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

  // Error state
  if (quiz.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6" dir="rtl">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border-2 border-red-100">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">אופס!</h2>
          <p className="text-slate-600 mb-6">{quiz.error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={quiz.loadQuestions}
              variant="primary"
              size="lg"
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              נסו שוב
            </Button>
            <Button
              onClick={() => navigate('/child')}
              variant="ghost"
              size="lg"
              className="flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              חזרה ללוח
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Generating recommendations state
  if (quiz.isFinished && quiz.isGeneratingRecs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-fade-in">
        <Sparkles className="w-16 h-16 text-yellow-500 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800">מנתחים את התוצאות...</h2>
        <p className="text-slate-500">המורה הווירטואלי מכין לך טיפים למבחן מחר!</p>
      </div>
    );
  }

  // Finished state
  if (quiz.isFinished) {
    return (
      <FinishedScreen
        quiz={quiz}
        isFinalReview={isFinalReview}
        showConfetti={showConfetti || quiz.percentage > 70}
        confettiProps={confettiProps}
        onNavigateHome={() => navigate('/child')}
      />
    );
  }

  // No current question (shouldn't happen, but safety check)
  if (!quiz.currentQuestion) {
    return null;
  }

  const currentQ = quiz.currentQuestion;
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
      <div className="mb-4 bg-slate-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-indigo-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${(quiz.currentIndex / quiz.questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Question Navigation Dots */}
      <QuestionNavigation
        totalQuestions={quiz.questions.length}
        currentIndex={quiz.currentIndex}
        isQuestionAnswered={quiz.isQuestionAnswered}
        isAnswerCorrect={quiz.isAnswerCorrect}
        onGoToQuestion={quiz.goToQuestion}
      />

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-b-8 border-slate-200">
        <div className="p-8">
          {/* Question Header */}
          <QuestionHeader
            currentIndex={quiz.currentIndex}
            totalQuestions={quiz.questions.length}
            difficulty={currentQ.difficulty}
            showTipButton={Boolean(currentQ.tip) && !quiz.isAnswered}
            showTip={quiz.showTip}
            onToggleTip={quiz.toggleTip}
          />

          {/* Tip Display */}
          {quiz.showTip && currentQ.tip && !quiz.isAnswered && (
            <div className="mb-6 bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-yellow-800 animate-fade-in flex gap-3 items-start">
              <Lightbulb className="flex-shrink-0 mt-0.5" />
              <p className="text-sm md:text-base font-medium">{currentQ.tip}</p>
            </div>
          )}

          {/* Question Content */}
          <QuestionContent
            question={currentQ}
            isMath={isMath}
            isEnglish={isEnglish}
          />

          {/* Answer Options */}
          <AnswerOptions
            options={currentQ.options}
            correctIndex={currentQ.correctAnswerIndex}
            selectedOption={quiz.selectedOption}
            isAnswered={quiz.isAnswered}
            isEnglish={isEnglish}
            isMath={isMath}
            onSelect={quiz.handleAnswer}
          />

          {/* Explanation & Navigation Buttons */}
          {quiz.isAnswered && (
            <AnswerFeedback
              isCorrect={quiz.selectedOption === currentQ.correctAnswerIndex}
              explanation={currentQ.explanation}
              isLastQuestion={quiz.currentIndex === quiz.questions.length - 1}
              isFirstQuestion={quiz.currentIndex === 0}
              onNext={quiz.currentIndex === quiz.questions.length - 1 ? quiz.finishSession : quiz.nextQuestion}
              onPrevious={quiz.previousQuestion}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

interface QuestionNavigationProps {
  totalQuestions: number;
  currentIndex: number;
  isQuestionAnswered: (index: number) => boolean;
  isAnswerCorrect: (index: number) => boolean | null;
  onGoToQuestion: (index: number) => void;
}

const QuestionNavigation: React.FC<QuestionNavigationProps> = ({
  totalQuestions,
  currentIndex,
  isQuestionAnswered,
  isAnswerCorrect,
  onGoToQuestion
}) => (
  <div className="mb-6 flex flex-wrap justify-center gap-2" dir="ltr">
    {Array.from({ length: totalQuestions }, (_, i) => {
      const answered = isQuestionAnswered(i);
      const correct = isAnswerCorrect(i);
      const isCurrent = i === currentIndex;

      // Determine dot styling based on state
      let bgColor = 'bg-slate-200'; // unanswered
      let textColor = 'text-slate-500';
      if (answered) {
        if (correct) {
          bgColor = 'bg-green-500';
          textColor = 'text-white';
        } else {
          bgColor = 'bg-red-400';
          textColor = 'text-white';
        }
      }

      return (
        <button
          key={i}
          onClick={() => onGoToQuestion(i)}
          className={`w-8 h-8 rounded-full text-sm font-bold transition-all
            ${bgColor} ${textColor}
            ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
            hover:scale-110 hover:shadow-md`}
        >
          {i + 1}
        </button>
      );
    })}
  </div>
);

interface QuestionHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  difficulty: string;
  showTipButton: boolean;
  showTip: boolean;
  onToggleTip: () => void;
}

const QuestionHeader: React.FC<QuestionHeaderProps> = ({
  currentIndex,
  totalQuestions,
  difficulty,
  showTipButton,
  showTip,
  onToggleTip
}) => (
  <div className="flex justify-between items-center mb-6">
    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
      שאלה {currentIndex + 1} מתוך {totalQuestions}
    </span>
    <div className="flex gap-2">
      {showTipButton && (
        <button
          onClick={onToggleTip}
          className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-yellow-100 text-yellow-700 flex items-center gap-1 hover:bg-yellow-200 transition-colors"
        >
          <Lightbulb size={12} />
          {showTip ? 'הסתר רמז' : 'רמז'}
        </button>
      )}
      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
        difficulty === 'easy' ? 'bg-green-100 text-green-700' :
        difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
        'bg-red-100 text-red-700'
      }`}>
        {difficulty}
      </span>
    </div>
  </div>
);

interface QuestionContentProps {
  question: { questionText: string; audioText?: string };
  isMath: boolean;
  isEnglish: boolean;
}

const QuestionContent: React.FC<QuestionContentProps> = ({ question, isMath, isEnglish }) => {
  const { speak } = useSpeechSynthesis();

  // Check if content has mixed Hebrew instruction + English content
  // Hebrew range: \u0590-\u05FF
  const hasHebrewChars = /[\u0590-\u05FF]/.test(question.questionText);
  const hasEnglishChars = /[a-zA-Z]/.test(question.questionText);
  const hasMixedContent = hasHebrewChars && hasEnglishChars;

  // Split mixed content at colon to separate Hebrew instruction from English question
  const splitMixedContent = () => {
    const colonIndex = question.questionText.indexOf(':');
    if (colonIndex > 0) {
      return {
        instruction: question.questionText.slice(0, colonIndex + 1).trim(),
        content: question.questionText.slice(colonIndex + 1).trim()
      };
    }
    // Fallback: find where English starts
    const englishMatch = question.questionText.match(/[a-zA-Z]/);
    if (englishMatch && englishMatch.index) {
      return {
        instruction: question.questionText.slice(0, englishMatch.index).trim(),
        content: question.questionText.slice(englishMatch.index).trim()
      };
    }
    return null;
  };

  return (
    <div className="relative mb-8 text-center">
      {question.audioText && (
        <button
          onClick={() => speak(question.audioText)}
          className="mb-4 inline-flex items-center justify-center p-4 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-colors animate-bounce-slow"
        >
          <Volume2 size={40} />
        </button>
      )}

      {isMath ? (
        <div
          className="relative bg-white border border-slate-300 rounded-lg p-8 shadow-inner overflow-hidden"
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
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight" dir="rtl">
              {question.questionText.split(/(\d[\d\s\.\,\+\-\×\÷\*\/\=x]+\d)/g).map((part, i) =>
                // If part contains math expression (numbers with operators), render LTR
                /^\d[\d\s\.\,\+\-\×\÷\*\/\=x]+\d$/.test(part)
                  ? <span key={i} dir="ltr" style={{ unicodeBidi: 'isolate' }}>{part}</span>
                  : part
              )}
            </h2>
          </div>
        </div>
      ) : isEnglish && hasMixedContent ? (
        // Mixed Hebrew instruction + English content - render separately
        (() => {
          const split = splitMixedContent();
          if (split) {
            return (
              <div className="space-y-3">
                {/* Hebrew instruction - right aligned */}
                <p className="text-lg text-slate-500 font-medium" dir="rtl">
                  {split.instruction}
                </p>
                {/* English content - left aligned, larger */}
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight text-left" dir="ltr">
                  {split.content}
                </h2>
              </div>
            );
          }
          // Fallback to original behavior
          return (
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight text-left" dir="ltr">
              {question.questionText}
            </h2>
          );
        })()
      ) : (
        <h2
          className={`text-2xl md:text-3xl font-bold text-slate-800 leading-tight ${isEnglish ? 'text-left' : 'text-right'}`}
          dir={isEnglish ? 'ltr' : 'rtl'}
        >
          {question.questionText}
        </h2>
      )}
    </div>
  );
};

interface AnswerOptionsProps {
  options: string[];
  correctIndex: number;
  selectedOption: number | null;
  isAnswered: boolean;
  isEnglish: boolean;
  isMath: boolean;
  onSelect: (index: number) => void;
}

const AnswerOptions: React.FC<AnswerOptionsProps> = ({
  options,
  correctIndex,
  selectedOption,
  isAnswered,
  isEnglish,
  isMath,
  onSelect
}) => (
  <div className="space-y-4">
    {options.map((option, idx) => {
      let btnClass = `w-full ${isEnglish ? 'text-left' : 'text-right'} p-4 rounded-xl text-lg font-medium transition-all border-2 `;

      if (isAnswered) {
        if (idx === correctIndex) {
          btnClass += "bg-green-100 border-green-500 text-green-800";
        } else if (idx === selectedOption) {
          btnClass += "bg-red-50 border-red-500 text-red-800 opacity-75";
        } else {
          btnClass += "bg-slate-50 border-transparent text-slate-400";
        }
      } else {
        btnClass += "bg-slate-50 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700";
      }

      const letter = isEnglish
        ? String.fromCharCode(65 + idx)
        : String.fromCharCode(1488 + idx);

      return (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
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
);

interface AnswerFeedbackProps {
  isCorrect: boolean;
  explanation: string;
  isLastQuestion: boolean;
  isFirstQuestion: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

const AnswerFeedback: React.FC<AnswerFeedbackProps> = ({
  isCorrect,
  explanation,
  isLastQuestion,
  isFirstQuestion,
  onNext,
  onPrevious
}) => (
  <div className="mt-8 animate-fade-in" dir="rtl">
    <div className={`p-4 rounded-xl flex gap-4 ${
      isCorrect ? 'bg-green-50 border border-green-200' : 'bg-indigo-50 border border-indigo-200'
    }`}>
      <div className="flex-shrink-0 mt-1">
        {isCorrect
          ? <CheckCircle className="text-green-600 w-6 h-6" />
          : <div className="text-indigo-600 text-2xl">💡</div>
        }
      </div>
      <div>
        <h4 className={`font-bold ${isCorrect ? 'text-green-800' : 'text-indigo-800'}`}>
          {isCorrect ? 'נכון!' : 'הסבר:'}
        </h4>
        <p className="text-slate-700 mt-1">{explanation}</p>
      </div>
    </div>

    <div className="mt-6 flex justify-between">
      {!isFirstQuestion ? (
        <Button onClick={onPrevious} size="lg" variant="secondary" className="shadow-md">
          שאלה קודמת
        </Button>
      ) : <div />}
      <Button onClick={onNext} size="lg" className="shadow-xl">
        {isLastQuestion ? 'סיים תרגול' : 'שאלה הבאה'} <ArrowLeft className="mr-2 w-5 h-5" />
      </Button>
    </div>
  </div>
);

interface FinishedScreenProps {
  quiz: ReturnType<typeof useQuizSession>;
  isFinalReview: boolean;
  showConfetti: boolean;
  confettiProps: { numberOfPieces: number; recycle: boolean };
  onNavigateHome: () => void;
}

const FinishedScreen: React.FC<FinishedScreenProps> = ({
  quiz,
  isFinalReview,
  showConfetti,
  confettiProps,
  onNavigateHome
}) => {
  // Check for early end due to fatigue or frustration
  const earlyEndMessage = quiz.fatigueEndMessage || quiz.frustrationEndMessage;
  const isEarlyEnd = Boolean(quiz.earlyEndReason);

  return (
  <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in max-w-2xl mx-auto">
    {showConfetti && !isEarlyEnd && <Confetti {...confettiProps} />}

    <div className="text-8xl mb-6">
      {isEarlyEnd ? '🌟' : getScoreEmoji(quiz.percentage)}
    </div>

    {/* Early End Encouragement Message */}
    {earlyEndMessage ? (
      <>
        <h1 className="text-4xl font-bold text-slate-800 mb-2">
          {earlyEndMessage}
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          עשית עבודה טובה! הניקוד שלך: <span className="font-bold text-indigo-600">{quiz.score}</span> מתוך <span className="font-bold text-indigo-600">{quiz.questions.length}</span>
        </p>
      </>
    ) : (
      <>
        <h1 className="text-4xl font-bold text-slate-800 mb-2">
          {isFinalReview ? 'סיימת את החזרה הגנרלית!' : 'סיימת את התרגול!'}
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          הניקוד שלך: <span className="font-bold text-indigo-600">{quiz.score}</span> מתוך <span className="font-bold text-indigo-600">{quiz.questions.length}</span>
        </p>
      </>
    )}

    {/* Remediation Created Message */}
    {quiz.createdRemediation && (
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
        <Button onClick={onNavigateHome} size="md" variant="primary">
          לך לתרגול החיזוק
        </Button>
      </div>
    )}

    {/* Recommendation Card for Final Review */}
    {isFinalReview && quiz.recommendations.length > 0 && !quiz.createdRemediation && (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 w-full mb-8 text-right shadow-sm">
        <h3 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
          <Target /> המלצות למבחן מחר:
        </h3>
        <ul className="space-y-3">
          {quiz.recommendations.map((rec, idx) => (
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

    {/* Stars earned for regular quizzes */}
    {!isFinalReview && (
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 w-full max-w-md mb-8">
        <h3 className="font-bold text-slate-700 mb-4">הרווחת:</h3>
        <div className="flex items-center justify-center gap-2 text-3xl font-bold text-yellow-500">
          <span>⭐</span> +{quiz.score * 10} כוכבים
        </div>
      </div>
    )}

    {!quiz.createdRemediation && (
      <Button variant="fun" size="xl" onClick={onNavigateHome}>
        <Home className="ml-2" /> חזרה ללוח
      </Button>
    )}
  </div>
  );
};
