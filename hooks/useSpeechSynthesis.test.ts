/**
 * Tests for hooks/useSpeechSynthesis.ts
 *
 * Tests the Text-to-Speech hook including:
 * - Browser support detection
 * - Hook return values
 *
 * Note: Full speech functionality testing is limited in jsdom as
 * window.speechSynthesis is not fully mockable. Testing basic hook behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechSynthesis, useAutoSpeak } from './useSpeechSynthesis';

describe('useSpeechSynthesis', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns expected interface', () => {
      const { result } = renderHook(() => useSpeechSynthesis());

      expect(result.current).toHaveProperty('speak');
      expect(result.current).toHaveProperty('stop');
      expect(result.current).toHaveProperty('isSpeaking');
      expect(result.current).toHaveProperty('isSupported');
      expect(typeof result.current.speak).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.isSpeaking).toBe('boolean');
      expect(typeof result.current.isSupported).toBe('boolean');
    });

    it('starts with isSpeaking false', () => {
      const { result } = renderHook(() => useSpeechSynthesis());

      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('options', () => {
    it('accepts custom options', () => {
      const { result } = renderHook(() =>
        useSpeechSynthesis({
          lang: 'en-US',
          rate: 1.2,
          pitch: 0.9,
          volume: 0.8
        })
      );

      // Should not throw and return valid interface
      expect(result.current.speak).toBeDefined();
    });

    it('accepts partial options', () => {
      const { result } = renderHook(() =>
        useSpeechSynthesis({ rate: 0.6 })
      );

      expect(result.current.speak).toBeDefined();
    });
  });

  describe('speak and stop', () => {
    it('speak function is callable', () => {
      const { result } = renderHook(() => useSpeechSynthesis());

      // speak is a function that can be called
      // Note: Actual speech may not work in jsdom due to mock limitations
      expect(typeof result.current.speak).toBe('function');
    });

    it('stop function can be called without error', () => {
      const { result } = renderHook(() => useSpeechSynthesis());

      expect(() => {
        act(() => {
          result.current.stop();
        });
      }).not.toThrow();
    });

    it('speak does nothing with empty text', () => {
      const { result } = renderHook(() => useSpeechSynthesis());

      act(() => {
        result.current.speak('');
      });

      expect(result.current.isSpeaking).toBe(false);
    });
  });
});

describe('useAutoSpeak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns expected interface', () => {
    const { result } = renderHook(() => useAutoSpeak('שלום'));

    expect(result.current).toHaveProperty('speak');
    expect(result.current).toHaveProperty('stop');
    expect(result.current).toHaveProperty('isSpeaking');
    expect(result.current).toHaveProperty('isSupported');
  });

  it('accepts options', () => {
    const { result } = renderHook(() =>
      useAutoSpeak('שלום', { delay: 1000, enabled: true, rate: 0.6 })
    );

    expect(result.current.speak).toBeDefined();
  });

  it('can be disabled', () => {
    const { result } = renderHook(() =>
      useAutoSpeak('שלום', { enabled: false })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should not be speaking when disabled
    expect(result.current.isSpeaking).toBe(false);
  });

  it('handles undefined text', () => {
    const { result } = renderHook(() => useAutoSpeak(undefined));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isSpeaking).toBe(false);
  });

  it('handles text changes', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useAutoSpeak(text),
      { initialProps: { text: 'שלום' } }
    );

    rerender({ text: 'בוקר טוב' });

    // Should not throw on re-render
    expect(result.current.isSpeaking).toBe(false);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useAutoSpeak('שלום'));

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });
});
