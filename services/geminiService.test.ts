/**
 * Tests for services/geminiService.ts
 *
 * Tests AI-powered quiz generation and analysis features:
 * - Quiz question generation
 * - Exam recommendations
 * - Mistake analysis
 * - Topic extraction from images/text
 * - Error handling and retry integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { QuizQuestion, GradeLevel } from '../types';

// Track hasApiKey mock state
let mockHasApiKey = true;

// Mock hasApiKey and logger from lib BEFORE other imports
vi.mock('../lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib')>();
  return {
    ...actual,
    hasApiKey: vi.fn(() => mockHasApiKey),
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    // Simplify retry to just call the function directly for testing
    retry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  };
});

// Mock Gemini API - use a shared object that can be modified in tests
const mockState = {
  generateContentResponse: null as unknown,
  generateContentError: null as Error | null,
};

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: vi.fn(async () => {
        if (mockState.generateContentError) {
          throw mockState.generateContentError;
        }
        return mockState.generateContentResponse;
      }),
    };
    constructor(_config: { apiKey: string }) {
      // Constructor
    }
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {
      ARRAY: 'array',
      OBJECT: 'object',
      STRING: 'string',
      INTEGER: 'integer',
      NUMBER: 'number',
    },
  };
});

// Import after mocks are set up
import {
  generateQuizQuestions,
  generateExamRecommendations,
  analyzeMistakesAndGenerateTopics,
  extractTopicsFromInput,
} from './geminiService';
import { QuizGenerationError, TopicExtractionError } from '../lib';

// Test data
const mockQuizQuestions: QuizQuestion[] = [
  {
    questionText: 'מה הוא 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctAnswerIndex: 1,
    explanation: '2 + 2 = 4',
    difficulty: 'easy',
  },
  {
    questionText: 'מה הוא 5 × 3?',
    options: ['12', '15', '18', '20'],
    correctAnswerIndex: 1,
    explanation: '5 × 3 = 15',
    difficulty: 'medium',
  },
];

const mockRecommendations = [
  'תרגלו טבלת כפל של 5',
  'חזרו על חיבור וחיסור בסיסי',
  'נסו תרגילים עם מספרים גדולים יותר',
];

const mockTopics = ['חיבור שברים', 'כפל עשרוני'];

describe('geminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasApiKey = true;
    mockState.generateContentError = null;
    // Default successful response
    mockState.generateContentResponse = {
      text: JSON.stringify(mockQuizQuestions),
    };
  });

  afterEach(() => {
    mockState.generateContentResponse = null;
    mockState.generateContentError = null;
  });

  describe('generateQuizQuestions', () => {
    it('generates quiz questions successfully', async () => {
      const questions = await generateQuizQuestions(
        'מתמטיקה',
        'חיבור',
        'כיתה ג' as GradeLevel,
        5,
        'medium'
      );

      expect(questions).toHaveLength(2);
      expect(questions[0].questionText).toBe('מה הוא 2 + 2?');
    });

    it('throws QuizGenerationError when API key not configured', async () => {
      mockHasApiKey = false;

      await expect(
        generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
      ).rejects.toThrow(QuizGenerationError);
      await expect(
        generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
      ).rejects.toThrow('API key not configured');
    });

    it('throws QuizGenerationError on empty response', async () => {
      mockState.generateContentResponse = { text: '' };

      await expect(
        generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
      ).rejects.toThrow(QuizGenerationError);
    });

    it('throws QuizGenerationError on invalid JSON response', async () => {
      mockState.generateContentResponse = { text: 'not valid json' };

      await expect(
        generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
      ).rejects.toThrow();
    });

    it('throws QuizGenerationError on empty questions array', async () => {
      mockState.generateContentResponse = { text: '[]' };

      await expect(
        generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
      ).rejects.toThrow(QuizGenerationError);
      await expect(
        generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
      ).rejects.toThrow('non-empty array');
    });

    it('throws QuizGenerationError on API failure', async () => {
      mockState.generateContentError = new Error('API Error');

      await expect(
        generateQuizQuestions('מתמטיקה', 'חיבור', 'כיתה ג' as GradeLevel)
      ).rejects.toThrow(QuizGenerationError);
    });

    it('uses default count and difficulty', async () => {
      // Just verify it succeeds with defaults
      const questions = await generateQuizQuestions(
        'מתמטיקה',
        'חיבור',
        'כיתה ג' as GradeLevel
      );

      expect(questions).toBeDefined();
    });
  });

  describe('generateExamRecommendations', () => {
    beforeEach(() => {
      mockState.generateContentResponse = {
        text: JSON.stringify(mockRecommendations),
      };
    });

    it('generates recommendations successfully', async () => {
      const recommendations = await generateExamRecommendations(
        'מתמטיקה',
        ['חיבור', 'כפל'],
        mockQuizQuestions,
        [1, 0] // First correct, second wrong
      );

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0]).toBe('תרגלו טבלת כפל של 5');
    });

    it('returns default recommendations when API key not configured', async () => {
      mockHasApiKey = false;

      const recommendations = await generateExamRecommendations(
        'מתמטיקה',
        ['חיבור'],
        mockQuizQuestions,
        [1, 1]
      );

      // Should return default Hebrew recommendations
      expect(recommendations).toHaveLength(3);
      expect(recommendations[0]).toContain('קראו');
    });

    it('returns default recommendations on API failure', async () => {
      mockState.generateContentError = new Error('API Error');

      const recommendations = await generateExamRecommendations(
        'מתמטיקה',
        ['חיבור'],
        mockQuizQuestions,
        [1, 1]
      );

      // Should fall back to defaults gracefully
      expect(recommendations).toHaveLength(3);
    });

    it('returns default recommendations on empty response', async () => {
      mockState.generateContentResponse = { text: '' };

      const recommendations = await generateExamRecommendations(
        'מתמטיקה',
        ['חיבור'],
        mockQuizQuestions,
        [1, 1]
      );

      expect(recommendations).toHaveLength(3);
    });

    it('returns default recommendations on invalid format', async () => {
      mockState.generateContentResponse = { text: '{}' };

      const recommendations = await generateExamRecommendations(
        'מתמטיקה',
        ['חיבור'],
        mockQuizQuestions,
        [1, 1]
      );

      expect(recommendations).toHaveLength(3);
    });
  });

  describe('analyzeMistakesAndGenerateTopics', () => {
    beforeEach(() => {
      mockState.generateContentResponse = {
        text: JSON.stringify(mockTopics),
      };
    });

    it('analyzes mistakes and returns topics', async () => {
      const mistakes = [
        { question: '1/2 + 1/3 = ?', wrongAnswer: '2/5' },
        { question: '0.5 × 0.2 = ?', wrongAnswer: '1' },
      ];

      const topics = await analyzeMistakesAndGenerateTopics('מתמטיקה', mistakes);

      expect(topics).toHaveLength(2);
      expect(topics).toContain('חיבור שברים');
    });

    it('returns fallback topic when API key not configured', async () => {
      mockHasApiKey = false;

      const topics = await analyzeMistakesAndGenerateTopics('מתמטיקה', [
        { question: 'test', wrongAnswer: 'wrong' },
      ]);

      expect(topics).toHaveLength(1);
      expect(topics[0]).toContain('חיזוק מתמטיקה');
    });

    it('returns fallback topic on API failure', async () => {
      mockState.generateContentError = new Error('API Error');

      const topics = await analyzeMistakesAndGenerateTopics('עברית', [
        { question: 'test', wrongAnswer: 'wrong' },
      ]);

      expect(topics).toHaveLength(1);
      expect(topics[0]).toContain('חיזוק עברית');
    });

    it('returns fallback topic on empty response', async () => {
      mockState.generateContentResponse = { text: '' };

      const topics = await analyzeMistakesAndGenerateTopics('מתמטיקה', [
        { question: 'test', wrongAnswer: 'wrong' },
      ]);

      expect(topics[0]).toContain('חיזוק');
    });
  });

  describe('extractTopicsFromInput', () => {
    beforeEach(() => {
      mockState.generateContentResponse = {
        text: JSON.stringify(['נושא 1', 'נושא 2']),
      };
    });

    it('extracts topics from text', async () => {
      const topics = await extractTopicsFromInput('מבחן במתמטיקה על שברים');

      expect(topics).toHaveLength(2);
    });

    it('throws TopicExtractionError when API key not configured', async () => {
      mockHasApiKey = false;

      await expect(extractTopicsFromInput('test')).rejects.toThrow(
        TopicExtractionError
      );
      await expect(extractTopicsFromInput('test')).rejects.toThrow(
        'API key not configured'
      );
    });

    it('throws TopicExtractionError on empty response', async () => {
      mockState.generateContentResponse = { text: '' };

      await expect(extractTopicsFromInput('test')).rejects.toThrow(
        TopicExtractionError
      );
    });

    it('throws TopicExtractionError on invalid format', async () => {
      mockState.generateContentResponse = { text: '"not an array"' };

      await expect(extractTopicsFromInput('test')).rejects.toThrow(
        TopicExtractionError
      );
    });

    it('throws TopicExtractionError on API failure', async () => {
      mockState.generateContentError = new Error('API Error');

      await expect(extractTopicsFromInput('test')).rejects.toThrow(
        TopicExtractionError
      );
    });

    it('returns empty array for valid empty response', async () => {
      mockState.generateContentResponse = { text: '[]' };

      const topics = await extractTopicsFromInput('test');

      expect(topics).toEqual([]);
    });

    it('handles multimodal input with image', async () => {
      const topics = await extractTopicsFromInput(
        'מבחן',
        'base64imagedata',
        'image/jpeg'
      );

      expect(topics).toHaveLength(2);
    });
  });
});
