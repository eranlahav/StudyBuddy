/**
 * Invite Service
 *
 * Handles invitation management for new users.
 * Super admin creates invites, new users redeem them during signup.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Unsubscribe,
  onSnapshot
} from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from '../firebaseConfig';
import { Invite, InviteStatus } from '../types';
import { logger, DatabaseError, InviteError, generateId } from '../lib';

const COLLECTION = 'invites';
const INVITE_CODE_LENGTH = 8;
const INVITE_EXPIRY_DAYS = 7;

/**
 * Generate a unique 8-character invite code
 */
function generateInviteCode(): string {
  // Use nanoid for URL-safe codes
  return nanoid(INVITE_CODE_LENGTH);
}

/**
 * Calculate expiration timestamp (7 days from now)
 */
function calculateExpiryDate(): number {
  return Date.now() + (INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Create a new invite
 */
export async function createInvite(
  email: string,
  familyId: string,
  familyName: string,
  createdBy: string
): Promise<Invite> {
  const invite: Invite = {
    id: generateId(),
    code: generateInviteCode(),
    email: email.toLowerCase(),
    familyId,
    familyName,
    createdBy,
    createdAt: Date.now(),
    expiresAt: calculateExpiryDate(),
    status: 'pending'
  };

  try {
    await setDoc(doc(db, COLLECTION, invite.id), invite);
    logger.info('inviteService: Invite created', {
      inviteId: invite.id,
      email: invite.email,
      familyId
    });
    return invite;
  } catch (error) {
    logger.error('inviteService: Failed to create invite', { email }, error);
    throw new DatabaseError('Failed to create invite', { cause: error as Error });
  }
}

/**
 * Get an invite by its code
 */
export async function getInviteByCode(code: string): Promise<Invite | null> {
  try {
    const q = query(collection(db, COLLECTION), where('code', '==', code));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      logger.debug('inviteService: Invite not found by code', { code });
      return null;
    }

    return snapshot.docs[0].data() as Invite;
  } catch (error) {
    logger.error('inviteService: Failed to get invite by code', { code }, error);
    throw new DatabaseError('Failed to get invite', { cause: error as Error });
  }
}

/**
 * Get an invite by ID
 */
export async function getInvite(inviteId: string): Promise<Invite | null> {
  try {
    const docRef = doc(db, COLLECTION, inviteId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as Invite;
  } catch (error) {
    logger.error('inviteService: Failed to get invite', { inviteId }, error);
    throw new DatabaseError('Failed to get invite', { cause: error as Error });
  }
}

/**
 * Validate an invite code
 * Returns the invite if valid, throws InviteError if not
 */
export async function validateInviteCode(code: string): Promise<Invite> {
  const invite = await getInviteByCode(code);

  if (!invite) {
    throw new InviteError(
      'Invite not found',
      'קוד ההזמנה לא נמצא. בדקו שהקישור נכון.'
    );
  }

  if (invite.status === 'accepted') {
    throw new InviteError(
      'Invite already used',
      'ההזמנה הזו כבר נוצלה.'
    );
  }

  if (invite.status === 'revoked') {
    throw new InviteError(
      'Invite revoked',
      'ההזמנה הזו בוטלה.'
    );
  }

  if (Date.now() > invite.expiresAt) {
    // Auto-update status to expired
    await updateDoc(doc(db, COLLECTION, invite.id), { status: 'expired' });
    throw new InviteError(
      'Invite expired',
      'פג תוקף ההזמנה. בקשו הזמנה חדשה.'
    );
  }

  return invite;
}

/**
 * Mark an invite as used
 */
export async function acceptInvite(
  inviteId: string,
  usedBy: string
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, inviteId), {
      status: 'accepted' as InviteStatus,
      usedBy,
      usedAt: Date.now()
    });
    logger.info('inviteService: Invite accepted', { inviteId, usedBy });
  } catch (error) {
    logger.error('inviteService: Failed to accept invite', { inviteId }, error);
    throw new DatabaseError('Failed to accept invite', { cause: error as Error });
  }
}

/**
 * Revoke an invite (cancel it)
 */
export async function revokeInvite(inviteId: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, inviteId), {
      status: 'revoked' as InviteStatus
    });
    logger.info('inviteService: Invite revoked', { inviteId });
  } catch (error) {
    logger.error('inviteService: Failed to revoke invite', { inviteId }, error);
    throw new DatabaseError('Failed to revoke invite', { cause: error as Error });
  }
}

/**
 * Get all invites (for admin view)
 */
export async function getAllInvites(): Promise<Invite[]> {
  try {
    const q = query(collection(db, COLLECTION));
    const snapshot = await getDocs(q);
    const invites = snapshot.docs.map(doc => doc.data() as Invite);
    // Sort by creation date, newest first
    invites.sort((a, b) => b.createdAt - a.createdAt);
    logger.debug('inviteService: Fetched all invites', { count: invites.length });
    return invites;
  } catch (error) {
    logger.error('inviteService: Failed to get all invites', {}, error);
    throw new DatabaseError('Failed to get invites', { cause: error as Error });
  }
}

/**
 * Get pending invites for a specific family
 */
export async function getFamilyInvites(familyId: string): Promise<Invite[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('familyId', '==', familyId)
    );
    const snapshot = await getDocs(q);
    const invites = snapshot.docs.map(doc => doc.data() as Invite);
    invites.sort((a, b) => b.createdAt - a.createdAt);
    return invites;
  } catch (error) {
    logger.error('inviteService: Failed to get family invites', { familyId }, error);
    throw new DatabaseError('Failed to get family invites', { cause: error as Error });
  }
}

/**
 * Subscribe to all invites (for admin view)
 */
export function subscribeToInvites(
  onData: (invites: Invite[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const invites = snapshot.docs.map(doc => doc.data() as Invite);
      invites.sort((a, b) => b.createdAt - a.createdAt);
      onData(invites);
    },
    (error) => {
      logger.error('inviteService: Subscription error', {}, error);
      onError?.(new DatabaseError('Failed to subscribe to invites', { cause: error }));
    }
  );
}

/**
 * Check if an email already has a pending invite
 */
export async function hasPendingInvite(email: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('email', '==', email.toLowerCase()),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    logger.error('inviteService: Failed to check pending invite', { email }, error);
    throw new DatabaseError('Failed to check pending invite', { cause: error as Error });
  }
}

/**
 * Generate the signup URL for an invite
 */
export function getInviteUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/#/signup?invite=${code}`;
}
