/**
 * Hook for managing confetti celebrations
 *
 * Provides a simple API for showing confetti effects
 * when students achieve good scores.
 */

import { useState, useCallback, useEffect } from 'react';

export interface UseConfettiOptions {
  /** Score threshold to trigger confetti (default: 70) */
  threshold?: number;
  /** Duration in ms before hiding confetti (default: 5000) */
  duration?: number;
  /** Whether confetti should recycle (default: false) */
  recycle?: boolean;
  /** Number of confetti pieces (default: 200) */
  numberOfPieces?: number;
}

export interface UseConfettiReturn {
  /** Whether confetti should be shown */
  showConfetti: boolean;
  /** Manually trigger confetti */
  triggerConfetti: () => void;
  /** Hide confetti */
  hideConfetti: () => void;
  /** Check if score passes threshold and trigger if so */
  celebrateIfWon: (score: number, total: number) => boolean;
  /** Props to spread on Confetti component */
  confettiProps: {
    numberOfPieces: number;
    recycle: boolean;
  };
}

const DEFAULT_OPTIONS: Required<UseConfettiOptions> = {
  threshold: 70,
  duration: 5000,
  recycle: false,
  numberOfPieces: 200
};

/**
 * Hook for managing celebration confetti
 *
 * @example
 * const { showConfetti, celebrateIfWon, confettiProps } = useConfetti();
 *
 * // When quiz ends
 * celebrateIfWon(score, totalQuestions);
 *
 * // In render
 * {showConfetti && <Confetti {...confettiProps} />}
 *
 * @example
 * // With custom threshold
 * const { celebrateIfWon } = useConfetti({ threshold: 80 });
 */
export function useConfetti(options: UseConfettiOptions = {}): UseConfettiReturn {
  const [showConfetti, setShowConfetti] = useState(false);

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Auto-hide confetti after duration
  useEffect(() => {
    if (!showConfetti || mergedOptions.recycle) return;

    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, mergedOptions.duration);

    return () => clearTimeout(timer);
  }, [showConfetti, mergedOptions.duration, mergedOptions.recycle]);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
  }, []);

  const hideConfetti = useCallback(() => {
    setShowConfetti(false);
  }, []);

  const celebrateIfWon = useCallback((score: number, total: number): boolean => {
    if (total === 0) return false;

    const percentage = (score / total) * 100;
    const passed = percentage >= mergedOptions.threshold;

    if (passed) {
      setShowConfetti(true);
    }

    return passed;
  }, [mergedOptions.threshold]);

  const confettiProps = {
    numberOfPieces: mergedOptions.numberOfPieces,
    recycle: mergedOptions.recycle
  };

  return {
    showConfetti,
    triggerConfetti,
    hideConfetti,
    celebrateIfWon,
    confettiProps
  };
}

/**
 * Get the appropriate emoji for a score percentage
 */
export function getScoreEmoji(percentage: number): string {
  if (percentage === 100) return '🏆';
  if (percentage >= 90) return '🌟';
  if (percentage >= 70) return '🎉';
  if (percentage >= 50) return '👍';
  return '💪';
}

/**
 * Get encouraging message based on score (Hebrew)
 */
export function getScoreMessage(percentage: number, isFinalReview: boolean): string {
  if (isFinalReview) {
    if (percentage === 100) return 'מושלם! אתם מוכנים למבחן!';
    if (percentage >= 90) return 'מעולה! כמעט מושלם!';
    if (percentage >= 70) return 'יפה מאוד! עוד קצת תרגול ותהיו מוכנים!';
    return 'בואו נתרגל עוד קצת לפני המבחן';
  }

  if (percentage === 100) return 'מושלם!';
  if (percentage >= 90) return 'מעולה!';
  if (percentage >= 70) return 'יפה מאוד!';
  if (percentage >= 50) return 'טוב! המשיכו לתרגל!';
  return 'לא נורא, ננסה שוב!';
}
