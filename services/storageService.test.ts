/**
 * Tests for services/storageService.ts
 *
 * Tests Firebase Storage operations including:
 * - File validation (type and size)
 * - Upload and delete operations
 * - File conversion utilities
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Storage
vi.mock('firebase/storage', async () => {
  const { vi } = await import('vitest');
  return {
    getStorage: vi.fn(() => ({})),
    ref: vi.fn(() => 'storage-ref'),
    uploadBytes: vi.fn().mockResolvedValue(undefined),
    getDownloadURL: vi.fn().mockResolvedValue('https://storage.example.com/file.jpg'),
    deleteObject: vi.fn().mockResolvedValue(undefined)
  };
});

// Mock the logger
vi.mock('../lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib')>();
  return {
    ...actual,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Import after mocks
import * as firebaseStorage from 'firebase/storage';
import {
  uploadEvaluationFiles,
  deleteEvaluationFiles,
  fileToBase64,
  getMimeType,
  isSupportedFileType,
  StorageError
} from './storageService';

// Helper to create mock File
function createMockFile(
  name: string,
  type: string,
  size: number = 1000
): File {
  const content = new Array(size).fill('a').join('');
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StorageError', () => {
    it('creates error with message', () => {
      const error = new StorageError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('StorageError');
    });

    it('creates error with cause', () => {
      const cause = new Error('Original error');
      const error = new StorageError('Test error', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('isSupportedFileType', () => {
    it('returns true for JPEG', () => {
      const file = createMockFile('test.jpg', 'image/jpeg');
      expect(isSupportedFileType(file)).toBe(true);
    });

    it('returns true for PNG', () => {
      const file = createMockFile('test.png', 'image/png');
      expect(isSupportedFileType(file)).toBe(true);
    });

    it('returns true for HEIC', () => {
      const file = createMockFile('test.heic', 'image/heic');
      expect(isSupportedFileType(file)).toBe(true);
    });

    it('returns true for HEIF', () => {
      const file = createMockFile('test.heif', 'image/heif');
      expect(isSupportedFileType(file)).toBe(true);
    });

    it('returns true for PDF', () => {
      const file = createMockFile('test.pdf', 'application/pdf');
      expect(isSupportedFileType(file)).toBe(true);
    });

    it('returns false for unsupported types', () => {
      const file = createMockFile('test.txt', 'text/plain');
      expect(isSupportedFileType(file)).toBe(false);
    });
  });

  describe('getMimeType', () => {
    it('returns file MIME type', () => {
      const file = createMockFile('test.jpg', 'image/jpeg');
      expect(getMimeType(file)).toBe('image/jpeg');
    });
  });

  describe('uploadEvaluationFiles', () => {
    it('throws error when no files provided', async () => {
      await expect(uploadEvaluationFiles('family-1', 'child-1', [])).rejects.toThrow(StorageError);
      await expect(uploadEvaluationFiles('family-1', 'child-1', [])).rejects.toThrow('לא נבחרו קבצים');
    });

    it('throws error for unsupported file type', async () => {
      const file = createMockFile('test.txt', 'text/plain');

      await expect(
        uploadEvaluationFiles('family-1', 'child-1', [file])
      ).rejects.toThrow(StorageError);
    });

    it('throws error for file too large', async () => {
      const largeFile = createMockFile('test.jpg', 'image/jpeg', 20 * 1024 * 1024);

      await expect(
        uploadEvaluationFiles('family-1', 'child-1', [largeFile])
      ).rejects.toThrow(StorageError);
      await expect(
        uploadEvaluationFiles('family-1', 'child-1', [largeFile])
      ).rejects.toThrow('גדול מדי');
    });

    it('uploads valid files and returns URLs', async () => {
      const file1 = createMockFile('test1.jpg', 'image/jpeg');
      const file2 = createMockFile('test2.png', 'image/png');

      vi.mocked(firebaseStorage.getDownloadURL)
        .mockResolvedValueOnce('https://storage.example.com/test1.jpg')
        .mockResolvedValueOnce('https://storage.example.com/test2.png');

      const result = await uploadEvaluationFiles('family-1', 'child-1', [file1, file2]);

      expect(result.urls).toHaveLength(2);
      expect(result.names).toHaveLength(2);
      expect(result.names).toContain('test1.jpg');
      expect(result.names).toContain('test2.png');
      expect(firebaseStorage.uploadBytes).toHaveBeenCalledTimes(2);
    });

    it('throws StorageError when upload fails', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg');
      vi.mocked(firebaseStorage.uploadBytes).mockRejectedValue(new Error('Network error'));

      await expect(
        uploadEvaluationFiles('family-1', 'child-1', [file])
      ).rejects.toThrow(StorageError);
      await expect(
        uploadEvaluationFiles('family-1', 'child-1', [file])
      ).rejects.toThrow('העלאת הקבצים נכשלה');
    });

    it('uses correct file path pattern', async () => {
      // Reset mock after the rejection test
      vi.mocked(firebaseStorage.uploadBytes).mockResolvedValue(undefined as any);
      const file = createMockFile('my-file.jpg', 'image/jpeg');

      await uploadEvaluationFiles('family-1', 'child-1', [file]);

      expect(firebaseStorage.ref).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/evaluations\/family-1\/child-1\/\d+_my-file\.jpg/)
      );
    });

    it('sanitizes special characters in filename', async () => {
      // Reset mock after the rejection test
      vi.mocked(firebaseStorage.uploadBytes).mockResolvedValue(undefined as any);
      const file = createMockFile('my file (copy).jpg', 'image/jpeg');

      await uploadEvaluationFiles('family-1', 'child-1', [file]);

      expect(firebaseStorage.ref).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/my_file__copy_\.jpg/)
      );
    });
  });

  describe('deleteEvaluationFiles', () => {
    it('deletes all files', async () => {
      const urls = [
        'https://storage.example.com/file1.jpg',
        'https://storage.example.com/file2.jpg'
      ];

      await deleteEvaluationFiles(urls);

      expect(firebaseStorage.deleteObject).toHaveBeenCalledTimes(2);
    });

    it('continues deleting even if one fails', async () => {
      const urls = [
        'https://storage.example.com/file1.jpg',
        'https://storage.example.com/file2.jpg',
        'https://storage.example.com/file3.jpg'
      ];

      vi.mocked(firebaseStorage.deleteObject)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(undefined);

      // Should not throw
      await expect(deleteEvaluationFiles(urls)).resolves.toBeUndefined();

      expect(firebaseStorage.deleteObject).toHaveBeenCalledTimes(3);
    });

    it('handles empty URL array', async () => {
      await deleteEvaluationFiles([]);

      expect(firebaseStorage.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe('fileToBase64', () => {
    it('converts file to base64', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg');

      const result = await fileToBase64(file);

      // Result should be base64 string (without data URL prefix)
      expect(typeof result).toBe('string');
      expect(result).not.toContain('data:');
    });
  });
});
