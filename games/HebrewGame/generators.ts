/**
 * Question generators for each Hebrew game mode
 */

import { GAME_DATA, LETTERS, VOWELS, FINAL_LETTERS } from '../hebrewData';
import { GameSettings } from '../../types';
import { GameQuestion, GameMode } from './types';

/**
 * Shuffle an array (Fisher-Yates)
 */
const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Get vowels filtered by settings
 */
const getActiveVowels = (settings: GameSettings) => {
  const filtered = VOWELS.filter(v => settings.allowedVowels.includes(v.name));
  return filtered.length > 0 ? filtered : VOWELS;
};

/**
 * Get game data filtered by allowed categories
 */
const getActiveGameData = (settings: GameSettings) => {
  const filtered = GAME_DATA.filter(w => settings.allowedCategories.includes(w.category));
  return filtered.length > 0 ? filtered : GAME_DATA;
};

/**
 * Generate a similar vowel question
 * Find letters with the same vowel (niqqud)
 */
export const generateSimilarVowel = (settings: GameSettings): GameQuestion => {
  const activeVowels = getActiveVowels(settings);

  // Pick a random vowel and target letter
  const vowel = activeVowels[Math.floor(Math.random() * activeVowels.length)];
  const targetLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const questionText = targetLetter + vowel.char;

  // Generate correct answer (different letter, same vowel)
  let correctLetter = targetLetter;
  while (correctLetter === targetLetter) {
    correctLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  const correctAnswer = correctLetter + vowel.char;

  // Generate distractors (different vowels for contrast)
  const distractors: string[] = [];
  while (distractors.length < 3) {
    const randLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const randVowel = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    if (randVowel.name !== vowel.name) {
      distractors.push(randLetter + randVowel.char);
    }
  }

  return {
    type: 'similar',
    prompt: questionText,
    correct: correctAnswer,
    options: shuffle([correctAnswer, ...distractors]),
    instruction: 'מצאו את האות עם אותו הניקוד!'
  };
};

/**
 * Generate a picture matching question
 * Match word to emoji
 */
export const generatePictureWord = (settings: GameSettings): GameQuestion => {
  const activeData = getActiveGameData(settings);
  const item = activeData[Math.floor(Math.random() * activeData.length)];

  // Distractors: 3 other emojis
  const distractors: string[] = [];
  while (distractors.length < 3) {
    const d = GAME_DATA[Math.floor(Math.random() * GAME_DATA.length)];
    if (d.word !== item.word && !distractors.includes(d.emoji)) {
      distractors.push(d.emoji);
    }
  }

  return {
    type: 'pictures',
    prompt: item.word,
    correct: item.emoji,
    options: shuffle([item.emoji, ...distractors]),
    instruction: 'איזו תמונה מתאימה למילה?'
  };
};

/**
 * Generate a missing letter question
 * Find the missing first letter of a word
 */
export const generateMissingLetter = (settings: GameSettings): GameQuestion => {
  const activeData = getActiveGameData(settings);
  const item = activeData[Math.floor(Math.random() * activeData.length)];
  const word = item.word;

  let missingChar = word[0];
  let displayWord = '_';

  // Match first letter group (letter + niqqud)
  const match = word.match(/^([\u05D0-\u05EA][\u05B0-\u05C2]*)/);
  if (match) {
    const fullFirstLetterGroup = match[0];
    missingChar = fullFirstLetterGroup;
    displayWord = '_' + word.substring(fullFirstLetterGroup.length);
  } else {
    displayWord = '_' + word.substring(1);
  }

  // Distractors
  const activeVowels = getActiveVowels(settings);
  const distractors: string[] = [];
  while (distractors.length < 3) {
    const l = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const v = activeVowels[Math.floor(Math.random() * activeVowels.length)];
    const d = l + v.char;
    if (d !== missingChar) distractors.push(d);
  }

  return {
    type: 'missing',
    prompt: displayWord,
    correct: missingChar,
    options: shuffle([missingChar, ...distractors]),
    hint: settings.showMissingLetterHint ? item.emoji : null,
    instruction: 'איזו אות חסרה בהתחלה?'
  };
};

/**
 * Generate an opening sound question
 * Identify the first letter of a word (shown as emoji)
 */
export const generateOpeningSound = (settings: GameSettings): GameQuestion => {
  const activeData = getActiveGameData(settings);
  const item = activeData[Math.floor(Math.random() * activeData.length)];

  // First character is the base letter
  const baseLetter = item.word.charAt(0);

  const distractors: string[] = [];
  while (distractors.length < 3) {
    const l = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    if (l !== baseLetter && !distractors.includes(l)) {
      distractors.push(l);
    }
  }

  return {
    type: 'opening',
    prompt: item.emoji,
    wordForAudio: item.word,
    correct: baseLetter,
    fullWord: item.word,
    options: shuffle([baseLetter, ...distractors]),
    instruction: 'באיזו אות מתחילה המילה?'
  };
};

/**
 * Generate a closing sound question
 * Identify the last letter of a word (shown as emoji)
 */
export const generateClosingSound = (settings: GameSettings): GameQuestion => {
  const activeData = getActiveGameData(settings);
  const item = activeData[Math.floor(Math.random() * activeData.length)];

  // Match last letter group
  const match = item.word.match(/([\u05D0-\u05EA][\u05B0-\u05C2]*)$/);
  const lastGroup = match ? match[0] : item.word.slice(-1);

  const distractors: string[] = [];
  while (distractors.length < 3) {
    const fl = FINAL_LETTERS[Math.floor(Math.random() * FINAL_LETTERS.length)];
    if (fl !== lastGroup && !distractors.includes(fl)) {
      distractors.push(fl);
    }
  }
  // Fill remaining with regular letters if needed
  while (distractors.length < 3) {
    const l = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    if (!distractors.includes(l)) {
      distractors.push(l);
    }
  }

  return {
    type: 'closing',
    prompt: item.emoji,
    wordForAudio: item.word,
    correct: lastGroup,
    fullWord: item.word,
    options: shuffle([lastGroup, ...distractors.slice(0, 3)]),
    instruction: 'באיזו אות מסתיימת המילה?'
  };
};

/**
 * Generate a speed challenge question
 * Fast word-to-emoji matching
 */
export const generateSpeedChallenge = (settings: GameSettings): GameQuestion => {
  const activeData = getActiveGameData(settings);
  const item = activeData[Math.floor(Math.random() * activeData.length)];

  const distractors: string[] = [];
  while (distractors.length < 2) {
    const d = activeData[Math.floor(Math.random() * activeData.length)];
    if (d.word !== item.word && !distractors.includes(d.word)) {
      distractors.push(d.word);
    }
  }

  return {
    type: 'speed',
    prompt: item.emoji,
    correct: item.word,
    options: shuffle([item.word, ...distractors]),
    instruction: 'מהר! איזו מילה מתאימה?'
  };
};

/**
 * Generate a question for the given game mode
 */
export const generateQuestion = (mode: GameMode, settings: GameSettings): GameQuestion | null => {
  switch (mode) {
    case 'similar': return generateSimilarVowel(settings);
    case 'pictures': return generatePictureWord(settings);
    case 'missing': return generateMissingLetter(settings);
    case 'opening': return generateOpeningSound(settings);
    case 'closing': return generateClosingSound(settings);
    case 'speed': return generateSpeedChallenge(settings);
    default: return null;
  }
};
