/**
 * Test Kids - Five distinct learning profiles for UI testing
 *
 * Each test kid showcases different adaptive learning scenarios:
 * 1. New Learner - Fresh start, empty profile
 * 2. Math Genius / History Struggler - Strong in one subject, weak in another
 * 3. Consistent Improver - Steady upward trend
 * 4. Declining Performance - Was strong, now struggling
 * 5. All-Rounder - Even performance across subjects
 *
 * Usage: Toggle via super admin button in top bar
 * All test kid IDs start with 'test-kid-' prefix for detection
 */

import {
  ChildProfile,
  LearnerProfile,
  TopicMastery,
  GradeLevel,
  StudySession,
  UpcomingTest
} from '../types';
import { DEFAULT_GAME_SETTINGS } from '../constants';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Check if a child ID belongs to a test kid
 */
export function isTestKid(childId: string): boolean {
  return childId.startsWith('test-kid-');
}

/**
 * Create a mock TopicMastery object
 */
function createMockMastery(
  topic: string,
  subjectId: string,
  pKnown: number,
  attempts: number,
  correctCount: number,
  incorrectCount: number,
  performanceWindow: number[],
  trend: 'improving' | 'stable' | 'declining' = 'stable',
  daysAgoLastAttempt = 2
): TopicMastery {
  return {
    topic,
    subjectId,
    pKnown,
    attempts,
    correctCount,
    incorrectCount,
    averageTime: Math.random() * 10 + 5, // 5-15 seconds
    recentTrend: trend,
    performanceWindow,
    firstAttempt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 2 months ago
    lastAttempt: Date.now() - daysAgoLastAttempt * 24 * 60 * 60 * 1000
  };
}

/**
 * Create a mock study session
 */
function createMockSession(
  id: string,
  childId: string,
  subjectId: string,
  topic: string,
  score: number,
  totalQuestions: number,
  daysAgo: number
): StudySession {
  return {
    id,
    childId,
    subjectId,
    topic,
    date: Date.now() - daysAgo * 24 * 60 * 60 * 1000,
    score,
    totalQuestions,
    questions: [], // Empty for mock
    userAnswers: [],
    familyId: 'test-family'
  };
}

// ==========================================
// TEST KID 1: NEW LEARNER
// ==========================================

export const TEST_KID_1_PROFILE: ChildProfile = {
  id: 'test-kid-1',
  name: 'נועה החדשה',
  grade: GradeLevel.Grade3,
  avatar: '🦄',
  stars: 0,
  streak: 0,
  subjects: ['math', 'science'],
  proficiency: {
    math: 'easy',
    science: 'easy'
  },
  gameSettings: DEFAULT_GAME_SETTINGS,
  showGames: true,
  familyId: 'test-family',
  pinHash: '',
  createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
  createdBy: 'test-admin'
};

export const TEST_KID_1_LEARNER: LearnerProfile = {
  childId: 'test-kid-1',
  familyId: 'test-family',
  topicMastery: {}, // Empty - no quiz history yet
  totalQuizzes: 0,
  totalQuestions: 0,
  lastUpdated: Date.now(),
  version: 1
};

// No sessions for new learner
export const TEST_KID_1_SESSIONS: StudySession[] = [];

// ==========================================
// TEST KID 2: MATH GENIUS / HISTORY STRUGGLER
// ==========================================

export const TEST_KID_2_PROFILE: ChildProfile = {
  id: 'test-kid-2',
  name: 'יונתן המתמטיקאי',
  grade: GradeLevel.Grade5,
  avatar: '🤖',
  stars: 450,
  streak: 12,
  subjects: ['math', 'history', 'science'],
  proficiency: {
    math: 'hard',
    history: 'easy',
    science: 'medium'
  },
  gameSettings: DEFAULT_GAME_SETTINGS,
  showGames: false,
  familyId: 'test-family',
  pinHash: '',
  createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000, // 3 months ago
  createdBy: 'test-admin'
};

export const TEST_KID_2_LEARNER: LearnerProfile = {
  childId: 'test-kid-2',
  familyId: 'test-family',
  topicMastery: {
    // Strong math topics (pKnown > 0.8)
    'כפל': createMockMastery('כפל', 'math', 0.92, 45, 40, 5, [1, 1, 1, 1, 1, 1, 1, 0, 1, 1]),
    'חילוק': createMockMastery('חילוק', 'math', 0.88, 38, 34, 4, [1, 1, 1, 1, 0, 1, 1, 1, 1, 1]),
    'שברים': createMockMastery('שברים', 'math', 0.85, 32, 28, 4, [1, 1, 0, 1, 1, 1, 1, 1, 1, 1]),
    'חיבור': createMockMastery('חיבור', 'math', 0.95, 50, 48, 2, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),

    // Weak history topics (pKnown < 0.4)
    'יוון העתיקה': createMockMastery('יוון העתיקה', 'history', 0.28, 20, 8, 12, [0, 0, 1, 0, 0, 1, 0, 0, 0, 1]),
    'מלחמות העולם': createMockMastery('מלחמות העולם', 'history', 0.32, 18, 7, 11, [0, 1, 0, 0, 0, 1, 0, 0, 1, 0]),
    'היסטוריה של ישראל': createMockMastery('היסטוריה של ישראל', 'history', 0.35, 15, 6, 9, [0, 0, 1, 0, 1, 0, 0, 0, 1, 0]),

    // Medium science
    'גוף האדם': createMockMastery('גוף האדם', 'science', 0.62, 25, 16, 9, [1, 0, 1, 1, 0, 1, 1, 1, 0, 1])
  },
  totalQuizzes: 24,
  totalQuestions: 243,
  lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000,
  version: 1
};

export const TEST_KID_2_SESSIONS: StudySession[] = [
  // High math scores
  createMockSession('ts2-1', 'test-kid-2', 'math', 'כפל', 9, 10, 2),
  createMockSession('ts2-2', 'test-kid-2', 'math', 'חילוק', 10, 10, 4),
  createMockSession('ts2-3', 'test-kid-2', 'math', 'שברים', 8, 10, 6),
  createMockSession('ts2-4', 'test-kid-2', 'math', 'חיבור', 10, 10, 8),
  // Low history scores
  createMockSession('ts2-5', 'test-kid-2', 'history', 'יוון העתיקה', 4, 10, 3),
  createMockSession('ts2-6', 'test-kid-2', 'history', 'מלחמות העולם', 5, 10, 5),
  createMockSession('ts2-7', 'test-kid-2', 'history', 'היסטוריה של ישראל', 3, 10, 7),
  // Medium science
  createMockSession('ts2-8', 'test-kid-2', 'science', 'גוף האדם', 7, 10, 10)
];

// ==========================================
// TEST KID 3: CONSISTENT IMPROVER
// ==========================================

export const TEST_KID_3_PROFILE: ChildProfile = {
  id: 'test-kid-3',
  name: 'תמר המתמידה',
  grade: GradeLevel.Grade4,
  avatar: '📚',
  stars: 280,
  streak: 8,
  subjects: ['math', 'science', 'english'],
  proficiency: {
    math: 'medium',
    science: 'medium',
    english: 'medium'
  },
  gameSettings: DEFAULT_GAME_SETTINGS,
  showGames: true,
  familyId: 'test-family',
  pinHash: '',
  createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 2 months ago
  createdBy: 'test-admin'
};

export const TEST_KID_3_LEARNER: LearnerProfile = {
  childId: 'test-kid-3',
  familyId: 'test-family',
  topicMastery: {
    // All topics showing improving trend (recent 3 > previous 3)
    'חיבור': createMockMastery('חיבור', 'math', 0.68, 30, 21, 9, [0, 0, 1, 0, 1, 1, 1, 1, 1, 1], 'improving'),
    'חיסור': createMockMastery('חיסור', 'math', 0.65, 28, 19, 9, [0, 1, 0, 0, 1, 1, 1, 1, 1, 1], 'improving'),
    'בעלי חיים': createMockMastery('בעלי חיים', 'science', 0.70, 26, 19, 7, [0, 1, 0, 1, 1, 0, 1, 1, 1, 1], 'improving'),
    'צמחים': createMockMastery('צמחים', 'science', 0.63, 22, 15, 7, [0, 0, 1, 0, 1, 1, 1, 1, 1, 1], 'improving'),
    'דקדוק': createMockMastery('דקדוק', 'english', 0.58, 24, 15, 9, [0, 0, 1, 0, 0, 1, 1, 1, 1, 1], 'improving'),
    'אוצר מילים': createMockMastery('אוצר מילים', 'english', 0.55, 20, 12, 8, [0, 0, 0, 1, 0, 1, 1, 1, 1, 1], 'improving')
  },
  totalQuizzes: 18,
  totalQuestions: 150,
  lastUpdated: Date.now() - 1 * 24 * 60 * 60 * 1000,
  version: 1
};

export const TEST_KID_3_SESSIONS: StudySession[] = [
  // Scores improving over time (older = lower, newer = higher)
  createMockSession('ts3-1', 'test-kid-3', 'math', 'חיבור', 5, 10, 30), // Old: 50%
  createMockSession('ts3-2', 'test-kid-3', 'math', 'חיבור', 6, 10, 20), // 60%
  createMockSession('ts3-3', 'test-kid-3', 'math', 'חיבור', 8, 10, 10), // 80%
  createMockSession('ts3-4', 'test-kid-3', 'science', 'בעלי חיים', 5, 10, 25),
  createMockSession('ts3-5', 'test-kid-3', 'science', 'בעלי חיים', 7, 10, 15),
  createMockSession('ts3-6', 'test-kid-3', 'science', 'בעלי חיים', 8, 10, 5)
];

// ==========================================
// TEST KID 4: DECLINING PERFORMANCE
// ==========================================

export const TEST_KID_4_PROFILE: ChildProfile = {
  id: 'test-kid-4',
  name: 'אריאל המתקשה',
  grade: GradeLevel.Grade6,
  avatar: '🐻',
  stars: 180,
  streak: 2,
  subjects: ['math', 'english', 'science'],
  proficiency: {
    math: 'medium',
    english: 'easy',
    science: 'medium'
  },
  gameSettings: DEFAULT_GAME_SETTINGS,
  showGames: true,
  familyId: 'test-family',
  pinHash: '',
  createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000, // 4 months ago
  createdBy: 'test-admin'
};

export const TEST_KID_4_LEARNER: LearnerProfile = {
  childId: 'test-kid-4',
  familyId: 'test-family',
  topicMastery: {
    // Topics showing declining trend (was strong, now struggling)
    'כפל': createMockMastery('כפל', 'math', 0.48, 42, 22, 20, [1, 1, 1, 1, 1, 0, 0, 0, 0, 0], 'declining'),
    'שברים': createMockMastery('שברים', 'math', 0.42, 35, 17, 18, [1, 1, 0, 1, 1, 0, 0, 0, 1, 0], 'declining'),
    'חילוק': createMockMastery('חילוק', 'math', 0.45, 30, 15, 15, [1, 1, 1, 0, 1, 0, 0, 0, 0, 1], 'declining'),
    'אוצר מילים': createMockMastery('אוצר מילים', 'english', 0.35, 28, 11, 17, [1, 0, 1, 1, 0, 0, 0, 0, 0, 0], 'declining'),
    'דקדוק': createMockMastery('דקדוק', 'english', 0.38, 25, 10, 15, [1, 1, 0, 1, 0, 0, 0, 0, 0, 1], 'declining'),
    // One stable topic
    'צמחים': createMockMastery('צמחים', 'science', 0.58, 22, 14, 8, [1, 0, 1, 0, 1, 1, 0, 1, 1, 0], 'stable')
  },
  totalQuizzes: 21,
  totalQuestions: 182,
  lastUpdated: Date.now() - 3 * 24 * 60 * 60 * 1000,
  version: 1
};

export const TEST_KID_4_SESSIONS: StudySession[] = [
  // Scores declining over time (older = higher, newer = lower)
  createMockSession('ts4-1', 'test-kid-4', 'math', 'כפל', 9, 10, 60), // Old: 90%
  createMockSession('ts4-2', 'test-kid-4', 'math', 'כפל', 8, 10, 40), // 80%
  createMockSession('ts4-3', 'test-kid-4', 'math', 'כפל', 6, 10, 20), // 60%
  createMockSession('ts4-4', 'test-kid-4', 'math', 'כפל', 4, 10, 5), // 40%
  createMockSession('ts4-5', 'test-kid-4', 'english', 'אוצר מילים', 7, 10, 50),
  createMockSession('ts4-6', 'test-kid-4', 'english', 'אוצר מילים', 5, 10, 25),
  createMockSession('ts4-7', 'test-kid-4', 'english', 'אוצר מילים', 3, 10, 3)
];

// ==========================================
// TEST KID 5: ALL-ROUNDER
// ==========================================

export const TEST_KID_5_PROFILE: ChildProfile = {
  id: 'test-kid-5',
  name: 'דניאל המאוזן',
  grade: GradeLevel.Grade7,
  avatar: '⚽',
  stars: 520,
  streak: 15,
  subjects: ['math', 'science', 'english', 'history', 'bible'],
  proficiency: {
    math: 'medium',
    science: 'medium',
    english: 'medium',
    history: 'medium',
    bible: 'medium'
  },
  gameSettings: DEFAULT_GAME_SETTINGS,
  showGames: false,
  familyId: 'test-family',
  pinHash: '',
  createdAt: Date.now() - 150 * 24 * 60 * 60 * 1000, // 5 months ago
  createdBy: 'test-admin'
};

export const TEST_KID_5_LEARNER: LearnerProfile = {
  childId: 'test-kid-5',
  familyId: 'test-family',
  topicMastery: {
    // Even performance across all subjects (pKnown ~0.6-0.7)
    'הנדסה': createMockMastery('הנדסה', 'math', 0.68, 30, 20, 10, [1, 0, 1, 1, 0, 1, 1, 1, 0, 1]),
    'שברים': createMockMastery('שברים', 'math', 0.65, 28, 19, 9, [0, 1, 1, 1, 0, 1, 1, 0, 1, 1]),
    'פיזיקה': createMockMastery('פיזיקה', 'science', 0.65, 28, 19, 9, [1, 1, 0, 1, 1, 0, 1, 1, 1, 0]),
    'גוף האדם': createMockMastery('גוף האדם', 'science', 0.67, 26, 18, 8, [1, 0, 1, 1, 1, 0, 1, 1, 0, 1]),
    'הבנת הנקרא': createMockMastery('הבנת הנקרא', 'english', 0.63, 26, 17, 9, [0, 1, 1, 1, 0, 1, 1, 0, 1, 1]),
    'דקדוק': createMockMastery('דקדוק', 'english', 0.62, 24, 16, 8, [1, 0, 1, 0, 1, 1, 1, 0, 1, 1]),
    'היסטוריה של ישראל': createMockMastery('היסטוריה של ישראל', 'history', 0.67, 25, 18, 7, [1, 0, 1, 1, 1, 0, 1, 1, 1, 1]),
    'יוון העתיקה': createMockMastery('יוון העתיקה', 'history', 0.64, 22, 15, 7, [0, 1, 1, 1, 0, 1, 1, 0, 1, 1]),
    'ספר בראשית': createMockMastery('ספר בראשית', 'bible', 0.64, 24, 16, 8, [1, 1, 0, 1, 0, 1, 1, 1, 0, 1]),
    'הנביאים': createMockMastery('הנביאים', 'bible', 0.66, 22, 15, 7, [0, 1, 1, 0, 1, 1, 1, 1, 1, 0])
  },
  totalQuizzes: 28,
  totalQuestions: 255,
  lastUpdated: Date.now() - 1 * 24 * 60 * 60 * 1000,
  version: 1
};

export const TEST_KID_5_SESSIONS: StudySession[] = [
  // Consistent ~70% across all subjects
  createMockSession('ts5-1', 'test-kid-5', 'math', 'הנדסה', 7, 10, 2),
  createMockSession('ts5-2', 'test-kid-5', 'math', 'שברים', 7, 10, 5),
  createMockSession('ts5-3', 'test-kid-5', 'science', 'פיזיקה', 7, 10, 8),
  createMockSession('ts5-4', 'test-kid-5', 'science', 'גוף האדם', 6, 10, 11),
  createMockSession('ts5-5', 'test-kid-5', 'english', 'הבנת הנקרא', 7, 10, 14),
  createMockSession('ts5-6', 'test-kid-5', 'english', 'דקדוק', 6, 10, 17),
  createMockSession('ts5-7', 'test-kid-5', 'history', 'היסטוריה של ישראל', 7, 10, 20),
  createMockSession('ts5-8', 'test-kid-5', 'history', 'יוון העתיקה', 7, 10, 23),
  createMockSession('ts5-9', 'test-kid-5', 'bible', 'ספר בראשית', 7, 10, 26),
  createMockSession('ts5-10', 'test-kid-5', 'bible', 'הנביאים', 6, 10, 29)
];

// ==========================================
// EXPORTS
// ==========================================

/**
 * All test kid profiles
 */
export const TEST_KIDS: ChildProfile[] = [
  TEST_KID_1_PROFILE,
  TEST_KID_2_PROFILE,
  TEST_KID_3_PROFILE,
  TEST_KID_4_PROFILE,
  TEST_KID_5_PROFILE
];

/**
 * Learner profiles for test kids (map for O(1) lookup)
 */
export const TEST_LEARNER_PROFILES: Record<string, LearnerProfile> = {
  'test-kid-1': TEST_KID_1_LEARNER,
  'test-kid-2': TEST_KID_2_LEARNER,
  'test-kid-3': TEST_KID_3_LEARNER,
  'test-kid-4': TEST_KID_4_LEARNER,
  'test-kid-5': TEST_KID_5_LEARNER
};

/**
 * All mock sessions for test kids
 */
export const TEST_SESSIONS: StudySession[] = [
  ...TEST_KID_1_SESSIONS,
  ...TEST_KID_2_SESSIONS,
  ...TEST_KID_3_SESSIONS,
  ...TEST_KID_4_SESSIONS,
  ...TEST_KID_5_SESSIONS
];

/**
 * Mock upcoming tests for test kids
 */
export const TEST_UPCOMING_TESTS: UpcomingTest[] = [
  // Math genius has history test coming up
  {
    id: 'test-upcoming-1',
    childId: 'test-kid-2',
    subjectId: 'history',
    date: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
    topics: ['יוון העתיקה', 'מלחמות העולם'],
    numQuestions: 15,
    type: 'quiz',
    familyId: 'test-family'
  },
  // Declining kid has math test
  {
    id: 'test-upcoming-2',
    childId: 'test-kid-4',
    subjectId: 'math',
    date: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
    topics: ['כפל', 'שברים'],
    numQuestions: 20,
    type: 'quiz',
    familyId: 'test-family'
  },
  // All-rounder has bible test
  {
    id: 'test-upcoming-3',
    childId: 'test-kid-5',
    subjectId: 'bible',
    date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    topics: ['ספר בראשית'],
    numQuestions: 10,
    type: 'quiz',
    familyId: 'test-family'
  }
];
