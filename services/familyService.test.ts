/**
 * Tests for services/familyService.ts
 *
 * Tests family (tenant) management operations including:
 * - Get/create family
 * - Add/remove parents
 * - Update family name
 * - Subscription to family changes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Unsubscribe, DocumentSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { Family } from '../types';

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
    arrayUnion: vi.fn((val) => ({ __arrayUnion: val })),
    arrayRemove: vi.fn((val) => ({ __arrayRemove: val }))
  };
});

vi.mock('../firebaseConfig', () => ({
  db: {}
}));

// Mock the logger and generateId
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
    generateId: vi.fn(() => 'generated-id-123'),
  };
});

// Import after mocks
import * as firestore from 'firebase/firestore';
import {
  getFamily,
  createFamily,
  addParentToFamily,
  updateFamilyName,
  subscribeToFamily,
  getAllFamilies,
  removeParentFromFamily,
  updateFamily
} from './familyService';
import { DatabaseError } from '../lib';

// Test data
const mockFamily: Family = {
  id: 'family-1',
  name: 'משפחת כהן',
  createdAt: Date.now(),
  createdBy: 'parent-1',
  parentIds: ['parent-1', 'parent-2']
};

describe('familyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFamily', () => {
    it('returns family when it exists', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockFamily
      } as unknown as DocumentSnapshot);

      const result = await getFamily('family-1');

      expect(result).toEqual(mockFamily);
      expect(firestore.doc).toHaveBeenCalledWith({}, 'families', 'family-1');
    });

    it('returns null when family does not exist', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null
      } as unknown as DocumentSnapshot);

      const result = await getFamily('nonexistent');

      expect(result).toBeNull();
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockRejectedValue(new Error('Read failed'));

      await expect(getFamily('family-1')).rejects.toThrow(DatabaseError);
      await expect(getFamily('family-1')).rejects.toThrow('Failed to get family');
    });
  });

  describe('createFamily', () => {
    it('creates a new family with generated ID', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const result = await createFamily('משפחת לוי', 'parent-uid');

      expect(result).toMatchObject({
        id: 'generated-id-123',
        name: 'משפחת לוי',
        createdBy: 'parent-uid',
        parentIds: ['parent-uid']
      });
      expect(result.createdAt).toBeDefined();
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Write failed'));

      await expect(createFamily('Test', 'uid')).rejects.toThrow(DatabaseError);
      await expect(createFamily('Test', 'uid')).rejects.toThrow('Failed to create family');
    });
  });

  describe('addParentToFamily', () => {
    it('adds parent using arrayUnion', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await addParentToFamily('family-1', 'new-parent');

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', {
        parentIds: { __arrayUnion: 'new-parent' }
      });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(addParentToFamily('family-1', 'parent')).rejects.toThrow(DatabaseError);
      await expect(addParentToFamily('family-1', 'parent')).rejects.toThrow('Failed to add parent');
    });
  });

  describe('updateFamilyName', () => {
    it('updates family name', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await updateFamilyName('family-1', 'משפחת ישראלי');

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', { name: 'משפחת ישראלי' });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(updateFamilyName('family-1', 'New')).rejects.toThrow(DatabaseError);
      await expect(updateFamilyName('family-1', 'New')).rejects.toThrow('Failed to update family name');
    });
  });

  describe('subscribeToFamily', () => {
    it('calls onData with family when it exists', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, callback) => {
        const docSnap = {
          exists: () => true,
          data: () => mockFamily
        } as unknown as DocumentSnapshot;
        (callback as any)(docSnap);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      const unsubscribe = subscribeToFamily('family-1', onData);

      expect(onData).toHaveBeenCalledWith(mockFamily);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('calls onData with null when family does not exist', () => {
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

      subscribeToFamily('family-1', onData);

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

      subscribeToFamily('family-1', onData, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(DatabaseError);
    });

    it('handles missing onError gracefully', () => {
      const onData = vi.fn();

      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        expect(() => (errorCallback as any)(error)).not.toThrow();
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToFamily('family-1', onData);
    });
  });

  describe('getAllFamilies', () => {
    it('returns all families', async () => {
      const families = [mockFamily, { ...mockFamily, id: 'family-2' }];

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: families.map(f => ({ data: () => f }))
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getAllFamilies();

      expect(result).toEqual(families);
    });

    it('returns empty array when no families exist', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: []
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getAllFamilies();

      expect(result).toEqual([]);
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Query failed'));

      await expect(getAllFamilies()).rejects.toThrow(DatabaseError);
      await expect(getAllFamilies()).rejects.toThrow('Failed to get all families');
    });
  });

  describe('removeParentFromFamily', () => {
    it('removes parent when multiple parents exist', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockFamily // has 2 parents
      } as unknown as DocumentSnapshot);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      const result = await removeParentFromFamily('family-1', 'parent-2');

      expect(result).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', {
        parentIds: { __arrayRemove: 'parent-2' }
      });
    });

    it('returns false when trying to remove last parent', async () => {
      const singleParentFamily = { ...mockFamily, parentIds: ['only-parent'] };

      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => singleParentFamily
      } as unknown as DocumentSnapshot);

      const result = await removeParentFromFamily('family-1', 'only-parent');

      expect(result).toBe(false);
      expect(firestore.updateDoc).not.toHaveBeenCalled();
    });

    it('throws DatabaseError when family not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null
      } as unknown as DocumentSnapshot);

      await expect(removeParentFromFamily('nonexistent', 'parent')).rejects.toThrow(DatabaseError);
    });

    it('throws DatabaseError on update failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockFamily
      } as unknown as DocumentSnapshot);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(removeParentFromFamily('family-1', 'parent-2')).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateFamily', () => {
    it('updates family fields', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await updateFamily('family-1', { name: 'שם חדש' });

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', { name: 'שם חדש' });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(updateFamily('family-1', {})).rejects.toThrow(DatabaseError);
      await expect(updateFamily('family-1', {})).rejects.toThrow('Failed to update family');
    });
  });
});
