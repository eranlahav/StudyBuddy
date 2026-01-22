/**
 * Hook for managing quiz session state
 *
 * Encapsulates all quiz logic: loading questions, tracking answers,
 * scoring, and session completion. Used by QuizSession page.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  QuizQuestion,
  ChildProfile,
  Subject,
  UpcomingTest,
  DifficultyLevel,
  FatigueState,
  FrustrationState,
  ADAPTIVE_QUIZ_CONSTANTS
} from '../types';
import { generateQuizQuestions, generateExamRecommendations, analyzeMistakesAndGenerateTopics } from '../services/geminiService';
import { generateDictationQuestions } from '../services/dictationService';
import { getUserMessage, logger, getEncouragementMessage } from '../lib';

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
  /** Message shown when quiz ends early due to fatigue */
  fatigueEndMessage: string | null;
  /** Message shown when quiz ends early due to frustration */
  frustrationEndMessage: string | null;
  /** End reason for analytics */
  earlyEndReason: 'fatigue' | 'frustration' | null;
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
  /** Callback when session is saved (can be async) */
  onSessionSave?: (session: {
    score: number;
    totalQuestions: number;
    questions: QuizQuestion[];
    userAnswers: number[];
    recommendations?: string[];
    readinessScore?: number;
  }) => void | Promise<void>;
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
  /** Fatigue tracking state (for analytics) */
  fatigueState: FatigueState;
  /** Frustration tracking state (for analytics) */
  frustrationState: FrustrationState;
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

  // Adaptive quiz state
  const [fatigueEndMessage, setFatigueEndMessage] = useState<string | null>(null);
  const [frustrationEndMessage, setFrustrationEndMessage] = useState<string | null>(null);
  const [earlyEndReason, setEarlyEndReason] = useState<'fatigue' | 'frustration' | null>(null);

  // Fatigue tracking
  const [fatigueState, setFatigueState] = useState<FatigueState>({
    averageAnswerTime: 0,
    recentAnswerTimes: [],
    recentAccuracy: [],
    fatigueDetected: false
  });

  // Frustration tracking
  const [frustrationState, setFrustrationState] = useState<FrustrationState>({
    consecutiveErrorsByTopic: {},
    blockedTopics: new Set(),
    lastTopic: '',
    questionsSinceBlock: 0
  });

  // Answer timing
  const [answerStartTime, setAnswerStartTime] = useState<number>(Date.now());

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

  /**
   * Detect fatigue based on speed AND accuracy drop
   * Both conditions must be true to avoid false positives (smart fast kids)
   */
  const detectFatigue = useCallback((state: FatigueState): boolean => {
    const { FATIGUE_SPEED_THRESHOLD, FATIGUE_ACCURACY_THRESHOLD } = ADAPTIVE_QUIZ_CONSTANTS;

    // Need minimum data
    if (state.recentAnswerTimes.length < 3) return false;
    if (state.recentAccuracy.length < 5) return false;

    // Check if rushing (answering < 50% of baseline time)
    const recentAvg = state.recentAnswerTimes.reduce((a, b) => a + b, 0) / state.recentAnswerTimes.length;
    const isRushing = state.averageAnswerTime > 0 && recentAvg < state.averageAnswerTime * FATIGUE_SPEED_THRESHOLD;

    // Check accuracy drop (< 40% correct in last 5)
    const correctCount = state.recentAccuracy.filter(Boolean).length;
    const recentAccuracyRate = correctCount / state.recentAccuracy.length;
    const hasAccuracyDrop = recentAccuracyRate < FATIGUE_ACCURACY_THRESHOLD;

    // Fatigue = both rushing AND poor accuracy
    return isRushing && hasAccuracyDrop;
  }, []);

  /**
   * Update fatigue state after each answer
   */
  const updateFatigueState = useCallback((
    currentState: FatigueState,
    answerTime: number,
    isCorrect: boolean,
    questionIndex: number
  ): FatigueState => {
    const { FATIGUE_MIN_QUESTIONS } = ADAPTIVE_QUIZ_CONSTANTS;

    // First 5 questions establish baseline
    if (questionIndex < FATIGUE_MIN_QUESTIONS) {
      const newAvg = (currentState.averageAnswerTime * questionIndex + answerTime) / (questionIndex + 1);
      return {
        ...currentState,
        averageAnswerTime: newAvg,
        recentAnswerTimes: [],
        recentAccuracy: [],
        fatigueDetected: false
      };
    }

    // After 5 questions, start monitoring
    const newRecentTimes = [...currentState.recentAnswerTimes, answerTime];
    if (newRecentTimes.length > 3) newRecentTimes.shift();

    const newRecentAccuracy = [...currentState.recentAccuracy, isCorrect];
    if (newRecentAccuracy.length > 5) newRecentAccuracy.shift();

    const updatedState: FatigueState = {
      ...currentState,
      recentAnswerTimes: newRecentTimes,
      recentAccuracy: newRecentAccuracy,
      fatigueDetected: false
    };

    return {
      ...updatedState,
      fatigueDetected: detectFatigue(updatedState)
    };
  }, [detectFatigue]);

  /**
   * Update frustration state after each answer
   */
  const updateFrustrationState = useCallback((
    currentState: FrustrationState,
    questionTopic: string,
    isCorrect: boolean
  ): FrustrationState => {
    const { FRUSTRATION_THRESHOLD } = ADAPTIVE_QUIZ_CONSTANTS;
    const currentCount = currentState.consecutiveErrorsByTopic[questionTopic] || 0;

    if (isCorrect) {
      // Reset counter on correct answer
      return {
        ...currentState,
        consecutiveErrorsByTopic: {
          ...currentState.consecutiveErrorsByTopic,
          [questionTopic]: 0
        },
        lastTopic: questionTopic,
        questionsSinceBlock: currentState.blockedTopics.size > 0
          ? currentState.questionsSinceBlock + 1
          : 0
      };
    }

    // Increment error count
    const newCount = currentCount + 1;
    const newConsecutive = {
      ...currentState.consecutiveErrorsByTopic,
      [questionTopic]: newCount
    };

    // Check if threshold reached
    if (newCount >= FRUSTRATION_THRESHOLD) {
      logger.warn('useQuizSession: Frustration detected on topic', {
        topic: questionTopic,
        consecutiveErrors: newCount
      });

      return {
        ...currentState,
        consecutiveErrorsByTopic: newConsecutive,
        blockedTopics: new Set([...currentState.blockedTopics, questionTopic]),
        lastTopic: questionTopic,
        questionsSinceBlock: 0
      };
    }

    return {
      ...currentState,
      consecutiveErrorsByTopic: newConsecutive,
      lastTopic: questionTopic,
      questionsSinceBlock: currentState.blockedTopics.size > 0
        ? currentState.questionsSinceBlock + 1
        : 0
    };
  }, []);

  /**
   * Apply cooldown to unblock topics after waiting period
   */
  const applyCooldown = useCallback((state: FrustrationState): FrustrationState => {
    const { COOLDOWN_QUESTIONS } = ADAPTIVE_QUIZ_CONSTANTS;

    if (state.questionsSinceBlock >= COOLDOWN_QUESTIONS && state.blockedTopics.size > 0) {
      logger.info('useQuizSession: Cooldown complete, unblocking topics');
      return {
        ...state,
        blockedTopics: new Set(),
        consecutiveErrorsByTopic: {},
        questionsSinceBlock: 0
      };
    }
    return state;
  }, []);

  // Reset answer timer when question changes
  useEffect(() => {
    setAnswerStartTime(Date.now());
  }, [currentIndex]);

  // Handle answer selection with adaptive tracking
  const handleAnswer = useCallback((optionIndex: number) => {
    if (isAnswered || questions.length === 0) return;

    const answerTime = (Date.now() - answerStartTime) / 1000; // Seconds
    const currentQ = questions[currentIndex];
    const isCorrect = optionIndex === currentQ.correctAnswerIndex;
    // Use question's topic field (from Gemini) or fall back to session topic from options
    const questionTopic = currentQ.topic || topic;

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    // Record answer
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentIndex] = optionIndex;
      return newAnswers;
    });

    // Update score if correct
    if (isCorrect) {
      setScore(s => s + 1);
    }

    // Update fatigue tracking
    const newFatigueState = updateFatigueState(fatigueState, answerTime, isCorrect, currentIndex);
    setFatigueState(newFatigueState);

    // Check fatigue and end early if detected
    if (newFatigueState.fatigueDetected && currentIndex >= ADAPTIVE_QUIZ_CONSTANTS.FATIGUE_MIN_QUESTIONS) {
      logger.info('useQuizSession: Fatigue detected, ending early', {
        questionIndex: currentIndex,
        avgTime: newFatigueState.averageAnswerTime,
        recentTimes: newFatigueState.recentAnswerTimes
      });
      setFatigueEndMessage(getEncouragementMessage('fatigue'));
      setEarlyEndReason('fatigue');
      setIsFinished(true);
      return;
    }

    // Update frustration tracking
    let newFrustrationState = updateFrustrationState(frustrationState, questionTopic, isCorrect);
    newFrustrationState = applyCooldown(newFrustrationState);
    setFrustrationState(newFrustrationState);

    // Check if all topics blocked (end quiz)
    // Only check on last question or if we have multiple topics
    const uniqueTopics = new Set(questions.map(q => q.topic || '')).size;
    if (newFrustrationState.blockedTopics.size > 0 && newFrustrationState.blockedTopics.size >= uniqueTopics) {
      logger.info('useQuizSession: All topics blocked by frustration, ending early');
      setFrustrationEndMessage(getEncouragementMessage('frustration'));
      setEarlyEndReason('frustration');
      setIsFinished(true);
      return;
    }
  }, [
    isAnswered,
    questions,
    currentIndex,
    answerStartTime,
    topic,
    fatigueState,
    frustrationState,
    updateFatigueState,
    updateFrustrationState,
    applyCooldown
  ]);

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
      try {
        await onSessionSave?.({
          score,
          totalQuestions: questions.length,
          questions,
          userAnswers
        });
      } catch (e) {
        logger.error('useQuizSession: Failed to save session', { childId: child.id }, e);
      }
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
    try {
      await onSessionSave?.({
        score,
        totalQuestions: questions.length,
        questions,
        userAnswers,
        recommendations: finalRecs.length > 0 ? finalRecs : undefined,
        readinessScore: readiness
      });
    } catch (e) {
      logger.error('useQuizSession: Failed to save final review session', { childId: child.id }, e);
    }
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

    // Early end messages
    fatigueEndMessage,
    frustrationEndMessage,
    earlyEndReason,

    // Final review state
    recommendations,
    isGeneratingRecs,
    createdRemediation,

    // Derived state
    currentQuestion,
    percentage,

    // Adaptive state (for analytics)
    fatigueState,
    frustrationState,

    // Actions
    loadQuestions,
    handleAnswer,
    nextQuestion,
    toggleTip,
    finishSession
  };
}
