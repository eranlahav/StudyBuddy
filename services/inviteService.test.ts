/**
 * Tests for services/inviteService.ts
 *
 * Tests invite management operations including:
 * - Create invite
 * - Get invite by code/ID
 * - Validate invite code (with status/expiry checks)
 * - Accept/revoke invites
 * - List all invites
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Unsubscribe, QuerySnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import type { Invite, InviteStatus } from '../types';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'ABCD1234')
}));

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
    where: vi.fn()
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
  createInvite,
  getInviteByCode,
  getInvite,
  validateInviteCode,
  acceptInvite,
  revokeInvite,
  getAllInvites,
  getFamilyInvites,
  subscribeToInvites,
  hasPendingInvite,
  getInviteUrl
} from './inviteService';
import { DatabaseError, InviteError } from '../lib';

// Test data
const now = Date.now();
const oneDay = 24 * 60 * 60 * 1000;

const mockInvite: Invite = {
  id: 'invite-1',
  code: 'ABCD1234',
  email: 'test@example.com',
  familyId: 'family-1',
  familyName: 'משפחת כהן',
  createdBy: 'parent-1',
  createdAt: now,
  expiresAt: now + (7 * oneDay),
  status: 'pending'
};

describe('inviteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createInvite', () => {
    it('creates a new invite with generated code and ID', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const result = await createInvite(
        'Test@Example.com',
        'family-1',
        'משפחת כהן',
        'parent-1'
      );

      expect(result).toMatchObject({
        id: 'generated-id-123',
        code: 'ABCD1234',
        email: 'test@example.com', // Lowercased
        familyId: 'family-1',
        familyName: 'משפחת כהן',
        createdBy: 'parent-1',
        status: 'pending'
      });
      expect(result.expiresAt).toBe(now + (7 * oneDay));
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Write failed'));

      await expect(
        createInvite('test@example.com', 'family-1', 'Test', 'parent-1')
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('getInviteByCode', () => {
    it('returns invite when found', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockInvite }]
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getInviteByCode('ABCD1234');

      expect(result).toEqual(mockInvite);
      expect(firestore.where).toHaveBeenCalledWith('code', '==', 'ABCD1234');
    });

    it('returns null when not found', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: []
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getInviteByCode('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Query failed'));

      await expect(getInviteByCode('ABCD1234')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getInvite', () => {
    it('returns invite when found', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockInvite
      } as unknown as DocumentSnapshot);

      const result = await getInvite('invite-1');

      expect(result).toEqual(mockInvite);
    });

    it('returns null when not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null
      } as unknown as DocumentSnapshot);

      const result = await getInvite('nonexistent');

      expect(result).toBeNull();
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.getDoc).mockRejectedValue(new Error('Read failed'));

      await expect(getInvite('invite-1')).rejects.toThrow(DatabaseError);
    });
  });

  describe('validateInviteCode', () => {
    it('returns invite when valid', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockInvite }]
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await validateInviteCode('ABCD1234');

      expect(result).toEqual(mockInvite);
    });

    it('throws InviteError when invite not found', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: []
      } as unknown as QuerySnapshot<DocumentData>);

      await expect(validateInviteCode('NONEXISTENT')).rejects.toThrow(InviteError);
      await expect(validateInviteCode('NONEXISTENT')).rejects.toThrow('Invite not found');
    });

    it('throws InviteError when invite already accepted', async () => {
      const acceptedInvite = { ...mockInvite, status: 'accepted' as InviteStatus };

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => acceptedInvite }]
      } as unknown as QuerySnapshot<DocumentData>);

      await expect(validateInviteCode('ABCD1234')).rejects.toThrow(InviteError);
      await expect(validateInviteCode('ABCD1234')).rejects.toThrow('Invite already used');
    });

    it('throws InviteError when invite revoked', async () => {
      const revokedInvite = { ...mockInvite, status: 'revoked' as InviteStatus };

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => revokedInvite }]
      } as unknown as QuerySnapshot<DocumentData>);

      await expect(validateInviteCode('ABCD1234')).rejects.toThrow(InviteError);
      await expect(validateInviteCode('ABCD1234')).rejects.toThrow('Invite revoked');
    });

    it('throws InviteError and updates status when expired', async () => {
      const expiredInvite = { ...mockInvite, expiresAt: now - oneDay };

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => expiredInvite }]
      } as unknown as QuerySnapshot<DocumentData>);
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await expect(validateInviteCode('ABCD1234')).rejects.toThrow(InviteError);
      await expect(validateInviteCode('ABCD1234')).rejects.toThrow('Invite expired');
      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', { status: 'expired' });
    });
  });

  describe('acceptInvite', () => {
    it('marks invite as accepted', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await acceptInvite('invite-1', 'new-user-uid');

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', {
        status: 'accepted',
        usedBy: 'new-user-uid',
        usedAt: now
      });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(acceptInvite('invite-1', 'uid')).rejects.toThrow(DatabaseError);
    });
  });

  describe('revokeInvite', () => {
    it('marks invite as revoked', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await revokeInvite('invite-1');

      expect(firestore.updateDoc).toHaveBeenCalledWith('doc-ref', {
        status: 'revoked'
      });
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.doc).mockReturnValue('doc-ref' as any);
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      await expect(revokeInvite('invite-1')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getAllInvites', () => {
    it('returns all invites sorted by creation date', async () => {
      const invites = [
        { ...mockInvite, id: 'invite-1', createdAt: now },
        { ...mockInvite, id: 'invite-2', createdAt: now + 1000 }
      ];

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: invites.map(i => ({ data: () => i }))
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getAllInvites();

      // Sorted newest first
      expect(result[0].id).toBe('invite-2');
      expect(result[1].id).toBe('invite-1');
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Query failed'));

      await expect(getAllInvites()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getFamilyInvites', () => {
    it('returns invites for a specific family', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [{ data: () => mockInvite }]
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getFamilyInvites('family-1');

      expect(result).toHaveLength(1);
      expect(firestore.where).toHaveBeenCalledWith('familyId', '==', 'family-1');
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Query failed'));

      await expect(getFamilyInvites('family-1')).rejects.toThrow(DatabaseError);
    });
  });

  describe('subscribeToInvites', () => {
    it('subscribes to all invites sorted by creation date', () => {
      const onData = vi.fn();
      const mockUnsubscribe = vi.fn();
      const invites = [
        { ...mockInvite, id: 'invite-1', createdAt: now },
        { ...mockInvite, id: 'invite-2', createdAt: now + 1000 }
      ];

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, callback) => {
        const snapshot = {
          docs: invites.map(i => ({ data: () => i }))
        } as unknown as QuerySnapshot<DocumentData>;
        (callback as any)(snapshot);
        return mockUnsubscribe as unknown as Unsubscribe;
      });

      const unsubscribe = subscribeToInvites(onData);

      const receivedInvites = onData.mock.calls[0][0] as Invite[];
      expect(receivedInvites[0].id).toBe('invite-2');
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('calls onError callback when subscription fails', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.onSnapshot).mockImplementation((_ref, _callback, errorCallback) => {
        const error = new Error('Subscription failed');
        (errorCallback as any)(error);
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToInvites(onData, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(DatabaseError);
    });
  });

  describe('hasPendingInvite', () => {
    it('returns true when pending invite exists', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockInvite }]
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await hasPendingInvite('test@example.com');

      expect(result).toBe(true);
      expect(firestore.where).toHaveBeenCalledWith('email', '==', 'test@example.com');
      expect(firestore.where).toHaveBeenCalledWith('status', '==', 'pending');
    });

    it('returns false when no pending invite exists', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: []
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await hasPendingInvite('new@example.com');

      expect(result).toBe(false);
    });

    it('lowercases email for comparison', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.where).mockReturnValue('where-clause' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: []
      } as unknown as QuerySnapshot<DocumentData>);

      await hasPendingInvite('Test@Example.COM');

      expect(firestore.where).toHaveBeenCalledWith('email', '==', 'test@example.com');
    });

    it('throws DatabaseError on failure', async () => {
      vi.mocked(firestore.collection).mockReturnValue('collection-ref' as any);
      vi.mocked(firestore.query).mockReturnValue('query-ref' as any);
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Query failed'));

      await expect(hasPendingInvite('test@example.com')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getInviteUrl', () => {
    it('generates URL with provided base', () => {
      const result = getInviteUrl('ABCD1234', 'https://example.com');

      expect(result).toBe('https://example.com/#/signup?invite=ABCD1234');
    });
  });
});
