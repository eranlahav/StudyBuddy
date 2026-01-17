/**
 * Dictation Service for Hebrew Word Exercises
 *
 * Generates offline quiz questions for dictation practice:
 * - Recognition mode: Listen and pick the correct word
 * - Spelling mode: Fill in the missing letter
 */

import { QuizQuestion, DictationMode } from "../types";
import { shuffle } from "../lib";

const HEBREW_LETTERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'
];

/**
 * Generate quiz questions from a list of words for dictation practice
 *
 * @param words - Array of Hebrew words to practice
 * @param mode - 'recognition' (audio → pick word) or 'spelling' (fill missing letter)
 */
export function generateDictationQuestions(
  words: string[],
  mode: DictationMode = 'recognition'
): QuizQuestion[] {
  return words.map(word => {
    if (mode === 'recognition') {
      return createRecognitionQuestion(word, words);
    } else {
      return createSpellingQuestion(word);
    }
  });
}

/**
 * Create a recognition question where the student listens and picks the word
 */
function createRecognitionQuestion(targetWord: string, allWords: string[]): QuizQuestion {
  // Distractors: Pick 3 other words from the list, or generate dummy ones if list is short
  let distractors = allWords.filter(w => w !== targetWord);

  // If we don't have enough real words, create variations
  while (distractors.length < 3) {
    distractors.push(modifyWord(targetWord));
  }

  // Shuffle and slice to get 3 distractors
  distractors = shuffle(distractors).slice(0, 3);

  const options = shuffle([targetWord, ...distractors]);
  const correctIndex = options.indexOf(targetWord);

  return {
    questionText: "הקשיבו ובחרו את המילה הנכונה",
    audioText: targetWord, // This triggers TTS
    options: options,
    correctAnswerIndex: correctIndex,
    explanation: `המילה הנכונה היא: ${targetWord}`,
    difficulty: 'medium',
    tip: 'הקשיבו לצלילים הפותחים והסוגרים'
  };
}

/**
 * Create a spelling question where the student fills in the missing letter
 */
function createSpellingQuestion(targetWord: string): QuizQuestion {
  // Remove a random letter (ensure it's not a space or niqqud if existing)
  // Simple approach: assume plain hebrew text
  const cleanWord = targetWord.replace(/[^\u05D0-\u05EA]/g, ''); // keep only letters

  if (cleanWord.length === 0) {
    // Fallback to recognition if word has no standard letters
    return createRecognitionQuestion(targetWord, [targetWord]);
  }

  const randomIndex = Math.floor(Math.random() * cleanWord.length);
  const hiddenLetter = cleanWord[randomIndex];

  // Construct display word with underscore
  const splitWord = targetWord.split('');
  splitWord[randomIndex] = '_';
  const questionText = `השלימו את האות החסרה: ${splitWord.join('')}`;

  // Distractors: Random Hebrew letters (not the correct one)
  const distractors: string[] = [];
  while (distractors.length < 3) {
    const letter = HEBREW_LETTERS[Math.floor(Math.random() * HEBREW_LETTERS.length)];
    if (letter !== hiddenLetter && !distractors.includes(letter)) {
      distractors.push(letter);
    }
  }

  const options = shuffle([hiddenLetter, ...distractors]);

  return {
    questionText: questionText,
    options: options,
    correctAnswerIndex: options.indexOf(hiddenLetter),
    explanation: `המילה היא ${targetWord}, האות החסרה היא ${hiddenLetter}`,
    difficulty: 'medium',
    tip: 'נסו להגיד את המילה בקול'
  };
}

/**
 * Modify a word slightly to create a distractor
 * Changes one random letter to create a fake but plausible word
 */
function modifyWord(word: string): string {
  const arr = word.split('');
  const idx = Math.floor(Math.random() * arr.length);
  arr[idx] = HEBREW_LETTERS[Math.floor(Math.random() * HEBREW_LETTERS.length)];
  return arr.join('');
}
