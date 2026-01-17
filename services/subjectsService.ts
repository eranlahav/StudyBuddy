/**
 * Subjects Service
 *
 * Handles all Firestore operations for subjects.
 * Provides typed CRUD operations with error handling.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Subject } from '../types';
import { logger, DatabaseError } from '../lib';

const COLLECTION = 'subjects';

/**
 * Subscribe to subjects collection changes
 */
export function subscribeToSubjects(
  onData: (subjects: Subject[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const subjects = snapshot.docs.map(doc => doc.data() as Subject);
      onData(subjects);
    },
    (error) => {
      logger.error('subjectsService: Subscription error', {}, error);
      onError?.(new DatabaseError('Failed to subscribe to subjects', { cause: error }));
    }
  );
}

/**
 * Add a new subject
 */
export async function addSubject(subject: Subject): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTION, subject.id), subject);
    logger.info('subjectsService: Subject added', { subjectId: subject.id, name: subject.name });
  } catch (error) {
    logger.error('subjectsService: Failed to add subject', { subjectId: subject.id }, error);
    throw new DatabaseError('Failed to add subject', { cause: error as Error });
  }
}

/**
 * Delete a subject
 */
export async function deleteSubject(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    logger.info('subjectsService: Subject deleted', { subjectId: id });
  } catch (error) {
    logger.error('subjectsService: Failed to delete subject', { subjectId: id }, error);
    throw new DatabaseError('Failed to delete subject', { cause: error as Error });
  }
}

/**
 * Seed default subjects (batch operation)
 */
export async function seedSubjects(subjects: Subject[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    subjects.forEach(subject => {
      batch.set(doc(db, COLLECTION, subject.id), subject);
    });
    await batch.commit();
    logger.info('subjectsService: Subjects seeded', { count: subjects.length });
  } catch (error) {
    logger.error('subjectsService: Failed to seed subjects', {}, error);
    throw new DatabaseError('Failed to seed subjects', { cause: error as Error });
  }
}

/**
 * Find a subject by ID
 */
export function findSubjectById(
  subjects: Subject[],
  id: string
): Subject | undefined {
  return subjects.find(s => s.id === id);
}

/**
 * Get topics for a subject
 */
export function getSubjectTopics(
  subjects: Subject[],
  subjectId: string
): string[] {
  const subject = findSubjectById(subjects, subjectId);
  return subject?.topics || [];
}
