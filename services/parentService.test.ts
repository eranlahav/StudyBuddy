/**
 * Tests for services/parentService.ts
 *
 * Tests parent user operations including:
 * - Get/create parent
 * - Update profile and last login
 * - Subscription to parent changes
 * - Super admin checks
 * - Block/unblock
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Unsubscribe, QuerySnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import type { Parent } from '../types';

// Mock Firestore functions
vi.mock('firebase/firestore', async () => {
  const { vi } = await import('vitest');
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    documentId: vi.fn(() => '__doc_id__')
  };
});

vi.mock('../firebaseConfig', () => ({
  db: {}
}));

// Mock the logger and types
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
import * as firestore from 'firebase/firestore';
import {
  getParent,
  createParent,
  updateLastLogin,
  updateParent,
  subscribeToParent,
  isSuperAdmin,
  isSuperAdminEmail,
  getParentsByIds,
  blockParent,
  unblockParent
} from './parentService';
import { DatabaseError } from '../lib';

// Test data
const now = Date.now();

const mockParent: Parent = {
  id: 'parent-uid-1',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  familyId: 'family-1',
  isSuperAdmin: false,
  createdAt: now,
  lastLoginAt: now
};

describe('parentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  describe('getParent', () => {
    it('returns parent when found', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockParent
      } as unknown as DocumentSnapshot);

      const result = await getParent('parent-uid-1');

      expect(result).toEqual(mockParent);
      expect(firestore.doc).toHaveBeenCalledWith({}, 'parents', 'parent-uid-1');
    });

    it('returns null when not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null
      } as unknown as DocumentSnapshot);

      const result = await getParent('nonexistent');

      expect(result).toBeNull();
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockRejectedValue(new Error('Read failed'));

      await expect(getParent('uid')).rejects.toThrow(DatabaseError);
    });
  });

  describe('createParent', () => {
    it('creates a new parent', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const result = await createParent(
        'new-uid',
        'user@example.com',
        'New User',
        'https://example.com/photo.jpg',
        'family-1'
      );

      expect(result).toMatchObject({
        id: 'new-uid',
        email: 'user@example.com',
        displayName: 'New User',
        photoURL: 'https://example.com/photo.jpg',
        familyId: 'family-1',
        isSuperAdmin: false
      });
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('uses email prefix when displayName is empty', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const result = await createParent(
        'new-uid',
        'user@example.com',
        '',
        null,
        'family-1'
      );

      expect(result.displayName).toBe('user');
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Write failed'));

      await expect(
        createParent('uid', 'email@test.com', 'Name', null, 'family-1')
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateLastLogin', () => {
    it('updates last login timestamp', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await updateLastLogin('parent-uid');

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', {
        lastLoginAt: now
      });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(updateLastLogin('uid')).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateParent', () => {
    it('updates parent profile fields', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await updateParent('parent-uid', { displayName: 'Updated Name' });

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', { displayName: 'Updated Name' });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(updateParent('uid', {})).rejects.toThrow(DatabaseError);
    });
  });

  describe('subscribeToParent', () => {
    it('calls onData with parent when found', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, callback) => {
        const docSnap = {
          exists: () => true,
          data: () => mockParent
        } as unknown as DocumentSnapshot;
        (callback as any)(docSnap);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      const unsubscribe = subscribeToParent('parent-uid', onData);

      expect(onData).toHaveBeenCalledWith(mockParent);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('calls onData with null when not found', () => {
      const onData = vi.fn();

      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, callback) => {
        const docSnap = {
          exists: () => false,
          data: () => null
        } as unknown as DocumentSnapshot;
        (callback as any)(docSnap);
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToParent('uid', onData);

      expect(onData).toHaveBeenCalledWith(null);
    });

    it('calls onError callback when subscription fails', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        (errorCallback as any)(error);
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToParent('uid', onData, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(DatabaseError);
    });
  });

  describe('isSuperAdmin', () => {
    it('returns true when parent is super admin', () => {
      const adminParent = { ...mockParent, isSuperAdmin: true };

      expect(isSuperAdmin(adminParent)).toBe(true);
    });

    it('returns false when parent is not super admin', () => {
      expect(isSuperAdmin(mockParent)).toBe(false);
    });

    it('returns false when parent is null', () => {
      expect(isSuperAdmin(null)).toBe(false);
    });
  });

  describe('isSuperAdminEmail', () => {
    it('returns true for super admin email (case insensitive)', () => {
      // SUPER_ADMIN_EMAIL is 'lahavfamily02@gmail.com'
      expect(isSuperAdminEmail('lahavfamily02@gmail.com')).toBe(true);
      expect(isSuperAdminEmail('LAHAVFAMILY02@GMAIL.COM')).toBe(true);
    });

    it('returns false for non-super admin email', () => {
      expect(isSuperAdminEmail('other@example.com')).toBe(false);
    });
  });

  describe('getParentsByIds', () => {
    it('returns parents for given UIDs', async () => {
      const parents = [mockParent, { ...mockParent, id: 'parent-2' }];

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: parents.map(p => ({ data: () => p }))
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getParentsByIds(['parent-uid-1', 'parent-2']);

      expect(result).toEqual(parents);
      expect(firestore.where).toHaveBeenCalledWith('__doc_id__', 'in', ['parent-uid-1', 'parent-2']);
    });

    it('returns empty array for empty UIDs', async () => {
      const result = await getParentsByIds([]);

      expect(result).toEqual([]);
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Query failed'));

      await expect(getParentsByIds(['uid-1'])).rejects.toThrow(DatabaseError);
    });
  });

  describe('blockParent', () => {
    it('sets blocked flag to true', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await blockParent('parent-uid');

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', {
        blocked: true,
        blockedAt: now
      });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(blockParent('uid')).rejects.toThrow(DatabaseError);
    });
  });

  describe('unblockParent', () => {
    it('sets blocked flag to false', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await unblockParent('parent-uid');

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', {
        blocked: false,
        blockedAt: null
      });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(unblockParent('uid')).rejects.toThrow(DatabaseError);
    });
  });
});
