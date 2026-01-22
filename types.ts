// ==========================================
// MULTI-TENANT AUTH TYPES
// ==========================================

/**
 * Family (tenant) - Groups parents and children together
 */
export interface Family {
  id: string;
  name: string;                  // e.g., "משפחת לבב"
  createdAt: number;
  createdBy: string;             // Parent UID who created the family
  parentIds: string[];           // Array of parent UIDs in this family
}

/**
 * Parent (authenticated user via Google)
 */
export interface Parent {
  id: string;                    // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  familyId: string;
  isSuperAdmin: boolean;         // true for lahavfamily02@gmail.com
  createdAt: number;
  lastLoginAt: number;
  blocked?: boolean;             // If true, access is denied (removed from family)
  blockedAt?: number;            // Timestamp when blocked
}

/**
 * Invite status for tracking invite lifecycle
 */
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

/**
 * Invite - Signup link for new users
 */
export interface Invite {
  id: string;
  code: string;                  // 8-char unique code
  email: string;                 // Invited email
  familyId: string;
  familyName: string;            // For display in signup page
  createdBy: string;             // Parent UID who created invite
  createdAt: number;
  expiresAt: number;             // +7 days from creation
  status: InviteStatus;
  usedBy?: string;               // Parent UID who used the invite
  usedAt?: number;
}

/**
 * Super admin email - the only user who can create families and invites
 */
export const SUPER_ADMIN_EMAIL = 'lahavfamily02@gmail.com';

// ==========================================
// EDUCATION TYPES
// ==========================================

export enum GradeLevel {
  Grade1 = 'כיתה א\'',
  Grade2 = 'כיתה ב\'',
  Grade3 = 'כיתה ג\'',
  Grade4 = 'כיתה ד\'',
  Grade5 = 'כיתה ה\'',
  Grade6 = 'כיתה ו\'',
  Grade7 = 'כיתה ז\'',
  Grade8 = 'כיתה ח\'',
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface GameSettings {
  allowedVowels: string[]; // IDs of vowels enabled
  showMissingLetterHint: boolean; // Show emoji in missing letter game
  speedChallengeSeconds: number; // Duration per question
  allowedCategories: string[]; // Filter for word-based games
  enableTTS: boolean; // Allow text-to-speech in closing letter game
  enableTTSOpening: boolean; // Allow text-to-speech in opening letter game
}

export interface ChildProfile {
  id: string;
  name: string;
  grade: GradeLevel;
  avatar: string; // Emoji or generic avatar ID
  stars: number;
  streak: number;
  subjects: string[]; // List of subject IDs enabled for this child
  proficiency: Record<string, DifficultyLevel>; // subjectId -> difficulty
  gameSettings?: GameSettings; // Optional for backward compatibility, but we will seed default
  showGames?: boolean; // Whether to show games section in child dashboard
  birthdate?: number; // Optional timestamp for child's birthdate
  // Multi-tenant fields
  familyId: string;              // Tenant isolation
  pinHash: string;               // bcrypt hash of 4-digit PIN
  createdAt: number;
  createdBy: string;             // Parent UID who created this child
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  topics: string[]; // e.g., ["Fractions", "Geometry"] for Math
}

export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number; // 0-3
  explanation: string;
  tip?: string; // Hint for the question
  difficulty: DifficultyLevel;
  audioText?: string; // Optional: Text to be spoken via TTS when question loads (for Dictation)
}

export interface StudySession {
  id: string;
  childId: string;
  subjectId: string;
  topic: string;
  date: number; // Timestamp
  score: number;
  totalQuestions: number;
  questions: QuizQuestion[];
  userAnswers?: number[]; // Index of selected option for each question

  // New fields for Final Review
  isFinalReview?: boolean;
  recommendations?: string[]; // 3 tips for the exam
  readinessScore?: number; // 0-100 calculated score

  // Multi-tenant field
  familyId: string;
}

export type TestType = 'quiz' | 'dictation';
export type DictationMode = 'recognition' | 'spelling';

export interface UpcomingTest {
  id: string;
  childId: string;
  subjectId: string;
  date: number; // Timestamp
  topics: string[]; // Topics to study for this test (or the Title for dictation)
  numQuestions?: number; // Number of questions per session

  // New Dictation Fields
  type?: TestType;
  dictationWords?: string[];
  dictationMode?: DictationMode;

  // Multi-tenant field
  familyId: string;
}

export interface AppState {
  children: ChildProfile[];
  subjects: Subject[];
  sessions: StudySession[];
  upcomingTests: UpcomingTest[];
  evaluations: Evaluation[];
  isLoading: boolean;
}

// ==========================================
// EVALUATION TYPES
// ==========================================

/**
 * Type of evaluation document
 */
export type EvaluationType = 'rubric' | 'proficiency_summary' | 'test' | 'other';

/**
 * Hebrew proficiency levels from school evaluation forms
 * Maps to difficulty recommendations for study planning
 */
export type ProficiencyLevel =
  | 'שולט/ת היטב'
  | 'שולט/ת'
  | 'שולט/ת באופן חלקי'
  | 'דרוש חיזוק ותרגול';

/**
 * Maps proficiency level to study difficulty recommendation
 */
export function proficiencyToDifficulty(level: ProficiencyLevel): DifficultyLevel {
  switch (level) {
    case 'שולט/ת היטב':
      return 'hard';
    case 'שולט/ת':
      return 'medium';
    case 'שולט/ת באופן חלקי':
    case 'דרוש חיזוק ותרגול':
      return 'easy';
    default:
      return 'medium';
  }
}

/**
 * Extracted skill from proficiency summary documents
 */
export interface ExtractedSkill {
  name: string;                    // e.g., "הבנת הנקרא"
  level: ProficiencyLevel;
  suggestedDifficulty: DifficultyLevel;
}

/**
 * Extracted question from traditional test documents
 */
export interface ExtractedQuestion {
  questionNumber: number;
  topic?: string;
  score: number;
  maxScore: number;
  isCorrect: boolean;
}

/**
 * School test/evaluation uploaded and analyzed by AI
 */
export interface Evaluation {
  id: string;
  childId: string;
  familyId: string;

  // Metadata
  date: number;                    // Test date (user can edit)
  uploadedAt: number;              // When uploaded
  subject: string;                 // Matched subject ID
  subjectName: string;             // Display name
  testName: string;                // e.g., "מבדק כפל וחילוק"
  testType: EvaluationType;
  schoolTerm?: string;             // e.g., "מחצית א'"
  teacherName?: string;
  teacherComments?: string;

  // Scores
  totalScore?: number;             // e.g., 76
  maxScore?: number;               // e.g., 100
  percentage?: number;

  // Extracted data
  skills?: ExtractedSkill[];       // For proficiency summaries
  questions?: ExtractedQuestion[]; // For traditional tests
  weakTopics: string[];            // Topics needing reinforcement
  strongTopics: string[];          // Topics mastered

  // Storage
  fileUrls: string[];              // Firebase Storage URLs
  fileNames: string[];

  // AI processing
  rawOcrText?: string;             // Full OCR for reference
  aiConfidence?: number;           // 0-100
  parentEdited: boolean;           // True if parent made corrections
}

// ==========================================
// LEARNER PROFILE TYPES
// ==========================================

/**
 * BKT (Bayesian Knowledge Tracing) parameters
 * Controls how mastery probability updates based on responses
 */
export interface BKTParams {
  pInit: number;   // Initial mastery probability (0.1-0.3)
  pLearn: number;  // Learning rate per question (0.15-0.3)
  pGuess: number;  // Probability of correct guess (0.2-0.25)
  pSlip: number;   // Probability of slip/mistake (0.05-0.15)
}

/**
 * Mastery tracking for a single topic
 */
export interface TopicMastery {
  // Identification
  topic: string;
  subjectId: string;

  // BKT state
  pKnown: number;              // 0-1, current mastery probability
  attempts: number;            // Total questions answered

  // Performance aggregates
  correctCount: number;
  incorrectCount: number;
  averageTime: number;         // Seconds per question (Phase 4+)

  // Trend detection
  recentTrend: 'improving' | 'stable' | 'declining';
  performanceWindow: number[]; // Last 10 attempts (1=correct, 0=incorrect)

  // Timestamps
  firstAttempt: number;
  lastAttempt: number;

  // Extensible (Phase 4+)
  speed?: number;              // Optional: questions/minute
  consistency?: number;        // Optional: 1 - variance
  questionTypeBreakdown?: Record<string, number>;  // Optional
}

/**
 * Complete learner profile for a child
 * Stored at /children/{childId}/learnerProfile/main
 */
export interface LearnerProfile {
  // Identity
  childId: string;
  familyId: string;

  // Topic-level tracking (map for O(1) lookups)
  topicMastery: Record<string, TopicMastery>;

  // Global metadata
  totalQuizzes: number;
  totalQuestions: number;
  lastUpdated: number;

  // Version for schema migrations
  version: number;  // Start at 1
}

/**
 * Mastery level categories for UI display
 */
export type MasteryLevel = 'mastered' | 'learning' | 'weak';

/**
 * Get mastery level from pKnown probability
 */
export function getMasteryLevel(pKnown: number): MasteryLevel {
  if (pKnown >= 0.8) return 'mastered';
  if (pKnown >= 0.5) return 'learning';
  return 'weak';
}

// ==========================================
// ADAPTIVE QUIZ TYPES (Phase 2)
// ==========================================

/**
 * Classification of topics by mastery level
 * Used by adaptive quiz service for difficulty mixing
 */
export interface TopicClassification {
  weak: string[];       // pKnown < 0.5
  learning: string[];   // pKnown 0.5-0.8
  mastered: string[];   // pKnown >= 0.8
}

/**
 * Result of difficulty mixing algorithm
 * Determines which topics to include in quiz
 */
export interface DifficultyMix {
  reviewTopics: string[];    // 20% - mastered topics (spaced retrieval)
  targetTopics: string[];    // 50% - current level (learning zone)
  weakTopics: string[];      // 30% - struggling topics (capped if frustration)
  questionCount: number;     // Final count (may be less if topics exhausted)
}

/**
 * Request for generating a single profile-aware question
 * Passed to Gemini for targeted difficulty generation
 */
export interface QuestionRequest {
  topic: string;
  masteryPercentage: number;  // 0-100, from BKT pKnown * 100
  targetDifficulty: DifficultyLevel;
}
