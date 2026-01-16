
import { GradeLevel, Subject, ChildProfile, UpcomingTest, GameSettings } from "./types";

export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'חשבון',
    icon: '🧮',
    color: 'bg-blue-500',
    topics: ['חיבור', 'חיסור', 'כפל', 'חילוק', 'שברים', 'הנדסה']
  },
  {
    id: 'science',
    name: 'מדעים',
    icon: '🧬',
    color: 'bg-green-500',
    topics: ['בעלי חיים', 'צמחים', 'חלל', 'גוף האדם', 'מזג האוויר', 'פיזיקה']
  },
  {
    id: 'english',
    name: 'אנגלית',
    icon: '📚',
    color: 'bg-yellow-500',
    topics: ['דקדוק', 'אוצר מילים', 'הבנת הנקרא', 'כתיב']
  },
  {
    id: 'history',
    name: 'היסטוריה',
    icon: '🌍',
    color: 'bg-amber-700',
    topics: ['יוון העתיקה', 'מלחמות העולם', 'היסטוריה של ישראל', 'מגלי עולם']
  },
  {
    id: 'bible',
    name: 'תנ״ך',
    icon: '📜',
    color: 'bg-orange-500',
    topics: ['ספר בראשית', 'יציאת מצרים', 'דוד המלך', 'הנביאים']
  }
];

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  allowedVowels: ['kamatz', 'patach', 'tzeire', 'segol', 'hiriq', 'holam', 'qubuts', 'shva'],
  showMissingLetterHint: true,
  speedChallengeSeconds: 4,
  allowedCategories: ['animals', 'food', 'objects', 'transport', 'nature'],
  enableTTS: false,
  enableTTSOpening: false
};

export const MOCK_CHILDREN: ChildProfile[] = [
  {
    id: 'romi',
    name: 'רומי',
    grade: GradeLevel.Grade6,
    avatar: '👩‍🚀',
    stars: 120,
    streak: 5,
    subjects: ['math', 'science', 'english'],
    proficiency: {
      math: 'hard',
      science: 'medium',
      english: 'medium'
    }
  },
  {
    id: 'adam',
    name: 'אדם',
    grade: GradeLevel.Grade3,
    avatar: '🦸‍♂️',
    stars: 650,
    streak: 7,
    subjects: ['math', 'english'],
    proficiency: {
      math: 'medium',
      english: 'easy'
    }
  },
  {
    id: 'uri',
    name: 'אורי',
    grade: GradeLevel.Grade1,
    avatar: '🦁',
    stars: 40,
    streak: 1,
    subjects: ['english', 'math'],
    proficiency: {
      math: 'easy',
      english: 'easy'
    },
    gameSettings: {
      ...DEFAULT_GAME_SETTINGS,
      allowedVowels: ['kamatz', 'patach', 'hiriq'], // Uri is young, maybe only knows these
      speedChallengeSeconds: 10 // Slower for younger kid
    }
  }
];

export const MOCK_TESTS: UpcomingTest[] = []; // Empty to prevent auto-seeding

export const INITIAL_STATE = {
  children: MOCK_CHILDREN,
  subjects: DEFAULT_SUBJECTS,
  sessions: [],
  upcomingTests: MOCK_TESTS
};
