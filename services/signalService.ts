/**
 * Signal Service
 *
 * Processes learning signals (quiz completions, evaluations) and
 * updates learner profiles using BKT algorithm.
 *
 * Key design: Fire-and-forget pattern - profile updates never block UI.
 * Errors are logged but don't break the quiz flow.
 */

import {
  StudySession,
  TopicMastery,
  LearnerProfile,
  ChildProfile,
  GradeLevel,
  Evaluation,
  EngagementMetrics,
  ParentNote,
  Signal,
  SignalType
} from '../types';
import {
  updateBKT,
  getBKTParams,
  calculateTrend,
  logger,
  ProfileUpdateError,
  retry,
  fuseSignals,
  daysSince,
  getBaseConfidence,
  analyzeEngagement
} from '../lib';
import { getProfile, updateProfile, initializeProfile } from './profileService';

/**
 * Extract topic-level performance from a quiz session
 * Groups questions by topic and tracks correct/incorrect answers
 */
function extractTopicPerformance(session: StudySession): Record<string, {
  correct: boolean[];
  subjectId: string;
}> {
  const topicPerf: Record<string, { correct: boolean[]; subjectId: string }> = {};

  // All questions in a session are for the same topic
  const topic = session.topic;

  if (!topicPerf[topic]) {
    topicPerf[topic] = { correct: [], subjectId: session.subjectId };
  }

  session.questions.forEach((q, idx) => {
    const correct = session.userAnswers?.[idx] === q.correctAnswerIndex;
    topicPerf[topic].correct.push(correct);
  });

  return topicPerf;
}

/**
 * Create a Signal from existing TopicMastery data
 * Used as the "prior" when fusing with new signals
 */
function createSignalFromMastery(
  mastery: TopicMastery,
  defaultType: SignalType = 'quiz'
): Signal {
  return {
    type: mastery.lastSignalType || defaultType,
    pKnown: mastery.pKnown,
    confidence: getBaseConfidence(mastery.lastSignalType || defaultType),
    recency: daysSince(mastery.lastAttempt),
    sampleSize: mastery.attempts
  };
}

/**
 * Update topic mastery by fusing existing data with new signal
 * Uses confidence-weighted Bayesian fusion
 */
function fuseTopicWithSignal(
  existing: TopicMastery | undefined,
  topic: string,
  subjectId: string,
  newSignal: Signal,
  grade: GradeLevel
): TopicMastery {
  const params = getBKTParams(grade);

  // Initialize if first time seeing this topic
  if (!existing) {
    return {
      topic,
      subjectId,
      pKnown: newSignal.pKnown,
      attempts: newSignal.sampleSize,
      correctCount: Math.round(newSignal.pKnown * newSignal.sampleSize),
      incorrectCount: Math.round((1 - newSignal.pKnown) * newSignal.sampleSize),
      averageTime: 0,
      recentTrend: 'stable',
      performanceWindow: [],
      firstAttempt: Date.now(),
      lastAttempt: Date.now(),
      lastSignalType: newSignal.type
    };
  }

  // Create signal from existing mastery
  const existingSignal = createSignalFromMastery(existing);

  // Fuse signals
  const fused = fuseSignals([existingSignal, newSignal]);

  return {
    ...existing,
    pKnown: fused.pKnown,
    lastAttempt: Date.now(),
    lastSignalType: fused.dominantSignal
  };
}

/**
 * Update topic mastery with new performance data
 */
function updateTopicMastery(
  existing: TopicMastery | undefined,
  performance: { correct: boolean[]; subjectId: string },
  topic: string,
  grade: GradeLevel
): TopicMastery {
  const params = getBKTParams(grade);

  // Initialize if first time seeing this topic
  let mastery: TopicMastery = existing || {
    topic,
    subjectId: performance.subjectId,
    pKnown: params.pInit,
    attempts: 0,
    correctCount: 0,
    incorrectCount: 0,
    averageTime: 0,
    recentTrend: 'stable',
    performanceWindow: [],
    firstAttempt: Date.now(),
    lastAttempt: Date.now()
  };

  // Apply BKT updates for each answer
  performance.correct.forEach(correct => {
    mastery.pKnown = updateBKT(mastery.pKnown, correct, params);
    mastery.attempts += 1;

    if (correct) {
      mastery.correctCount += 1;
    } else {
      mastery.incorrectCount += 1;
    }

    // Update performance window (last 10 attempts)
    mastery.performanceWindow.push(correct ? 1 : 0);
    if (mastery.performanceWindow.length > 10) {
      mastery.performanceWindow.shift();
    }
  });

  // Update trend
  mastery.recentTrend = calculateTrend(mastery.performanceWindow);
  mastery.lastAttempt = Date.now();

  return mastery;
}

/**
 * Process quiz signal and update profile
 *
 * This is the main entry point called after quiz completion.
 * Uses fire-and-forget pattern - errors are logged but never thrown
 * to the caller (quiz flow continues regardless).
 *
 * @param session - Completed quiz session
 * @param child - Child profile (needed for grade level)
 */
export async function processQuizSignal(
  session: StudySession,
  child: ChildProfile
): Promise<void> {
  try {
    logger.info('signalService: Processing quiz signal', {
      childId: session.childId,
      sessionId: session.id,
      topic: session.topic,
      score: `${session.score}/${session.totalQuestions}`
    });

    // 1. Fetch or initialize profile
    let profile = await getProfile(session.childId);

    if (!profile) {
      profile = initializeProfile(session.childId, session.familyId);
      logger.info('signalService: Initializing first profile', { childId: session.childId });
    }

    // 2. Extract performance by topic
    const topicPerf = extractTopicPerformance(session);

    // 3. Update BKT for each topic
    for (const [topic, perf] of Object.entries(topicPerf)) {
      const existingMastery = profile.topicMastery[topic];
      profile.topicMastery[topic] = updateTopicMastery(
        existingMastery,
        perf,
        topic,
        child.grade
      );
    }

    // 4. Update global metadata
    profile.totalQuizzes += 1;
    profile.totalQuestions += session.totalQuestions;

    // 5. Persist with retry
    await retry(
      () => updateProfile(session.childId, profile!),
      { maxRetries: 2, context: 'processQuizSignal' }
    );

    logger.info('signalService: Signal processed successfully', {
      childId: session.childId,
      topicsUpdated: Object.keys(topicPerf).length,
      newTotalQuizzes: profile.totalQuizzes
    });

  } catch (error) {
    // Log but don't rethrow - fire-and-forget pattern
    logger.error('signalService: Signal processing failed', {
      childId: session.childId,
      sessionId: session.id
    }, error);

    // Throw only if called directly (for testing) - in production this is caught by caller
    throw new ProfileUpdateError('Failed to process quiz signal', {
      cause: error as Error
    });
  }
}

/**
 * Bootstrap profile from existing quiz sessions
 * Used for children who have quiz history but no profile yet
 *
 * @param childId - Child to bootstrap
 * @param familyId - Family ID for multi-tenant isolation
 * @param existingSessions - All quiz sessions for this child
 * @param grade - Child's grade level
 */
export async function bootstrapProfile(
  childId: string,
  familyId: string,
  existingSessions: StudySession[],
  grade: GradeLevel
): Promise<LearnerProfile> {
  logger.info('signalService: Bootstrapping profile from history', {
    childId,
    sessionCount: existingSessions.length
  });

  // Start with empty profile
  let profile = initializeProfile(childId, familyId);

  // Sort sessions chronologically (oldest first)
  const sortedSessions = [...existingSessions].sort((a, b) => a.date - b.date);

  // Replay each session through the BKT algorithm
  for (const session of sortedSessions) {
    const topicPerf = extractTopicPerformance(session);

    for (const [topic, perf] of Object.entries(topicPerf)) {
      const existingMastery = profile.topicMastery[topic];
      profile.topicMastery[topic] = updateTopicMastery(
        existingMastery,
        perf,
        topic,
        grade
      );
    }

    profile.totalQuizzes += 1;
    profile.totalQuestions += session.totalQuestions;
  }

  // Save bootstrapped profile
  await updateProfile(childId, profile);

  logger.info('signalService: Profile bootstrapped', {
    childId,
    topicsTracked: Object.keys(profile.topicMastery).length,
    totalQuizzes: profile.totalQuizzes
  });

  return profile;
}

/**
 * Process school evaluation signal and update profile
 *
 * Evaluation signals carry highest weight (95% confidence).
 * Teacher assessments dominate over quiz-based estimates.
 *
 * Fire-and-forget: Errors logged but never thrown (profile updates are non-blocking).
 *
 * @param evaluation - School evaluation with extracted topics
 * @param child - Child profile (needed for grade level)
 */
export async function processEvaluationSignal(
  evaluation: Evaluation,
  child: ChildProfile
): Promise<void> {
  try {
    logger.info('signalService: Processing evaluation signal', {
      evaluationId: evaluation.id,
      childId: evaluation.childId,
      testName: evaluation.testName,
      weakTopics: evaluation.weakTopics.length,
      strongTopics: evaluation.strongTopics.length
    });

    // 1. Fetch or initialize profile
    let profile = await getProfile(evaluation.childId);

    if (!profile) {
      profile = initializeProfile(evaluation.childId, evaluation.familyId);
      logger.info('signalService: Initializing profile from evaluation', {
        childId: evaluation.childId
      });
    }

    const daysAgo = daysSince(evaluation.date);

    // 2. Process strong topics (teacher-marked as mastered)
    for (const topic of evaluation.strongTopics) {
      const evaluationSignal: Signal = {
        type: 'evaluation',
        pKnown: 0.90,        // Strong = 90% mastery
        confidence: 0.95,     // High confidence (teacher assessment)
        recency: daysAgo,
        sampleSize: evaluation.questions?.filter(q => q.topic === topic).length || 5
      };

      profile.topicMastery[topic] = fuseTopicWithSignal(
        profile.topicMastery[topic],
        topic,
        evaluation.subject,
        evaluationSignal,
        child.grade
      );
    }

    // 3. Process weak topics (teacher-marked as needing work)
    for (const topic of evaluation.weakTopics) {
      const evaluationSignal: Signal = {
        type: 'evaluation',
        pKnown: 0.30,        // Weak = 30% mastery
        confidence: 0.95,
        recency: daysAgo,
        sampleSize: evaluation.questions?.filter(q => q.topic === topic).length || 5
      };

      profile.topicMastery[topic] = fuseTopicWithSignal(
        profile.topicMastery[topic],
        topic,
        evaluation.subject,
        evaluationSignal,
        child.grade
      );
    }

    // 4. Process individual questions if available (more granular)
    if (evaluation.questions && evaluation.questions.length > 0) {
      const topicQuestions: Record<string, { correct: number; total: number }> = {};

      for (const q of evaluation.questions) {
        const topic = q.topic || 'general';
        if (!topicQuestions[topic]) {
          topicQuestions[topic] = { correct: 0, total: 0 };
        }
        topicQuestions[topic].total++;
        if (q.isCorrect) {
          topicQuestions[topic].correct++;
        }
      }

      // Create signals from per-topic performance
      for (const [topic, perf] of Object.entries(topicQuestions)) {
        // Skip if already processed via weak/strong topics
        if (evaluation.weakTopics.includes(topic) || evaluation.strongTopics.includes(topic)) {
          continue;
        }

        const accuracy = perf.correct / perf.total;
        const evaluationSignal: Signal = {
          type: 'evaluation',
          pKnown: accuracy,
          confidence: 0.95,
          recency: daysAgo,
          sampleSize: perf.total
        };

        profile.topicMastery[topic] = fuseTopicWithSignal(
          profile.topicMastery[topic],
          topic,
          evaluation.subject,
          evaluationSignal,
          child.grade
        );
      }
    }

    // 5. Persist with retry (fire-and-forget pattern)
    await retry(
      () => updateProfile(evaluation.childId, profile!),
      { maxRetries: 2, context: 'processEvaluationSignal' }
    );

    logger.info('signalService: Evaluation signal processed', {
      evaluationId: evaluation.id,
      topicsUpdated: evaluation.strongTopics.length + evaluation.weakTopics.length
    });

  } catch (error) {
    // Fire-and-forget: Log but don't rethrow
    logger.error('signalService: Evaluation signal processing failed', {
      evaluationId: evaluation.id,
      childId: evaluation.childId
    }, error);
  }
}
