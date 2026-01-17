/**
 * Hook for managing Hebrew game state
 *
 * Encapsulates all game logic: scoring, streaks, feedback, timers.
 */

import { useState, useEffect, useCallback } from 'react';
import { GameSettings } from '../../../types';
import { VOWELS } from '../../hebrewData';
import { GameMode, GameQuestion, FeedbackState } from '../types';
import { generateQuestion } from '../generators';
import { playWin, playLoss, speakWord } from '../audio';

export interface UseGameStateOptions {
  settings?: GameSettings;
  speedQuestionCount?: number;
}

export interface UseGameStateReturn {
  // State
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

  // Actions
  startGame: (mode: GameMode) => void;
  handleAnswer: (answer: string) => void;
  exitToMenu: () => void;

  // Settings
  activeSettings: GameSettings;
}

const DEFAULT_SETTINGS: GameSettings = {
  allowedVowels: VOWELS.map(v => v.name),
  showMissingLetterHint: true,
  speedChallengeSeconds: 4,
  allowedCategories: ['animals', 'food', 'objects', 'transport', 'nature'],
  enableTTS: true,
  enableTTSOpening: true
};

export function useGameState(options: UseGameStateOptions = {}): UseGameStateReturn {
  const { settings, speedQuestionCount = 25 } = options;
  const activeSettings = settings || DEFAULT_SETTINGS;

  // Core state
  const [mode, setMode] = useState<GameMode>('menu');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [question, setQuestion] = useState<GameQuestion | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>('none');
  const [showFullWord, setShowFullWord] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [speedCount, setSpeedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Confetti on streak milestones
  useEffect(() => {
    if (streak > 0 && streak % 5 === 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [streak]);

  // Speed mode timer
  useEffect(() => {
    if (mode === 'speed' && timer > 0 && !gameFinished && feedback === 'none') {
      const t = setTimeout(() => setTimer(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else if (mode === 'speed' && timer === 0 && !gameFinished && feedback === 'none') {
      // Timeout - treat as wrong answer
      handleAnswer('TIMEOUT');
    }
  }, [timer, mode, gameFinished, feedback]);

  // Load a new question
  const loadQuestion = useCallback((currentMode: GameMode) => {
    setFeedback('none');
    setShowFullWord(null);

    const q = generateQuestion(currentMode, activeSettings);
    setQuestion(q);

    if (currentMode === 'speed') {
      setTimer(activeSettings.speedChallengeSeconds);
    }
  }, [activeSettings]);

  // Start a game mode
  const startGame = useCallback((selectedMode: GameMode) => {
    setMode(selectedMode);
    setScore(0);
    setStreak(0);
    setGameFinished(false);
    setSpeedCount(0);
    loadQuestion(selectedMode);
  }, [loadQuestion]);

  // Handle answer selection
  const handleAnswer = useCallback((answer: string) => {
    if (feedback !== 'none' || !question) return;

    const isCorrect = answer === question.correct;

    if (isCorrect) {
      playWin();
      setFeedback('correct');
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);

      // Special logic for Opening/Closing modes
      if (question.type === 'closing' || question.type === 'opening') {
        setShowFullWord(question.fullWord || null);

        const shouldSpeak = question.type === 'closing'
          ? activeSettings.enableTTS
          : activeSettings.enableTTSOpening;

        if (shouldSpeak && question.fullWord) {
          speakWord(question.fullWord);
        }
      }
    } else {
      playLoss();
      setFeedback('wrong');
      setStreak(0);
    }

    // Delay before next question
    const delay =
      (question.type === 'closing' || question.type === 'opening') && isCorrect
        ? 4000
        : mode === 'speed'
          ? 1000
          : 2000;

    setTimeout(() => {
      if (mode === 'speed') {
        const nextCount = speedCount + 1;
        setSpeedCount(nextCount);
        if (nextCount >= speedQuestionCount) {
          setGameFinished(true);
        } else {
          loadQuestion('speed');
        }
      } else {
        loadQuestion(mode);
      }
    }, delay);
  }, [feedback, question, mode, speedCount, speedQuestionCount, activeSettings, loadQuestion]);

  // Exit to menu
  const exitToMenu = useCallback(() => {
    setMode('menu');
  }, []);

  return {
    mode,
    score,
    streak,
    question,
    feedback,
    showFullWord,
    timer,
    gameFinished,
    speedCount,
    showConfetti,
    startGame,
    handleAnswer,
    exitToMenu,
    activeSettings
  };
}
