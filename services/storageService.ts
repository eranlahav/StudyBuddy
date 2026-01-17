/**
 * Firebase Storage Service
 *
 * Handles file uploads and management for evaluation documents.
 * Supports images (JPG, PNG, HEIC) and PDF files.
 */

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { logger } from '../lib';

// Initialize Storage
const storage = getStorage();

// Allowed file types for evaluations
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Error thrown when file upload fails
 */
export class StorageError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Validate file before upload
 */
function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new StorageError(
      `סוג הקובץ ${file.type} לא נתמך. השתמשו ב-JPG, PNG, HEIC או PDF.`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new StorageError(
      `הקובץ גדול מדי. הגודל המקסימלי הוא 10MB.`
    );
  }
}

/**
 * Generate unique file path for evaluation
 */
function generateFilePath(
  familyId: string,
  childId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `evaluations/${familyId}/${childId}/${timestamp}_${sanitizedName}`;
}

/**
 * Upload evaluation files to Firebase Storage
 *
 * @param familyId - Family ID for path organization
 * @param childId - Child ID for path organization
 * @param files - Array of files to upload
 * @returns Array of download URLs for uploaded files
 *
 * @throws {StorageError} If validation or upload fails
 */
export async function uploadEvaluationFiles(
  familyId: string,
  childId: string,
  files: File[]
): Promise<{ urls: string[]; names: string[] }> {
  if (files.length === 0) {
    throw new StorageError('לא נבחרו קבצים להעלאה.');
  }

  // Validate all files first
  for (const file of files) {
    validateFile(file);
  }

  logger.info('storageService: Uploading evaluation files', {
    familyId,
    childId,
    fileCount: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0)
  });

  const urls: string[] = [];
  const names: string[] = [];

  try {
    for (const file of files) {
      const path = generateFilePath(familyId, childId, file.name);
      const storageRef = ref(storage, path);

      // Upload with metadata
      await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });

      // Get download URL
      const url = await getDownloadURL(storageRef);
      urls.push(url);
      names.push(file.name);

      logger.info('storageService: File uploaded successfully', {
        fileName: file.name,
        path
      });
    }

    return { urls, names };
  } catch (error) {
    logger.error('storageService: Upload failed', { familyId, childId }, error);
    throw new StorageError(
      'העלאת הקבצים נכשלה. בדקו את החיבור לאינטרנט ונסו שוב.',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete evaluation files from Firebase Storage
 *
 * @param urls - Array of download URLs to delete
 */
export async function deleteEvaluationFiles(urls: string[]): Promise<void> {
  logger.info('storageService: Deleting evaluation files', {
    fileCount: urls.length
  });

  const errors: string[] = [];

  for (const url of urls) {
    try {
      // Extract path from URL
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error) {
      logger.warn('storageService: Failed to delete file', { url }, error);
      errors.push(url);
    }
  }

  if (errors.length > 0) {
    logger.warn('storageService: Some files could not be deleted', {
      failedCount: errors.length
    });
  }
}

/**
 * Convert File to base64 for AI processing
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Get MIME type from File
 */
export function getMimeType(file: File): string {
  return file.type;
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  return ALLOWED_TYPES.includes(file.type);
}
