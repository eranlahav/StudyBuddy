/**
 * Type definitions for Hebrew Game
 */

export type GameMode = 'menu' | 'similar' | 'pictures' | 'missing' | 'closing' | 'opening' | 'speed';

export type FeedbackState = 'none' | 'correct' | 'wrong';

export interface GameQuestion {
  type: GameMode;
  prompt: string;
  correct: string;
  options: string[];
  instruction: string;
  hint?: string | null;
  fullWord?: string;
  wordForAudio?: string;
}

export interface GameState {
  mode: GameMode;
  score: number;
  streak: number;
  question: GameQuestion | null;
  feedback: FeedbackState;
  showFullWord: string | null;
  timer: number;
  gameFinished: boolean;
  speedCount: number;
  showConfetti: boolean;
}
