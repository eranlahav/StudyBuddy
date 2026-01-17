
import { Subject, GameSettings } from "./types";

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

// Note: Mock children removed - families create their own children with proper familyId
