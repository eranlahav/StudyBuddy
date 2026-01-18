/**
 * Tests for hooks/useQuizSession.ts
 *
 * Tests the quiz session management hook covering:
 * - Question loading (AI and dictation)
 * - Answer handling and scoring
 * - Session completion and recommendations
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuizSession, UseQuizSessionOptions } from './useQuizSession';
import type { ChildProfile, Subject, UpcomingTest, QuizQuestion, GradeLevel } from '../types';

// Mock the services
vi.mock('../services/geminiService', () => ({
  generateQuizQuestions: vi.fn(),
  generateExamRecommendations: vi.fn(),
  analyzeMistakesAndGenerateTopics: vi.fn(),
}));

vi.mock('../services/dictationService', () => ({
  generateDictationQuestions: vi.fn(),
}));

// Mock the logger
vi.mock('../lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib')>();
  return {
    ...actual,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    getUserMessage: vi.fn((err) => err?.message || 'Unknown error'),
  };
});

// Import mocked modules
import { generateQuizQuestions, generateExamRecommendations, analyzeMistakesAndGenerateTopics } from '../services/geminiService';
import { generateDictationQuestions } from '../services/dictationService';

// Test data
const mockChild: ChildProfile = {
  id: 'child-1',
  familyId: 'family-1',
  name: 'דני',
  avatar: 'cat',
  grade: 'כיתה ג\'' as GradeLevel,
  stars: 10,
  streak: 2,
  subjects: ['math-1'],
  proficiency: { 'math-1': 'medium' },
  pinHash: '',
  createdAt: Date.now()
};

const mockSubject: Subject = {
  id: 'math-1',
  name: 'מתמטיקה',
  icon: '➕',
  color: '#4CAF50',
  topics: ['חיבור', 'חיסור']
};

const mockQuestions: QuizQuestion[] = [
  {
    questionText: 'כמה זה 2 + 3?',
    options: ['4', '5', '6', '7'],
    correctAnswerIndex: 1,
    explanation: 'התשובה היא 5',
    difficulty: 'medium',
    tip: 'ספור על האצבעות'
  },
  {
    questionText: 'כמה זה 5 - 2?',
    options: ['2', '3', '4', '5'],
    correctAnswerIndex: 1,
    explanation: 'התשובה היא 3',
    difficulty: 'medium',
    tip: 'חשוב על זה הפוך'
  },
  {
    questionText: 'כמה זה 4 + 4?',
    options: ['6', '7', '8', '9'],
    correctAnswerIndex: 2,
    explanation: 'התשובה היא 8',
    difficulty: 'medium',
    tip: 'זה מספר כפול'
  }
];

const mockUpcomingTests: UpcomingTest[] = [];

const createDefaultOptions = (overrides?: Partial<UseQuizSessionOptions>): UseQuizSessionOptions => ({
  child: mockChild,
  subject: mockSubject,
  topic: 'חיבור',
  upcomingTests: mockUpcomingTests,
  isFinalReview: false,
  ...overrides,
});

describe('useQuizSession', () => {
  beforeEach(() => {
    vi.mocked(generateQuizQuestions).mockReset().mockResolvedValue(mockQuestions);
    vi.mocked(generateExamRecommendations).mockReset().mockResolvedValue(['המלצה 1', 'המלצה 2']);
    vi.mocked(analyzeMistakesAndGenerateTopics).mockReset().mockResolvedValue(['נושא לחיזוק']);
    vi.mocked(generateDictationQuestions).mockReset();
  });

  describe('initial state', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      // Initial state before loading completes
      expect(result.current.isLoading).toBe(true);
      expect(result.current.questions).toEqual([]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.score).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.isFinished).toBe(false);
    });
  });

  describe('loadQuestions', () => {
    it('loads AI-generated questions on mount', async () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(generateQuizQuestions).toHaveBeenCalledWith(
        'מתמטיקה',
        'חיבור',
        'כיתה ג\'', // grade as GradeLevel
        5, // default count
        'medium' // proficiency
      );
      expect(result.current.questions).toEqual(mockQuestions);
      expect(result.current.currentQuestion).toEqual(mockQuestions[0]);
    });

    it('sets error state when question loading fails', async () => {
      vi.mocked(generateQuizQuestions).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.questions).toEqual([]);
    });

    it('loads dictation questions when test type is dictation', async () => {
      const dictationQuestions: QuizQuestion[] = [
        {
          questionText: 'הקשיבו ובחרו את המילה הנכונה',
          options: ['שלום', 'בוקר', 'ערב', 'לילה'],
          correctAnswerIndex: 0,
          audioText: 'שלום',
          explanation: 'המילה הנכונה היא: שלום',
          difficulty: 'medium',
          tip: 'הקשיבו לצלילים'
        }
      ];

      vi.mocked(generateDictationQuestions).mockReturnValue(dictationQuestions);

      const dictationTest: UpcomingTest = {
        id: 'test-1',
        familyId: 'family-1',
        childId: 'child-1',
        subjectId: 'math-1',
        date: Date.now() + 86400000,
        topics: ['הכתבה'],
        numQuestions: 5,
        type: 'dictation',
        dictationWords: ['שלום', 'בוקר'],
        dictationMode: 'recognition'
      };

      const { result } = renderHook(() =>
        useQuizSession(createDefaultOptions({
          upcomingTests: [dictationTest],
          isFinalReview: false,
          topic: 'הכתבה'
        }))
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(generateDictationQuestions).toHaveBeenCalledWith(
        ['שלום', 'בוקר'],
        'recognition'
      );
      expect(generateQuizQuestions).not.toHaveBeenCalled();
      expect(result.current.questions).toEqual(dictationQuestions);
    });

    it('uses child proficiency level for difficulty', async () => {
      const childWithProficiency: ChildProfile = {
        ...mockChild,
        proficiency: { 'math-1': 'hard' }
      };

      const { result } = renderHook(() =>
        useQuizSession(createDefaultOptions({
          child: childWithProficiency
        }))
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(generateQuizQuestions).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        'hard'
      );
    });

    it('defaults to medium difficulty when no proficiency set', async () => {
      const childNoProficiency: ChildProfile = {
        ...mockChild,
        proficiency: undefined as any
      };

      const { result } = renderHook(() =>
        useQuizSession(createDefaultOptions({
          child: childNoProficiency
        }))
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(generateQuizQuestions).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        'medium'
      );
    });
  });

  describe('handleAnswer', () => {
    it('records answer and updates score for correct answer', async () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Answer correctly (correct answer is index 1)
      act(() => {
        result.current.handleAnswer(1);
      });

      expect(result.current.selectedOption).toBe(1);
      expect(result.current.isAnswered).toBe(true);
      expect(result.current.score).toBe(1);
      expect(result.current.userAnswers).toEqual([1]);
    });

    it('records answer without updating score for wrong answer', async () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Answer incorrectly (correct answer is index 1, we pick 0)
      act(() => {
        result.current.handleAnswer(0);
      });

      expect(result.current.selectedOption).toBe(0);
      expect(result.current.isAnswered).toBe(true);
      expect(result.current.score).toBe(0);
      expect(result.current.userAnswers).toEqual([0]);
    });

    it('ignores duplicate answers for same question', async () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First answer
      act(() => {
        result.current.handleAnswer(0);
      });

      // Try to change answer
      act(() => {
        result.current.handleAnswer(1);
      });

      expect(result.current.selectedOption).toBe(0);
      expect(result.current.score).toBe(0);
    });

    it('ignores answers when no questions loaded', async () => {
      vi.mocked(generateQuizQuestions).mockResolvedValue([]);

      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleAnswer(0);
      });

      expect(result.current.selectedOption).toBeNull();
      expect(result.current.isAnswered).toBe(false);
    });
  });

  describe('nextQuestion', () => {
    it('advances to next question and resets state', async () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Answer first question
      act(() => {
        result.current.handleAnswer(1);
      });

      expect(result.current.currentIndex).toBe(0);

      // Move to next
      act(() => {
        result.current.nextQuestion();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.selectedOption).toBeNull();
      expect(result.current.isAnswered).toBe(false);
      expect(result.current.showTip).toBe(false);
      expect(result.current.currentQuestion).toEqual(mockQuestions[1]);
    });

    it('does not advance past last question', async () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Move through all questions
      for (let i = 0; i < mockQuestions.length; i++) {
        act(() => {
          result.current.handleAnswer(1);
        });
        act(() => {
          result.current.nextQuestion();
        });
      }

      // Should stay at last question
      expect(result.current.currentIndex).toBe(mockQuestions.length - 1);
    });
  });

  describe('toggleTip', () => {
    it('toggles tip visibility', async () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.showTip).toBe(false);

      act(() => {
        result.current.toggleTip();
      });

      expect(result.current.showTip).toBe(true);

      act(() => {
        result.current.toggleTip();
      });

      expect(result.current.showTip).toBe(false);
    });
  });

  describe('finishSession', () => {
    it('calls onSessionSave for regular quiz', async () => {
      const onSessionSave = vi.fn();

      const { result } = renderHook(() =>
        useQuizSession(createDefaultOptions({ onSessionSave }))
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Answer all questions correctly
      for (let i = 0; i < mockQuestions.length; i++) {
        act(() => {
          result.current.handleAnswer(mockQuestions[i].correctAnswerIndex);
        });
        if (i < mockQuestions.length - 1) {
          act(() => {
            result.current.nextQuestion();
          });
        }
      }

      await act(async () => {
        await result.current.finishSession();
      });

      expect(result.current.isFinished).toBe(true);
      expect(onSessionSave).toHaveBeenCalledWith({
        score: 3,
        totalQuestions: 3,
        questions: mockQuestions,
        userAnswers: expect.any(Array)
      });
    });

    // TODO: These tests need investigation - the hook's loadQuestions callback
    // has complex dependencies that make mocking difficult with isFinalReview=true.
    // The loadQuestions effect fires on mount but the mock doesn't resolve properly
    // when isFinalReview is set. Needs further investigation into useCallback dependencies.
    it.todo('generates recommendations for final review');
    it.todo('creates remediation test when score below 90%');
    it.todo('does not create remediation when score is 90% or above');
  });

  describe('percentage calculation', () => {
    it('calculates correct percentage', async () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.percentage).toBe(0);

      // Answer 1 correctly
      act(() => {
        result.current.handleAnswer(mockQuestions[0].correctAnswerIndex);
      });

      expect(result.current.percentage).toBe(33); // 1/3

      // Move to next question and answer
      act(() => {
        result.current.nextQuestion();
      });
      act(() => {
        result.current.handleAnswer(mockQuestions[1].correctAnswerIndex);
      });

      expect(result.current.percentage).toBe(67); // 2/3

      // Move to last question and answer
      act(() => {
        result.current.nextQuestion();
      });
      act(() => {
        result.current.handleAnswer(mockQuestions[2].correctAnswerIndex);
      });

      expect(result.current.percentage).toBe(100); // 3/3
    });

    it('returns 0 when no questions', async () => {
      vi.mocked(generateQuizQuestions).mockResolvedValue([]);

      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.percentage).toBe(0);
    });
  });

  describe('currentQuestion', () => {
    it('returns null when no questions', async () => {
      vi.mocked(generateQuizQuestions).mockResolvedValue([]);

      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentQuestion).toBeNull();
    });

    it('tracks current question correctly', async () => {
      const { result } = renderHook(() => useQuizSession(createDefaultOptions()));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentQuestion).toEqual(mockQuestions[0]);

      act(() => {
        result.current.handleAnswer(0);
      });
      act(() => {
        result.current.nextQuestion();
      });

      expect(result.current.currentQuestion).toEqual(mockQuestions[1]);
    });
  });

  describe('final review mode', () => {
    it('requests 10 questions for final review', async () => {
      const examTest: UpcomingTest = {
        id: 'exam-1',
        familyId: 'family-1',
        childId: 'child-1',
        subjectId: 'math-1',
        date: Date.now() + 86400000,
        topics: ['חיבור', 'חיסור'],
        numQuestions: 10,
        type: 'quiz'
      };

      renderHook(() =>
        useQuizSession(createDefaultOptions({
          upcomingTests: [examTest],
          isFinalReview: true
        }))
      );

      await waitFor(() => {
        expect(generateQuizQuestions).toHaveBeenCalledWith(
          'מתמטיקה',
          'חיבור, חיסור', // Combined topics
          'כיתה ג\'',
          10, // Final review count
          'medium'
        );
      });
    });

    it('uses test numQuestions for regular quiz', async () => {
      const scheduledTest: UpcomingTest = {
        id: 'test-1',
        familyId: 'family-1',
        childId: 'child-1',
        subjectId: 'math-1',
        date: Date.now() + 86400000,
        topics: ['חיבור'],
        numQuestions: 8,
        type: 'quiz'
      };

      renderHook(() =>
        useQuizSession(createDefaultOptions({
          upcomingTests: [scheduledTest],
          topic: 'חיבור'
        }))
      );

      await waitFor(() => {
        expect(generateQuizQuestions).toHaveBeenCalledWith(
          'מתמטיקה',
          'חיבור',
          'כיתה ג\'',
          8, // Test-specified count
          'medium'
        );
      });
    });
  });
});
