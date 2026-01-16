
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
}

export interface AppState {
  children: ChildProfile[];
  subjects: Subject[];
  sessions: StudySession[];
  upcomingTests: UpcomingTest[];
  isLoading: boolean;
}
