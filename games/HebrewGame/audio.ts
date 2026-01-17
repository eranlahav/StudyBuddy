/**
 * Audio utilities for Hebrew Game
 *
 * Uses Web Audio API for sound effects and Web Speech API for TTS.
 */

/**
 * Play a tone using Web Audio API
 */
export const playTone = (freq: number, type: OscillatorType, duration: number): void => {
  const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

/**
 * Play winning sound effect (ascending arpeggio)
 */
export const playWin = (): void => {
  playTone(523.25, 'sine', 0.1);  // C5
  setTimeout(() => playTone(659.25, 'sine', 0.1), 100);  // E5
  setTimeout(() => playTone(783.99, 'sine', 0.2), 200);  // G5
};

/**
 * Play losing sound effect (low sawtooth)
 */
export const playLoss = (): void => {
  playTone(150, 'sawtooth', 0.3);
};

/**
 * Play click sound effect
 */
export const playClick = (): void => {
  playTone(800, 'sine', 0.05);
};

/**
 * Speak a word using Web Speech API (Hebrew)
 */
export const speakWord = (text: string): void => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }
};
