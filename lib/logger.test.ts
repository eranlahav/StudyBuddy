/**
 * Tests for lib/logger.ts
 *
 * Tests the centralized logging functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';
import { QuizGenerationError } from './errors';

describe('logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
    groupCollapsed: ReturnType<typeof vi.spyOn>;
    groupEnd: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      groupCollapsed: vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('logs info level messages', () => {
      logger.info('Test message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('includes message in output', () => {
      logger.info('Hello world');
      const call = consoleSpy.info.mock.calls[0];
      expect(call[0]).toContain('Hello world');
    });

    it('includes context when provided', () => {
      logger.info('User action', { userId: '123', action: 'click' });
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('logs warn level messages', () => {
      logger.warn('Warning message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('includes error details when provided', () => {
      const error = new Error('Something went wrong');
      logger.warn('A warning', {}, error);
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('logs error level messages', () => {
      logger.error('Error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('handles Error objects', () => {
      const error = new Error('Test error');
      logger.error('Failed', {}, error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('handles AppError with user message', () => {
      const error = new QuizGenerationError('Generation failed');
      logger.error('Quiz error', {}, error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('handles non-Error objects', () => {
      logger.error('Strange error', {}, 'string error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('handles null error', () => {
      logger.error('Error with null', {}, null);
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('logs error with extracted message', () => {
      const error = new QuizGenerationError('Quiz failed');
      logger.logError(error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('uses custom message when provided', () => {
      const error = new Error('original');
      logger.logError(error, 'Custom message');
      const call = consoleSpy.error.mock.calls[0];
      expect(call[0]).toContain('Custom message');
    });

    it('includes context when provided', () => {
      const error = new Error('failed');
      logger.logError(error, 'Failed', { attempt: 3 });
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('child logger', () => {
    it('creates child with base context', () => {
      const child = logger.child({ component: 'TestComponent' });
      expect(child).toBeDefined();
      expect(child.info).toBeDefined();
      expect(child.error).toBeDefined();
    });

    it('child info includes base context', () => {
      const child = logger.child({ component: 'Quiz' });
      child.info('Started');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('child merges base and call context', () => {
      const child = logger.child({ component: 'Quiz' });
      child.info('Action', { action: 'submit' });
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('child error method works', () => {
      const child = logger.child({ component: 'Quiz' });
      child.error('Failed', {}, new Error('test'));
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('child warn method works', () => {
      const child = logger.child({ component: 'Quiz' });
      child.warn('Warning');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('child logError method works', () => {
      const child = logger.child({ component: 'Quiz' });
      child.logError(new Error('test'), 'Something failed');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('child debug method exists', () => {
      const child = logger.child({ component: 'Quiz' });
      expect(child.debug).toBeDefined();
    });
  });
});
