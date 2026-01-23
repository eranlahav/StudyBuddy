/**
 * Goals Service
 *
 * Manages parent-defined learning goals for children.
 * Goals influence recommendation scoring (30% weight).
 *
 * Collection: learningGoals
 */

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { LearningGoal } from '../types';
import { logger, DatabaseError, generateId } from '../lib';

const COLLECTION = 'learningGoals';

/**
 * Add a new learning goal
 */
export async function addLearningGoal(
  childId: string,
  familyId: string,
  subjectId: string,
  parentId: string,
  topic: string,
  targetDate: number | null,
  description: string
): Promise<LearningGoal> {
  const goal: LearningGoal = {
    id: generateId(),
    childId,
    familyId,
    subjectId,
    topic,
    targetDate,
    description,
    createdAt: Date.now(),
    createdBy: parentId
  };

  try {
    await addDoc(collection(db, COLLECTION), goal);
    logger.info('goalsService: Learning goal added', {
      goalId: goal.id,
      childId,
      subjectId,
      topic,
      hasDeadline: targetDate !== null
    });
    return goal;
  } catch (error) {
    logger.error('goalsService: Failed to add learning goal', {
      childId,
      subjectId,
      topic
    }, error);
    throw new DatabaseError('Failed to add learning goal', { cause: error as Error });
  }
}

/**
 * Get all learning goals for a child
 */
export async function getLearningGoals(childId: string): Promise<LearningGoal[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('childId', '==', childId)
    );
    const snapshot = await getDocs(q);
    const goals = snapshot.docs.map(doc => doc.data() as LearningGoal);

    logger.debug('goalsService: Retrieved learning goals', {
      childId,
      count: goals.length
    });

    return goals;
  } catch (error) {
    logger.error('goalsService: Failed to retrieve learning goals', { childId }, error);
    throw new DatabaseError('Failed to retrieve learning goals', { cause: error as Error });
  }
}

/**
 * Get learning goals filtered by child and subject
 */
export async function getGoalsBySubject(
  childId: string,
  subjectId: string
): Promise<LearningGoal[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('childId', '==', childId),
      where('subjectId', '==', subjectId)
    );
    const snapshot = await getDocs(q);
    const goals = snapshot.docs.map(doc => doc.data() as LearningGoal);

    logger.debug('goalsService: Retrieved goals by subject', {
      childId,
      subjectId,
      count: goals.length
    });

    return goals;
  } catch (error) {
    logger.error('goalsService: Failed to retrieve goals by subject', {
      childId,
      subjectId
    }, error);
    throw new DatabaseError('Failed to retrieve goals by subject', { cause: error as Error });
  }
}

/**
 * Delete a learning goal
 */
export async function deleteLearningGoal(goalId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, goalId));
    logger.info('goalsService: Learning goal deleted', { goalId });
  } catch (error) {
    logger.error('goalsService: Failed to delete learning goal', { goalId }, error);
    throw new DatabaseError('Failed to delete learning goal', { cause: error as Error });
  }
}

/**
 * Subscribe to learning goals for a child (real-time updates)
 */
export function subscribeToGoals(
  childId: string,
  callback: (goals: LearningGoal[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('childId', '==', childId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const goals = snapshot.docs.map(doc => doc.data() as LearningGoal);
      callback(goals);
    },
    (error) => {
      logger.error('goalsService: Subscription error', { childId }, error);
      throw new DatabaseError('Failed to subscribe to goals', { cause: error });
    }
  );
}
