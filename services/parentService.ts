/**
 * Parent Service
 *
 * Handles all Firestore operations for parent users.
 * Parents are created from Firebase Auth users after Google sign-in.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  collection,
  documentId,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Parent, SUPER_ADMIN_EMAIL } from '../types';
import { logger, DatabaseError } from '../lib';

const COLLECTION = 'parents';

/**
 * Get a parent by their Firebase Auth UID
 */
export async function getParent(uid: string): Promise<Parent | null> {
  try {
    const docRef = doc(db, COLLECTION, uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      logger.debug('parentService: Parent not found', { uid });
      return null;
    }

    return docSnap.data() as Parent;
  } catch (error) {
    logger.error('parentService: Failed to get parent', { uid }, error);
    throw new DatabaseError('Failed to get parent', { cause: error as Error });
  }
}

/**
 * Create a new parent from Firebase Auth user data
 */
export async function createParent(
  uid: string,
  email: string,
  displayName: string,
  photoURL: string | null,
  familyId: string
): Promise<Parent> {
  const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const parent: Parent = {
    id: uid,
    email,
    displayName: displayName || email.split('@')[0],
    photoURL: photoURL || undefined,
    familyId,
    isSuperAdmin,
    createdAt: Date.now(),
    lastLoginAt: Date.now()
  };

  try {
    await setDoc(doc(db, COLLECTION, uid), parent);
    logger.info('parentService: Parent created', {
      uid,
      email,
      isSuperAdmin,
      familyId
    });
    return parent;
  } catch (error) {
    logger.error('parentService: Failed to create parent', { uid }, error);
    throw new DatabaseError('Failed to create parent', { cause: error as Error });
  }
}

/**
 * Update parent's last login timestamp
 */
export async function updateLastLogin(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, uid), {
      lastLoginAt: Date.now()
    });
    logger.debug('parentService: Last login updated', { uid });
  } catch (error) {
    logger.error('parentService: Failed to update last login', { uid }, error);
    throw new DatabaseError('Failed to update last login', { cause: error as Error });
  }
}

/**
 * Update parent profile fields
 */
export async function updateParent(
  uid: string,
  updates: Partial<Pick<Parent, 'displayName' | 'photoURL'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, uid), updates);
    logger.info('parentService: Parent updated', { uid, fields: Object.keys(updates) });
  } catch (error) {
    logger.error('parentService: Failed to update parent', { uid }, error);
    throw new DatabaseError('Failed to update parent', { cause: error as Error });
  }
}

/**
 * Subscribe to a specific parent document for real-time updates
 */
export function subscribeToParent(
  uid: string,
  onData: (parent: Parent | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTION, uid),
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as Parent);
      } else {
        onData(null);
      }
    },
    (error) => {
      logger.error('parentService: Subscription error', { uid }, error);
      onError?.(new DatabaseError('Failed to subscribe to parent', { cause: error }));
    }
  );
}

/**
 * Check if a user is the super admin
 */
export function isSuperAdmin(parent: Parent | null): boolean {
  return parent?.isSuperAdmin === true;
}

/**
 * Check if an email is the super admin email
 */
export function isSuperAdminEmail(email: string): boolean {
  return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Get multiple parents by their UIDs
 * Batch fetches parents for displaying co-parents in family settings
 */
export async function getParentsByIds(uids: string[]): Promise<Parent[]> {
  if (uids.length === 0) return [];

  try {
    // Firestore 'in' query supports up to 10 items
    // For families, we expect at most 2-3 parents, so this is fine
    const q = query(
      collection(db, COLLECTION),
      where(documentId(), 'in', uids)
    );
    const snapshot = await getDocs(q);
    const parents = snapshot.docs.map(doc => doc.data() as Parent);
    logger.debug('parentService: Fetched parents by IDs', { count: parents.length, requested: uids.length });
    return parents;
  } catch (error) {
    logger.error('parentService: Failed to get parents by IDs', { uids }, error);
    throw new DatabaseError('Failed to get parents', { cause: error as Error });
  }
}

/**
 * Block a parent from accessing the family
 * Sets blocked: true on the parent doc - access checks should validate this
 */
export async function blockParent(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, uid), {
      blocked: true,
      blockedAt: Date.now()
    });
    logger.info('parentService: Parent blocked', { uid });
  } catch (error) {
    logger.error('parentService: Failed to block parent', { uid }, error);
    throw new DatabaseError('Failed to block parent', { cause: error as Error });
  }
}

/**
 * Unblock a parent
 */
export async function unblockParent(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, uid), {
      blocked: false,
      blockedAt: null
    });
    logger.info('parentService: Parent unblocked', { uid });
  } catch (error) {
    logger.error('parentService: Failed to unblock parent', { uid }, error);
    throw new DatabaseError('Failed to unblock parent', { cause: error as Error });
  }
}
