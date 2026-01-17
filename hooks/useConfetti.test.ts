/**
 * Tests for hooks/useConfetti.ts
 *
 * Tests the confetti celebration hook and helper functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfetti, getScoreEmoji, getScoreMessage } from './useConfetti';

describe('useConfetti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with showConfetti false', () => {
    const { result } = renderHook(() => useConfetti());
    expect(result.current.showConfetti).toBe(false);
  });

  it('triggerConfetti sets showConfetti to true', () => {
    const { result } = renderHook(() => useConfetti());

    act(() => {
      result.current.triggerConfetti();
    });

    expect(result.current.showConfetti).toBe(true);
  });

  it('hideConfetti sets showConfetti to false', () => {
    const { result } = renderHook(() => useConfetti());

    act(() => {
      result.current.triggerConfetti();
    });
    expect(result.current.showConfetti).toBe(true);

    act(() => {
      result.current.hideConfetti();
    });
    expect(result.current.showConfetti).toBe(false);
  });

  it('auto-hides after duration', () => {
    const { result } = renderHook(() => useConfetti({ duration: 3000 }));

    act(() => {
      result.current.triggerConfetti();
    });
    expect(result.current.showConfetti).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.showConfetti).toBe(false);
  });

  it('uses default duration of 5000ms', () => {
    const { result } = renderHook(() => useConfetti());

    act(() => {
      result.current.triggerConfetti();
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.showConfetti).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.showConfetti).toBe(false);
  });

  it('does not auto-hide when recycle is true', () => {
    const { result } = renderHook(() => useConfetti({ recycle: true }));

    act(() => {
      result.current.triggerConfetti();
    });

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.showConfetti).toBe(true);
  });

  describe('celebrateIfWon', () => {
    it('triggers confetti when score meets threshold', () => {
      const { result } = renderHook(() => useConfetti({ threshold: 70 }));

      let won: boolean;
      act(() => {
        won = result.current.celebrateIfWon(7, 10); // 70%
      });

      expect(won!).toBe(true);
      expect(result.current.showConfetti).toBe(true);
    });

    it('triggers confetti when score exceeds threshold', () => {
      const { result } = renderHook(() => useConfetti({ threshold: 70 }));

      let won: boolean;
      act(() => {
        won = result.current.celebrateIfWon(9, 10); // 90%
      });

      expect(won!).toBe(true);
      expect(result.current.showConfetti).toBe(true);
    });

    it('does not trigger confetti when score below threshold', () => {
      const { result } = renderHook(() => useConfetti({ threshold: 70 }));

      let won: boolean;
      act(() => {
        won = result.current.celebrateIfWon(6, 10); // 60%
      });

      expect(won!).toBe(false);
      expect(result.current.showConfetti).toBe(false);
    });

    it('returns false for zero total', () => {
      const { result } = renderHook(() => useConfetti());

      let won: boolean;
      act(() => {
        won = result.current.celebrateIfWon(0, 0);
      });

      expect(won!).toBe(false);
      expect(result.current.showConfetti).toBe(false);
    });

    it('uses default threshold of 70', () => {
      const { result } = renderHook(() => useConfetti());

      act(() => {
        result.current.celebrateIfWon(69, 100);
      });
      expect(result.current.showConfetti).toBe(false);

      act(() => {
        result.current.hideConfetti();
        result.current.celebrateIfWon(70, 100);
      });
      expect(result.current.showConfetti).toBe(true);
    });

    it('respects custom threshold', () => {
      const { result } = renderHook(() => useConfetti({ threshold: 90 }));

      act(() => {
        result.current.celebrateIfWon(85, 100);
      });
      expect(result.current.showConfetti).toBe(false);

      act(() => {
        result.current.celebrateIfWon(90, 100);
      });
      expect(result.current.showConfetti).toBe(true);
    });
  });

  describe('confettiProps', () => {
    it('returns default number of pieces', () => {
      const { result } = renderHook(() => useConfetti());
      expect(result.current.confettiProps.numberOfPieces).toBe(200);
    });

    it('returns custom number of pieces', () => {
      const { result } = renderHook(() => useConfetti({ numberOfPieces: 500 }));
      expect(result.current.confettiProps.numberOfPieces).toBe(500);
    });

    it('returns recycle setting', () => {
      const { result: result1 } = renderHook(() => useConfetti());
      expect(result1.current.confettiProps.recycle).toBe(false);

      const { result: result2 } = renderHook(() => useConfetti({ recycle: true }));
      expect(result2.current.confettiProps.recycle).toBe(true);
    });
  });
});

describe('getScoreEmoji', () => {
  it('returns trophy for 100%', () => {
    expect(getScoreEmoji(100)).toBe('🏆');
  });

  it('returns star for 90-99%', () => {
    expect(getScoreEmoji(99)).toBe('🌟');
    expect(getScoreEmoji(90)).toBe('🌟');
  });

  it('returns party for 70-89%', () => {
    expect(getScoreEmoji(89)).toBe('🎉');
    expect(getScoreEmoji(70)).toBe('🎉');
  });

  it('returns thumbs up for 50-69%', () => {
    expect(getScoreEmoji(69)).toBe('👍');
    expect(getScoreEmoji(50)).toBe('👍');
  });

  it('returns flexing arm for below 50%', () => {
    expect(getScoreEmoji(49)).toBe('💪');
    expect(getScoreEmoji(0)).toBe('💪');
  });
});

describe('getScoreMessage', () => {
  describe('regular quiz (not final review)', () => {
    it('returns perfect message for 100%', () => {
      expect(getScoreMessage(100, false)).toBe('מושלם!');
    });

    it('returns excellent for 90%+', () => {
      expect(getScoreMessage(95, false)).toBe('מעולה!');
      expect(getScoreMessage(90, false)).toBe('מעולה!');
    });

    it('returns very good for 70%+', () => {
      expect(getScoreMessage(80, false)).toBe('יפה מאוד!');
      expect(getScoreMessage(70, false)).toBe('יפה מאוד!');
    });

    it('returns good for 50%+', () => {
      expect(getScoreMessage(60, false)).toBe('טוב! המשיכו לתרגל!');
      expect(getScoreMessage(50, false)).toBe('טוב! המשיכו לתרגל!');
    });

    it('returns encouraging message for below 50%', () => {
      expect(getScoreMessage(40, false)).toBe('לא נורא, ננסה שוב!');
      expect(getScoreMessage(0, false)).toBe('לא נורא, ננסה שוב!');
    });
  });

  describe('final review', () => {
    it('returns ready message for 100%', () => {
      expect(getScoreMessage(100, true)).toBe('מושלם! אתם מוכנים למבחן!');
    });

    it('returns almost perfect for 90%+', () => {
      expect(getScoreMessage(95, true)).toBe('מעולה! כמעט מושלם!');
    });

    it('returns almost ready for 70%+', () => {
      expect(getScoreMessage(80, true)).toBe('יפה מאוד! עוד קצת תרגול ותהיו מוכנים!');
    });

    it('returns need more practice for below 70%', () => {
      expect(getScoreMessage(60, true)).toBe('בואו נתרגל עוד קצת לפני המבחן');
      expect(getScoreMessage(0, true)).toBe('בואו נתרגל עוד קצת לפני המבחן');
    });
  });
});
