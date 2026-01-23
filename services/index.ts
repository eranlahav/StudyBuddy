/**
 * Services index
 *
 * Re-exports all data services for convenient imports:
 * import { addChild, addSession, addTest } from '@/services';
 */

// Authentication
export {
  signInWithGoogle,
  signOut,
  subscribeToAuthState,
  getCurrentUser
} from './authService';

// Parents
export {
  getParent,
  createParent,
  updateLastLogin,
  updateParent,
  subscribeToParent,
  isSuperAdmin,
  isSuperAdminEmail,
  getParentsByIds,
  blockParent,
  unblockParent
} from './parentService';

// Families
export {
  getFamily,
  createFamily,
  addParentToFamily,
  updateFamilyName,
  subscribeToFamily,
  getAllFamilies,
  removeParentFromFamily,
  updateFamily
} from './familyService';

// Invites
export {
  createInvite,
  getInviteByCode,
  getInvite,
  validateInviteCode,
  acceptInvite,
  revokeInvite,
  getAllInvites,
  getFamilyInvites,
  subscribeToInvites,
  hasPendingInvite,
  getInviteUrl
} from './inviteService';

// PIN
export {
  hashPin,
  verifyPin,
  isValidPinFormat,
  hasPinSet,
  clearAttempts,
  getRemainingAttempts,
  isLockedOut
} from './pinService';

// Children
export {
  subscribeToChildren,
  addChild,
  updateChild,
  deleteChild,
  resetChildStats,
  awardPoints
} from './childrenService';

// Sessions
export {
  subscribeToSessions,
  addSession,
  filterSessionsByChild,
  filterSessionsBySubject,
  calculateStats
} from './sessionsService';

// Tests
export {
  subscribeToTests,
  addTest,
  updateTest,
  deleteTest,
  filterTestsByChild,
  filterTestsBySubject,
  filterTestsByDateRange,
  getUpcomingTests,
  getNextTest
} from './testsService';

// Subjects
export {
  subscribeToSubjects,
  addSubject,
  deleteSubject,
  seedSubjects,
  findSubjectById,
  getSubjectTopics
} from './subjectsService';

// AI Services (existing)
export {
  generateQuizQuestions,
  generateExamRecommendations,
  analyzeMistakesAndGenerateTopics,
  extractTopicsFromInput
} from './geminiService';

// Dictation (existing)
export { generateDictationQuestions } from './dictationService';

// Storage (Firebase Storage for files)
export {
  uploadEvaluationFiles,
  deleteEvaluationFiles,
  fileToBase64,
  getMimeType,
  isSupportedFileType,
  StorageError
} from './storageService';

// Evaluations
export {
  subscribeToEvaluations,
  subscribeToChildEvaluations,
  addEvaluation,
  updateEvaluation,
  deleteEvaluation,
  filterEvaluationsByChild,
  filterEvaluationsBySubject,
  filterEvaluationsByDateRange,
  calculateEvaluationStats,
  getEvaluationTrendData
} from './evaluationsService';

// AI Document Analysis
export { analyzeEvaluationDocument } from './geminiService';
export type { EvaluationAnalysisResult } from './geminiService';

// Statistics
export {
  getFamilyStats,
  getChildStats
} from './statsService';
export type { FamilyStats, ChildStats } from './statsService';

// Profile & Learning Signals
export {
  getProfile,
  updateProfile,
  subscribeToProfile,
  initializeProfile
} from './profileService';

export {
  processQuizSignal,
  bootstrapProfile
} from './signalService';

// Adaptive Quiz (Phase 2)
export {
  classifyTopics,
  mixDifficulty,
  orderTopics,
  getOrderedTopics,
  hasProfileData
} from './adaptiveQuizService';

// Recommendation Engine (Phase 3)
export {
  scoreTopic,
  generateRecommendations,
  recordOverride
} from './recommendationService';
