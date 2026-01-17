/**
 * Hook for Text-to-Speech functionality
 *
 * Wraps the Web Speech API for Hebrew TTS with automatic cleanup.
 * Used for dictation questions and accessibility features.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSpeechSynthesisOptions {
  /** Language code (default: 'he-IL' for Hebrew) */
  lang?: string;
  /** Speech rate (default: 0.8 for clearer pronunciation) */
  rate?: number;
  /** Speech pitch (default: 1) */
  pitch?: number;
  /** Speech volume (default: 1) */
  volume?: number;
}

export interface UseSpeechSynthesisReturn {
  /** Speak the given text */
  speak: (text: string) => void;
  /** Stop any ongoing speech */
  stop: () => void;
  /** Whether speech is currently playing */
  isSpeaking: boolean;
  /** Whether the browser supports speech synthesis */
  isSupported: boolean;
}

const DEFAULT_OPTIONS: Required<UseSpeechSynthesisOptions> = {
  lang: 'he-IL',
  rate: 0.8,
  pitch: 1,
  volume: 1
};

/**
 * Hook for text-to-speech with Hebrew support
 *
 * @example
 * const { speak, stop, isSpeaking } = useSpeechSynthesis();
 *
 * // Speak a word
 * speak('שלום');
 *
 * // Stop speech
 * stop();
 *
 * @example
 * // With custom options
 * const { speak } = useSpeechSynthesis({ rate: 0.6, lang: 'en-US' });
 */
export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = mergedOptions.lang;
    utterance.rate = mergedOptions.rate;
    utterance.pitch = mergedOptions.pitch;
    utterance.volume = mergedOptions.volume;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, mergedOptions.lang, mergedOptions.rate, mergedOptions.pitch, mergedOptions.volume]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported
  };
}

/**
 * Hook variant that auto-speaks when text changes
 *
 * @example
 * // Automatically speaks when audioText changes
 * useAutoSpeak(currentQuestion.audioText);
 */
export function useAutoSpeak(
  text: string | undefined,
  options: UseSpeechSynthesisOptions & { delay?: number; enabled?: boolean } = {}
) {
  const { delay = 500, enabled = true, ...speechOptions } = options;
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis(speechOptions);

  useEffect(() => {
    if (!enabled || !text || !isSupported) return;

    // Delay to allow UI to render first
    const timer = setTimeout(() => {
      speak(text);
    }, delay);

    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [text, enabled, delay, speak, stop, isSupported]);

  return { isSpeaking, isSupported, speak, stop };
}
