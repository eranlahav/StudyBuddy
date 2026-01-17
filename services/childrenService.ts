/**
 * Children Service
 *
 * Handles all Firestore operations for child profiles.
 * Provides typed CRUD operations with error handling.
 * Supports multi-tenant filtering via familyId.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ChildProfile } from '../types';
import { logger, DatabaseError } from '../lib';

const COLLECTION = 'children';

/**
 * Subscribe to children collection changes
 * @param familyId - Optional family ID to filter children by tenant
 */
export function subscribeToChildren(
  onData: (children: ChildProfile[]) => void,
  onError?: (error: Error) => void,
  familyId?: string
): Unsubscribe {
  // Use query with familyId filter if provided
  const q = familyId
    ? query(collection(db, COLLECTION), where('familyId', '==', familyId))
    : collection(db, COLLECTION);

  return onSnapshot(
    q,
    (snapshot) => {
      const children = snapshot.docs.map(doc => doc.data() as ChildProfile);
      onData(children);
    },
    (error) => {
      logger.error('childrenService: Subscription error', { familyId }, error);
      onError?.(new DatabaseError('Failed to subscribe to children', { cause: error }));
    }
  );
}

/**
 * Add a new child profile
 */
export async function addChild(child: ChildProfile): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTION, child.id), child);
    logger.info('childrenService: Child added', { childId: child.id, name: child.name });
  } catch (error) {
    logger.error('childrenService: Failed to add child', { childId: child.id }, error);
    throw new DatabaseError('Failed to add child', { cause: error as Error });
  }
}

/**
 * Update an existing child profile
 */
export async function updateChild(
  id: string,
  updates: Partial<ChildProfile>
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), updates);
    logger.debug('childrenService: Child updated', { childId: id, fields: Object.keys(updates) });
  } catch (error) {
    logger.error('childrenService: Failed to update child', { childId: id }, error);
    throw new DatabaseError('Failed to update child', { cause: error as Error });
  }
}

/**
 * Delete a child profile
 */
export async function deleteChild(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    logger.info('childrenService: Child deleted', { childId: id });
  } catch (error) {
    logger.error('childrenService: Failed to delete child', { childId: id }, error);
    throw new DatabaseError('Failed to delete child', { cause: error as Error });
  }
}

/**
 * Reset a child's stars and streak to zero
 */
export async function resetChildStats(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      stars: 0,
      streak: 0
    });
    logger.info('childrenService: Child stats reset', { childId: id });
  } catch (error) {
    logger.error('childrenService: Failed to reset child stats', { childId: id }, error);
    throw new DatabaseError('Failed to reset child stats', { cause: error as Error });
  }
}

/**
 * Award points and increment streak for a child
 */
export async function awardPoints(
  id: string,
  currentStars: number,
  currentStreak: number,
  pointsEarned: number
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      stars: currentStars + pointsEarned,
      streak: currentStreak + 1
    });
    logger.debug('childrenService: Points awarded', {
      childId: id,
      pointsEarned,
      newTotal: currentStars + pointsEarned
    });
  } catch (error) {
    logger.error('childrenService: Failed to award points', { childId: id }, error);
    throw new DatabaseError('Failed to award points', { cause: error as Error });
  }
}
