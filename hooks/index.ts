/**
 * Custom hooks for Study Buddy
 *
 * Import from '@/hooks' for convenience:
 * import { useQuizSession, useSpeechSynthesis, useConfetti } from '@/hooks';
 */

// Error handling
export { useErrorHandler, useErrorState } from './useErrorHandler';
export type { AsyncState, UseErrorHandlerReturn, UseErrorHandlerOptions } from './useErrorHandler';

// Speech synthesis
export { useSpeechSynthesis, useAutoSpeak } from './useSpeechSynthesis';
export type { UseSpeechSynthesisOptions, UseSpeechSynthesisReturn } from './useSpeechSynthesis';

// Quiz session
export { useQuizSession } from './useQuizSession';
export type {
  QuizSessionState,
  FinalReviewState,
  UseQuizSessionOptions,
  UseQuizSessionReturn
} from './useQuizSession';

// Confetti/celebrations
export { useConfetti, getScoreEmoji, getScoreMessage } from './useConfetti';
export type { UseConfettiOptions, UseConfettiReturn } from './useConfetti';
