/**
 * Tests for services/dictationService.ts
 *
 * Tests the dictation quiz question generation for both recognition and spelling modes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateDictationQuestions } from './dictationService';

describe('generateDictationQuestions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recognition mode', () => {
    it('generates one question per word', () => {
      const words = ['שלום', 'בוקר', 'ערב'];
      const questions = generateDictationQuestions(words, 'recognition');

      expect(questions).toHaveLength(3);
    });

    it('creates questions with correct structure', () => {
      const words = ['שלום', 'בוקר', 'ערב', 'לילה'];
      const questions = generateDictationQuestions(words, 'recognition');

      questions.forEach(q => {
        expect(q.questionText).toBe('הקשיבו ובחרו את המילה הנכונה');
        expect(q.options).toHaveLength(4);
        expect(q.correctAnswerIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctAnswerIndex).toBeLessThan(4);
        expect(q.audioText).toBeTruthy();
        expect(q.explanation).toContain('המילה הנכונה היא');
        expect(q.difficulty).toBe('medium');
        expect(q.tip).toBeTruthy();
      });
    });

    it('includes target word in options', () => {
      const words = ['שלום', 'בוקר', 'ערב', 'לילה'];
      const questions = generateDictationQuestions(words, 'recognition');

      questions.forEach((q, i) => {
        const targetWord = words[i];
        expect(q.options).toContain(targetWord);
        expect(q.options[q.correctAnswerIndex]).toBe(targetWord);
      });
    });

    it('sets audioText to target word for TTS', () => {
      const words = ['שלום'];
      const questions = generateDictationQuestions(words, 'recognition');

      expect(questions[0].audioText).toBe('שלום');
    });

    it('handles short word lists by generating distractors', () => {
      const words = ['שלום']; // Only 1 word
      const questions = generateDictationQuestions(words, 'recognition');

      expect(questions[0].options).toHaveLength(4);
      expect(questions[0].options).toContain('שלום');
    });

    it('defaults to recognition mode when mode is not specified', () => {
      const words = ['שלום'];
      const questions = generateDictationQuestions(words);

      expect(questions[0].questionText).toBe('הקשיבו ובחרו את המילה הנכונה');
      expect(questions[0].audioText).toBe('שלום');
    });
  });

  describe('spelling mode', () => {
    let randomCallCount: number;

    beforeEach(() => {
      // Create a mock that returns incrementing values to avoid infinite loops
      // when generating unique distractors
      randomCallCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        randomCallCount++;
        // Return values that cycle through different indices
        // to ensure unique letter selection for distractors
        return (randomCallCount * 0.05) % 1;
      });
    });

    it('generates one question per word', () => {
      const words = ['שלום', 'בוקר'];
      const questions = generateDictationQuestions(words, 'spelling');

      expect(questions).toHaveLength(2);
    });

    it('creates questions asking to fill missing letter', () => {
      const words = ['שלום'];
      const questions = generateDictationQuestions(words, 'spelling');

      expect(questions[0].questionText).toContain('השלימו את האות החסרה');
      expect(questions[0].questionText).toContain('_');
    });

    it('provides 4 letter options', () => {
      const words = ['שלום'];
      const questions = generateDictationQuestions(words, 'spelling');

      expect(questions[0].options).toHaveLength(4);
      // All options should be single Hebrew letters
      questions[0].options.forEach(opt => {
        expect(opt).toHaveLength(1);
      });
    });

    it('includes correct letter in options', () => {
      const words = ['שלום'];
      const questions = generateDictationQuestions(words, 'spelling');

      const correctLetter = questions[0].options[questions[0].correctAnswerIndex];
      expect(correctLetter).toHaveLength(1);
    });

    it('includes explanation with correct word and letter', () => {
      const words = ['שלום'];
      const questions = generateDictationQuestions(words, 'spelling');

      expect(questions[0].explanation).toContain('המילה היא שלום');
      expect(questions[0].explanation).toContain('האות החסרה היא');
    });

    it('sets medium difficulty', () => {
      const words = ['שלום'];
      const questions = generateDictationQuestions(words, 'spelling');

      expect(questions[0].difficulty).toBe('medium');
    });

    it('includes helpful tip', () => {
      const words = ['שלום'];
      const questions = generateDictationQuestions(words, 'spelling');

      expect(questions[0].tip).toBe('נסו להגיד את המילה בקול');
    });
  });

  describe('edge cases', () => {
    it('handles empty word list', () => {
      const questions = generateDictationQuestions([], 'recognition');

      expect(questions).toHaveLength(0);
    });

    it('handles single letter words in spelling mode', () => {
      // Use incrementing random for unique distractor generation
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        return (callCount * 0.05) % 1;
      });

      const words = ['א']; // Single letter
      const questions = generateDictationQuestions(words, 'spelling');

      expect(questions).toHaveLength(1);
      expect(questions[0].options).toHaveLength(4);
    });

    it('handles words with multiple identical letters', () => {
      // Use incrementing random for unique distractor generation
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        return (callCount * 0.05) % 1;
      });

      const words = ['אבא']; // Has two 'א'
      const questions = generateDictationQuestions(words, 'spelling');

      expect(questions).toHaveLength(1);
    });
  });
});
