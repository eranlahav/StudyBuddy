/**
 * Test Kids Storage Service
 *
 * Manages localStorage for test kids data, enabling persistent testing.
 * All test mode changes (sessions, profile updates, settings) are stored
 * locally and persist across browser sessions.
 *
 * Storage Keys:
 * - test_kids_children: ChildProfile[]
 * - test_kids_sessions: StudySession[]
 * - test_kids_profiles: Record<string, LearnerProfile>
 * - test_kids_tests: UpcomingTest[]
 * - test_kids_evaluations: Evaluation[]
 * - test_kids_initialized: boolean
 */

import { ChildProfile, LearnerProfile, StudySession, UpcomingTest, Evaluation } from '../types';
import {
  TEST_KIDS,
  TEST_SESSIONS,
  TEST_LEARNER_PROFILES,
  TEST_UPCOMING_TESTS
} from '../constants/testKids';
import { logger } from '../lib';

// ==========================================
// STORAGE KEYS
// ==========================================

const STORAGE_KEYS = {
  children: 'test_kids_children',
  sessions: 'test_kids_sessions',
  profiles: 'test_kids_profiles',
  tests: 'test_kids_tests',
  evaluations: 'test_kids_evaluations',
  initialized: 'test_kids_initialized'
} as const;

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize test storage with defaults if first time
 * Called when entering test mode
 */
export function initializeTestStorage(): void {
  const isInitialized = localStorage.getItem(STORAGE_KEYS.initialized);

  if (!isInitialized) {
    logger.info('testKidsStorage: Initializing with defaults');

    // Store default data
    localStorage.setItem(STORAGE_KEYS.children, JSON.stringify(TEST_KIDS));
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(TEST_SESSIONS));
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(TEST_LEARNER_PROFILES));
    localStorage.setItem(STORAGE_KEYS.tests, JSON.stringify(TEST_UPCOMING_TESTS));
    localStorage.setItem(STORAGE_KEYS.evaluations, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.initialized, 'true');

    logger.info('testKidsStorage: Initialization complete', {
      children: TEST_KIDS.length,
      sessions: TEST_SESSIONS.length,
      profiles: Object.keys(TEST_LEARNER_PROFILES).length,
      tests: TEST_UPCOMING_TESTS.length
    });
  }
}

/**
 * Reset test storage to defaults
 * Called when user clicks "Reset Test Data"
 */
export function resetTestStorage(): void {
  logger.info('testKidsStorage: Resetting to defaults');

  // Clear all test data
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });

  // Re-initialize with defaults
  initializeTestStorage();
}

// ==========================================
// CHILDREN
// ==========================================

/**
 * Get all test children from localStorage
 */
export function getTestChildren(): ChildProfile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.children);
    return data ? JSON.parse(data) : TEST_KIDS;
  } catch (error) {
    logger.error('testKidsStorage: Failed to get children', {}, error);
    return TEST_KIDS;
  }
}

/**
 * Update a test child's data
 */
export function updateTestChild(id: string, updates: Partial<ChildProfile>): void {
  try {
    const children = getTestChildren();
    const index = children.findIndex(c => c.id === id);

    if (index !== -1) {
      children[index] = { ...children[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.children, JSON.stringify(children));
      logger.debug('testKidsStorage: Child updated', { id, fields: Object.keys(updates) });
    }
  } catch (error) {
    logger.error('testKidsStorage: Failed to update child', { id }, error);
  }
}

/**
 * Award points to a test child (used after quiz completion)
 */
export function awardTestChildPoints(
  id: string,
  currentStars: number,
  currentStreak: number,
  pointsEarned: number
): void {
  updateTestChild(id, {
    stars: currentStars + pointsEarned,
    streak: currentStreak + 1
  });
}

// ==========================================
// SESSIONS
// ==========================================

/**
 * Get all test sessions from localStorage
 */
export function getTestSessions(): StudySession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.sessions);
    return data ? JSON.parse(data) : TEST_SESSIONS;
  } catch (error) {
    logger.error('testKidsStorage: Failed to get sessions', {}, error);
    return TEST_SESSIONS;
  }
}

/**
 * Add a new test session
 */
export function addTestSession(session: StudySession): void {
  try {
    const sessions = getTestSessions();
    sessions.unshift(session); // Add to beginning (newest first)
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
    logger.debug('testKidsStorage: Session added', {
      sessionId: session.id,
      childId: session.childId,
      score: `${session.score}/${session.totalQuestions}`
    });
  } catch (error) {
    logger.error('testKidsStorage: Failed to add session', { sessionId: session.id }, error);
  }
}

// ==========================================
// LEARNER PROFILES
// ==========================================

/**
 * Get all test profiles from localStorage
 */
export function getTestProfiles(): Record<string, LearnerProfile> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.profiles);
    return data ? JSON.parse(data) : TEST_LEARNER_PROFILES;
  } catch (error) {
    logger.error('testKidsStorage: Failed to get profiles', {}, error);
    return TEST_LEARNER_PROFILES;
  }
}

/**
 * Get a single test profile
 */
export function getTestProfile(childId: string): LearnerProfile | null {
  const profiles = getTestProfiles();
  return profiles[childId] || null;
}

/**
 * Update a test profile
 */
export function updateTestProfile(childId: string, profile: LearnerProfile): void {
  try {
    const profiles = getTestProfiles();
    profiles[childId] = { ...profile, lastUpdated: Date.now() };
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
    logger.debug('testKidsStorage: Profile updated', {
      childId,
      topicsCount: Object.keys(profile.topicMastery).length,
      totalQuizzes: profile.totalQuizzes
    });
  } catch (error) {
    logger.error('testKidsStorage: Failed to update profile', { childId }, error);
  }
}

// ==========================================
// UPCOMING TESTS
// ==========================================

/**
 * Get all test upcoming tests from localStorage
 */
export function getTestTests(): UpcomingTest[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.tests);
    return data ? JSON.parse(data) : TEST_UPCOMING_TESTS;
  } catch (error) {
    logger.error('testKidsStorage: Failed to get tests', {}, error);
    return TEST_UPCOMING_TESTS;
  }
}

/**
 * Add a new upcoming test
 */
export function addTestTest(test: UpcomingTest): void {
  try {
    const tests = getTestTests();
    tests.push(test);
    localStorage.setItem(STORAGE_KEYS.tests, JSON.stringify(tests));
    logger.debug('testKidsStorage: Test added', { testId: test.id, childId: test.childId });
  } catch (error) {
    logger.error('testKidsStorage: Failed to add test', { testId: test.id }, error);
  }
}

/**
 * Update an existing test
 */
export function updateTestTest(id: string, updates: Partial<UpcomingTest>): void {
  try {
    const tests = getTestTests();
    const index = tests.findIndex(t => t.id === id);

    if (index !== -1) {
      tests[index] = { ...tests[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.tests, JSON.stringify(tests));
      logger.debug('testKidsStorage: Test updated', { id, fields: Object.keys(updates) });
    }
  } catch (error) {
    logger.error('testKidsStorage: Failed to update test', { id }, error);
  }
}

/**
 * Delete an upcoming test
 */
export function deleteTestTest(id: string): void {
  try {
    const tests = getTestTests();
    const filtered = tests.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.tests, JSON.stringify(filtered));
    logger.debug('testKidsStorage: Test deleted', { id });
  } catch (error) {
    logger.error('testKidsStorage: Failed to delete test', { id }, error);
  }
}

// ==========================================
// EVALUATIONS
// ==========================================

/**
 * Get all test evaluations from localStorage
 */
export function getTestEvaluations(): Evaluation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.evaluations);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('testKidsStorage: Failed to get evaluations', {}, error);
    return [];
  }
}

/**
 * Add a new evaluation
 */
export function addTestEvaluation(evaluation: Evaluation): void {
  try {
    const evaluations = getTestEvaluations();
    evaluations.unshift(evaluation); // Add to beginning (newest first)
    localStorage.setItem(STORAGE_KEYS.evaluations, JSON.stringify(evaluations));
    logger.debug('testKidsStorage: Evaluation added', {
      evalId: evaluation.id,
      childId: evaluation.childId
    });
  } catch (error) {
    logger.error('testKidsStorage: Failed to add evaluation', { evalId: evaluation.id }, error);
  }
}

/**
 * Update an existing evaluation
 */
export function updateTestEvaluation(id: string, updates: Partial<Evaluation>): void {
  try {
    const evaluations = getTestEvaluations();
    const index = evaluations.findIndex(e => e.id === id);

    if (index !== -1) {
      evaluations[index] = { ...evaluations[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.evaluations, JSON.stringify(evaluations));
      logger.debug('testKidsStorage: Evaluation updated', { id, fields: Object.keys(updates) });
    }
  } catch (error) {
    logger.error('testKidsStorage: Failed to update evaluation', { id }, error);
  }
}

/**
 * Delete an evaluation
 */
export function deleteTestEvaluation(id: string): void {
  try {
    const evaluations = getTestEvaluations();
    const filtered = evaluations.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.evaluations, JSON.stringify(filtered));
    logger.debug('testKidsStorage: Evaluation deleted', { id });
  } catch (error) {
    logger.error('testKidsStorage: Failed to delete evaluation', { id }, error);
  }
}

// ==========================================
// UTILITY - Check if evaluation is for test kid
// ==========================================

/**
 * Check if an evaluation ID belongs to test data
 */
export function isTestEvaluation(evalId: string): boolean {
  return evalId.startsWith('test-eval-');
}

/**
 * Check if a test ID belongs to test data
 */
export function isTestUpcomingTest(testId: string): boolean {
  return testId.startsWith('test-upcoming-');
}
