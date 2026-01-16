import { QuizQuestion, DictationMode } from "../types";

const HEBREW_LETTERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 
  'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'
];

/**
 * Generates quiz questions from a specific list of words.
 */
export const generateDictationQuestions = (
  words: string[], 
  mode: DictationMode = 'recognition'
): QuizQuestion[] => {
  
  return words.map(word => {
    if (mode === 'recognition') {
      return createRecognitionQuestion(word, words);
    } else {
      return createSpellingQuestion(word);
    }
  });
};

const createRecognitionQuestion = (targetWord: string, allWords: string[]): QuizQuestion => {
  // Distractors: Pick 3 other words from the list, or generate dummy ones if list is short
  let distractors = allWords.filter(w => w !== targetWord);
  
  // If we don't have enough real words, create variations
  while (distractors.length < 3) {
    distractors.push(modifyWord(targetWord));
  }
  
  // Shuffle and slice to get 3
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
};

const createSpellingQuestion = (targetWord: string): QuizQuestion => {
  // Remove a random letter (ensure it's not a space or niqqud if existing)
  // Simple approach: assume plain hebrew text
  const cleanWord = targetWord.replace(/[^\u05D0-\u05EA]/g, ''); // keep only letters
  if (cleanWord.length === 0) return createRecognitionQuestion(targetWord, [targetWord]); // Fallback

  const randomIndex = Math.floor(Math.random() * cleanWord.length);
  const hiddenLetter = cleanWord[randomIndex];
  
  // Construct display word with underscore
  // We need to match the original string index roughly if cleanWord is different, 
  // but for this MVP let's assume input is standard letters.
  const splitWord = targetWord.split('');
  splitWord[randomIndex] = '_';
  const questionText = `השלימו את האות החסרה: ${splitWord.join('')}`;

  // Distractors: Random Hebrew letters
  const distractors = [];
  while(distractors.length < 3) {
    const l = HEBREW_LETTERS[Math.floor(Math.random() * HEBREW_LETTERS.length)];
    if (l !== hiddenLetter && !distractors.includes(l)) {
      distractors.push(l);
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
};

const modifyWord = (word: string): string => {
  // Simple modification: change one letter to make a fake word
  const arr = word.split('');
  const idx = Math.floor(Math.random() * arr.length);
  arr[idx] = HEBREW_LETTERS[Math.floor(Math.random() * HEBREW_LETTERS.length)];
  return arr.join('');
};

const shuffle = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};
