/**
 * Gemini API Mock
 *
 * Mocks the @google/genai package for testing AI-powered features
 * without making actual API calls.
 */

import { vi } from 'vitest';
import type { QuizQuestion } from '../../types';

// Default mock responses
export const mockQuizQuestions: QuizQuestion[] = [
  {
    questionText: 'מה הוא 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctAnswerIndex: 1,
    explanation: '2 + 2 = 4',
    difficulty: 'easy'
  },
  {
    questionText: 'מה הוא 5 × 3?',
    options: ['12', '15', '18', '20'],
    correctAnswerIndex: 1,
    explanation: '5 × 3 = 15',
    difficulty: 'easy'
  },
  {
    questionText: 'מה הוא 10 - 4?',
    options: ['4', '5', '6', '7'],
    correctAnswerIndex: 2,
    explanation: '10 - 4 = 6',
    difficulty: 'easy'
  }
];

export const mockRecommendations = [
  'תרגלו טבלת כפל של 5',
  'חזרו על חיבור וחיסור בסיסי',
  'נסו תרגילים עם מספרים גדולים יותר'
];

export const mockTopics = ['חיבור', 'חיסור', 'כפל'];

export const mockExtractedTopics = ['משוואות', 'גאומטריה', 'שברים'];

// Configurable mock behavior
let mockResponse: unknown = null;
let shouldFail = false;
let failureError: Error | null = null;

export function setMockResponse(response: unknown) {
  mockResponse = response;
}

export function setMockFailure(error: Error) {
  shouldFail = true;
  failureError = error;
}

export function resetMockGemini() {
  mockResponse = null;
  shouldFail = false;
  failureError = null;
}

// Mock generateContent function
export const mockGenerateContent = vi.fn(async () => {
  if (shouldFail && failureError) {
    throw failureError;
  }

  // Return custom response if set
  if (mockResponse !== null) {
    return {
      text: typeof mockResponse === 'string' ? mockResponse : JSON.stringify(mockResponse),
    };
  }

  // Default: return quiz questions
  return {
    text: JSON.stringify(mockQuizQuestions),
  };
});

// Mock the AI models object
export const mockModels = {
  generateContent: mockGenerateContent,
};

// Mock GoogleGenAI class
export class MockGoogleGenAI {
  apiKey: string;
  models = mockModels;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }
}

// Setup function to apply mocks
export function setupGeminiMocks() {
  vi.mock('@google/genai', () => ({
    GoogleGenAI: MockGoogleGenAI,
  }));
}

// Helper to create mock quiz responses
export function createMockQuizResponse(questions: QuizQuestion[]) {
  return JSON.stringify(questions);
}

// Helper to create mock recommendation response
export function createMockRecommendationResponse(recommendations: string[]) {
  return JSON.stringify(recommendations);
}

// Helper to create mock topics response
export function createMockTopicsResponse(topics: string[]) {
  return JSON.stringify(topics);
}
