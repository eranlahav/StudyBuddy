/**
 * Vitest Setup File
 *
 * Configures the test environment with:
 * - Jest DOM matchers for DOM assertions
 * - Global mocks for browser APIs
 * - Firebase and Gemini mocks
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Web Speech API
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
    pending: false,
    paused: false,
    onvoiceschanged: null,
  },
});

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: '',
  rate: 1,
  pitch: 1,
  volume: 1,
  onend: null,
  onerror: null,
})) as unknown as typeof SpeechSynthesisUtterance;

// Mock AudioContext for sound effects
class MockAudioContext {
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
  get destination() {
    return {};
  }
  get currentTime() {
    return 0;
  }
}
global.AudioContext = MockAudioContext as unknown as typeof AudioContext;

// Mock console methods to reduce noise in tests (optional)
// Uncomment if you want cleaner test output
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'info').mockImplementation(() => {});
// vi.spyOn(console, 'debug').mockImplementation(() => {});
