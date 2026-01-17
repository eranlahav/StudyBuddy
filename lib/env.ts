/**
 * Environment variable validation and access
 *
 * This module validates required environment variables at import time
 * and provides typed access to configuration values.
 *
 * The project uses Vite with define replacements:
 * - process.env.API_KEY is replaced at build time from GEMINI_API_KEY
 * - import.meta.env.VITE_API_KEY can also be used (standard Vite pattern)
 */

import { ConfigurationError } from './errors';

/**
 * Environment configuration interface
 */
export interface EnvConfig {
  /** Gemini API key for AI features */
  apiKey: string;
  /** Current environment mode */
  mode: 'development' | 'production' | 'test';
  /** Whether we're in development mode */
  isDev: boolean;
  /** Whether we're in production mode */
  isProd: boolean;
}

/**
 * Get the API key from available environment sources
 * Uses Vite define replacement - process.env.API_KEY is replaced at build time
 */
function getApiKey(): string | undefined {
  // This gets replaced by Vite's define config at build time
  // The actual string value is injected here
  const apiKey = process.env.API_KEY;
  if (apiKey && apiKey.length > 0) {
    return apiKey;
  }

  // Fallback to Vite's native env (VITE_ prefix)
  if (import.meta.env?.VITE_API_KEY) {
    return import.meta.env.VITE_API_KEY;
  }

  return undefined;
}

/**
 * Validate and load environment configuration
 * Call this early in app initialization to fail fast on misconfiguration
 */
function loadEnvConfig(): EnvConfig {
  const apiKey = getApiKey();

  // Get mode from Vite
  const mode = (import.meta.env?.MODE || 'development') as EnvConfig['mode'];
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  // Validate required variables
  if (!apiKey) {
    // Warn but don't crash - app works without AI (Hebrew games, Firestore, etc.)
    console.warn(
      '[env] Warning: VITE_API_KEY is not set. AI quiz generation will not work.\n' +
      'Create a .env.local file with: VITE_API_KEY=your_gemini_api_key'
    );
  }

  return {
    apiKey: apiKey || '',
    mode,
    isDev,
    isProd
  };
}

/**
 * Validated environment configuration
 * Import this to access env vars with type safety
 *
 * @example
 * import { env } from './lib/env';
 * const ai = new GoogleGenAI({ apiKey: env.apiKey });
 */
export const env: EnvConfig = loadEnvConfig();

/**
 * Check if the API key is configured
 * Useful for conditionally disabling AI features
 */
export function hasApiKey(): boolean {
  return Boolean(env.apiKey);
}

/**
 * Assert that the API key is configured
 * Throws if not - use when API key is required
 */
export function requireApiKey(): string {
  if (!env.apiKey) {
    throw new ConfigurationError(
      'Gemini API key is required for this operation. ' +
      'Set VITE_API_KEY in your environment.'
    );
  }
  return env.apiKey;
}
