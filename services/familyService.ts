/**
 * Family Service
 *
 * Handles all Firestore operations for family (tenant) management.
 * Each family groups parents and children together for data isolation.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  getDocs,
  arrayUnion,
  arrayRemove,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Family } from '../types';
import { logger, DatabaseError, generateId } from '../lib';

const COLLECTION = 'families';

/**
 * Get a family by ID
 */
export async function getFamily(familyId: string): Promise<Family | null> {
  try {
    const docRef = doc(db, COLLECTION, familyId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      logger.debug('familyService: Family not found', { familyId });
      return null;
    }

    return docSnap.data() as Family;
  } catch (error) {
    logger.error('familyService: Failed to get family', { familyId }, error);
    throw new DatabaseError('Failed to get family', { cause: error as Error });
  }
}

/**
 * Create a new family
 */
export async function createFamily(
  name: string,
  createdBy: string
): Promise<Family> {
  const family: Family = {
    id: generateId(),
    name,
    createdAt: Date.now(),
    createdBy,
    parentIds: [createdBy]
  };

  try {
    await setDoc(doc(db, COLLECTION, family.id), family);
    logger.info('familyService: Family created', {
      familyId: family.id,
      name,
      createdBy
    });
    return family;
  } catch (error) {
    logger.error('familyService: Failed to create family', { name }, error);
    throw new DatabaseError('Failed to create family', { cause: error as Error });
  }
}

/**
 * Add a parent to an existing family
 */
export async function addParentToFamily(
  familyId: string,
  parentUid: string
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, familyId), {
      parentIds: arrayUnion(parentUid)
    });
    logger.info('familyService: Parent added to family', { familyId, parentUid });
  } catch (error) {
    logger.error('familyService: Failed to add parent to family', { familyId, parentUid }, error);
    throw new DatabaseError('Failed to add parent to family', { cause: error as Error });
  }
}

/**
 * Update family name
 */
export async function updateFamilyName(
  familyId: string,
  name: string
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, familyId), { name });
    logger.info('familyService: Family name updated', { familyId, name });
  } catch (error) {
    logger.error('familyService: Failed to update family name', { familyId }, error);
    throw new DatabaseError('Failed to update family name', { cause: error as Error });
  }
}

/**
 * Subscribe to a family document for real-time updates
 */
export function subscribeToFamily(
  familyId: string,
  onData: (family: Family | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTION, familyId),
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as Family);
      } else {
        onData(null);
      }
    },
    (error) => {
      logger.error('familyService: Subscription error', { familyId }, error);
      onError?.(new DatabaseError('Failed to subscribe to family', { cause: error }));
    }
  );
}

/**
 * Get all families (admin only)
 */
export async function getAllFamilies(): Promise<Family[]> {
  try {
    const q = query(collection(db, COLLECTION));
    const snapshot = await getDocs(q);
    const families = snapshot.docs.map(doc => doc.data() as Family);
    logger.debug('familyService: Fetched all families', { count: families.length });
    return families;
  } catch (error) {
    logger.error('familyService: Failed to get all families', {}, error);
    throw new DatabaseError('Failed to get all families', { cause: error as Error });
  }
}

/**
 * Remove a parent from a family
 * Returns false if this is the last parent (cannot remove)
 */
export async function removeParentFromFamily(
  familyId: string,
  parentUid: string
): Promise<boolean> {
  try {
    // First check if this is the last parent
    const family = await getFamily(familyId);
    if (!family) {
      throw new Error('Family not found');
    }

    if (family.parentIds.length <= 1) {
      logger.warn('familyService: Cannot remove last parent from family', { familyId, parentUid });
      return false;
    }

    await updateDoc(doc(db, COLLECTION, familyId), {
      parentIds: arrayRemove(parentUid)
    });
    logger.info('familyService: Parent removed from family', { familyId, parentUid });
    return true;
  } catch (error) {
    logger.error('familyService: Failed to remove parent from family', { familyId, parentUid }, error);
    throw new DatabaseError('Failed to remove parent from family', { cause: error as Error });
  }
}

/**
 * Update family fields (general update function for admin)
 */
export async function updateFamily(
  familyId: string,
  updates: Partial<Pick<Family, 'name'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, familyId), updates);
    logger.info('familyService: Family updated', { familyId, fields: Object.keys(updates) });
  } catch (error) {
    logger.error('familyService: Failed to update family', { familyId }, error);
    throw new DatabaseError('Failed to update family', { cause: error as Error });
  }
}
