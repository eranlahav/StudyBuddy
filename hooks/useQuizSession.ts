/**
 * Hook for managing quiz session state
 *
 * Encapsulates all quiz logic: loading questions, tracking answers,
 * scoring, and session completion. Used by QuizSession page.
 */

import { useState, useCallback, useEffect } from 'react';
import { QuizQuestion, ChildProfile, Subject, UpcomingTest, DifficultyLevel } from '../types';
import { generateQuizQuestions, generateExamRecommendations, analyzeMistakesAndGenerateTopics } from '../services/geminiService';
import { generateDictationQuestions } from '../services/dictationService';
import { getUserMessage, logger } from '../lib';

export interface QuizSessionState {
  /** Current questions */
  questions: QuizQuestion[];
  /** Current question index */
  currentIndex: number;
  /** User's selected answers (index for each question) */
  userAnswers: number[];
  /** Current score (correct answers) */
  score: number;
  /** Whether quiz is loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Whether quiz is finished */
  isFinished: boolean;
  /** Selected option for current question (null if not selected) */
  selectedOption: number | null;
  /** Whether current question has been answered */
  isAnswered: boolean;
  /** Whether to show hint for current question */
  showTip: boolean;
}

export interface FinalReviewState {
  /** AI-generated recommendations for the exam */
  recommendations: string[];
  /** Whether recommendations are being generated */
  isGeneratingRecs: boolean;
  /** Whether a remediation test was created */
  createdRemediation: boolean;
}

export interface UseQuizSessionOptions {
  child: ChildProfile;
  subject: Subject;
  topic: string;
  upcomingTests: UpcomingTest[];
  isFinalReview: boolean;
  /** Callback when session is saved */
  onSessionSave?: (session: {
    score: number;
    totalQuestions: number;
    questions: QuizQuestion[];
    userAnswers: number[];
    recommendations?: string[];
    readinessScore?: number;
  }) => void;
  /** Callback to add a remediation test (familyId added by store) */
  onAddRemediationTest?: (test: Omit<UpcomingTest, 'id' | 'familyId'> & { id: string }) => Promise<void>;
}

export interface UseQuizSessionReturn extends QuizSessionState, FinalReviewState {
  /** Current question */
  currentQuestion: QuizQuestion | null;
  /** Score percentage (0-100) */
  percentage: number;
  /** Load/reload questions */
  loadQuestions: () => Promise<void>;
  /** Handle answer selection */
  handleAnswer: (optionIndex: number) => void;
  /** Move to next question */
  nextQuestion: () => void;
  /** Toggle tip visibility */
  toggleTip: () => void;
  /** Finish the session and generate recommendations */
  finishSession: () => Promise<void>;
}

/**
 * Hook for managing a complete quiz session
 *
 * @example
 * const {
 *   questions,
 *   currentQuestion,
 *   isLoading,
 *   error,
 *   handleAnswer,
 *   nextQuestion,
 *   loadQuestions
 * } = useQuizSession({
 *   child,
 *   subject,
 *   topic: 'fractions',
 *   upcomingTests,
 *   isFinalReview: false
 * });
 */
export function useQuizSession(options: UseQuizSessionOptions): UseQuizSessionReturn {
  const {
    child,
    subject,
    topic,
    upcomingTests,
    isFinalReview,
    onSessionSave,
    onAddRemediationTest
  } = options;

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showTip, setShowTip] = useState(false);

  // Final review state
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [createdRemediation, setCreatedRemediation] = useState(false);

  // Find relevant test for this session
  const findRelevantTest = useCallback(() => {
    if (isFinalReview) {
      return upcomingTests
        .filter(t => t.childId === child.id && t.subjectId === subject.id)
        .sort((a, b) => a.date - b.date)[0];
    }
    return upcomingTests.find(t =>
      t.childId === child.id &&
      t.subjectId === subject.id &&
      t.topics.includes(topic)
    );
  }, [child.id, subject.id, topic, upcomingTests, isFinalReview]);

  // Load questions
  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const relevantTest = findRelevantTest();
    const targetTopics = isFinalReview && relevantTest
      ? relevantTest.topics
      : [topic];

    // Handle Dictation (local generation)
    if (relevantTest?.type === 'dictation' && relevantTest.dictationWords) {
      const generated = generateDictationQuestions(
        relevantTest.dictationWords,
        relevantTest.dictationMode
      );
      setQuestions(generated);
      setIsLoading(false);
      logger.info('useQuizSession: Dictation questions loaded', {
        count: generated.length
      });
      return;
    }

    // AI Generation
    const count = isFinalReview ? 10 : (relevantTest?.numQuestions || 5);
    const difficulty: DifficultyLevel = child.proficiency?.[subject.id] || 'medium';
    const topicPrompt = isFinalReview ? targetTopics.join(', ') : topic;

    try {
      const data = await generateQuizQuestions(
        subject.name,
        topicPrompt,
        child.grade,
        count,
        difficulty
      );
      setQuestions(data);
      logger.info('useQuizSession: Questions loaded', {
        childId: child.id,
        subject: subject.name,
        topic: topicPrompt,
        count: data.length
      });
    } catch (err) {
      const message = getUserMessage(err);
      setError(message);
      logger.error('useQuizSession: Failed to load questions', {
        childId: child.id,
        subject: subject.name
      }, err);
    } finally {
      setIsLoading(false);
    }
  }, [child, subject, topic, isFinalReview, findRelevantTest]);

  // Handle answer selection
  const handleAnswer = useCallback((optionIndex: number) => {
    if (isAnswered || questions.length === 0) return;

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    // Record answer
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentIndex] = optionIndex;
      return newAnswers;
    });

    // Update score if correct
    if (optionIndex === questions[currentIndex].correctAnswerIndex) {
      setScore(s => s + 1);
    }
  }, [isAnswered, questions, currentIndex]);

  // Move to next question
  const nextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowTip(false);
    }
  }, [currentIndex, questions.length]);

  // Toggle tip visibility
  const toggleTip = useCallback(() => {
    setShowTip(prev => !prev);
  }, []);

  // Finish session and generate recommendations
  const finishSession = useCallback(async () => {
    setIsFinished(true);

    if (!isFinalReview) {
      // For regular quizzes, just call the save callback
      onSessionSave?.({
        score,
        totalQuestions: questions.length,
        questions,
        userAnswers
      });
      return;
    }

    // Final Review: Generate recommendations and remediation
    setIsGeneratingRecs(true);
    let finalRecs: string[] = [];

    try {
      const relevantTest = findRelevantTest();

      if (relevantTest) {
        // Generate exam recommendations
        finalRecs = await generateExamRecommendations(
          subject.name,
          relevantTest.topics,
          questions,
          userAnswers
        );
        setRecommendations(finalRecs);
      }

      // Check for remediation (Score < 90%)
      const percentage = (score / questions.length) * 100;
      if (percentage < 90 && onAddRemediationTest) {
        const wrongAnswers = questions
          .map((q, i) => ({ q, ansIndex: userAnswers[i] }))
          .filter(item => item.ansIndex !== item.q.correctAnswerIndex)
          .map(item => ({
            question: item.q.questionText,
            wrongAnswer: item.q.options[item.ansIndex] || "Skipped"
          }));

        if (wrongAnswers.length > 0) {
          const remediationTopics = await analyzeMistakesAndGenerateTopics(
            subject.name,
            wrongAnswers
          );

          await onAddRemediationTest({
            id: `fix-${Date.now()}`,
            childId: child.id,
            subjectId: subject.id,
            date: Date.now(),
            topics: remediationTopics.map(t => `⭐ חיזוק: ${t}`),
            numQuestions: wrongAnswers.length + 2,
            type: 'quiz'
          });

          setCreatedRemediation(true);
        }
      }
    } catch (e) {
      logger.warn('useQuizSession: Failed to generate recommendations/remediation', {
        childId: child.id,
        subjectId: subject.id
      }, e);
    } finally {
      setIsGeneratingRecs(false);
    }

    // Save session
    const readiness = Math.round((score / questions.length) * 100);
    onSessionSave?.({
      score,
      totalQuestions: questions.length,
      questions,
      userAnswers,
      recommendations: finalRecs.length > 0 ? finalRecs : undefined,
      readinessScore: readiness
    });
  }, [
    isFinalReview,
    score,
    questions,
    userAnswers,
    subject,
    child.id,
    findRelevantTest,
    onSessionSave,
    onAddRemediationTest
  ]);

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Derived state
  const currentQuestion = questions[currentIndex] || null;
  const percentage = questions.length > 0
    ? Math.round((score / questions.length) * 100)
    : 0;

  return {
    // Quiz state
    questions,
    currentIndex,
    userAnswers,
    score,
    isLoading,
    error,
    isFinished,
    selectedOption,
    isAnswered,
    showTip,

    // Final review state
    recommendations,
    isGeneratingRecs,
    createdRemediation,

    // Derived state
    currentQuestion,
    percentage,

    // Actions
    loadQuestions,
    handleAnswer,
    nextQuestion,
    toggleTip,
    finishSession
  };
}
