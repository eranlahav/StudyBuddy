/**
 * Evaluations Service
 *
 * Handles all Firestore operations for school test evaluations.
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
import { Evaluation } from '../types';
import { logger, DatabaseError } from '../lib';
import { deleteEvaluationFiles } from './storageService';
import { isTestKid } from '../constants/testKids';
import { addTestEvaluation, updateTestEvaluation, deleteTestEvaluation, isTestEvaluation } from './testKidsStorage';

const COLLECTION = 'evaluations';

/**
 * Subscribe to evaluations collection changes for a family
 */
export function subscribeToEvaluations(
  familyId: string,
  onData: (evaluations: Evaluation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('familyId', '==', familyId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const evaluations = snapshot.docs.map(doc => doc.data() as Evaluation);
      // Sort by date, newest first
      evaluations.sort((a, b) => b.date - a.date);
      onData(evaluations);
    },
    (error) => {
      logger.error('evaluationsService: Subscription error', { familyId }, error);
      onError?.(new DatabaseError('Failed to subscribe to evaluations', { cause: error }));
    }
  );
}

/**
 * Subscribe to evaluations for a specific child
 */
export function subscribeToChildEvaluations(
  childId: string,
  onData: (evaluations: Evaluation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('childId', '==', childId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const evaluations = snapshot.docs.map(doc => doc.data() as Evaluation);
      // Sort by date, newest first
      evaluations.sort((a, b) => b.date - a.date);
      onData(evaluations);
    },
    (error) => {
      logger.error('evaluationsService: Child subscription error', { childId }, error);
      onError?.(new DatabaseError('Failed to subscribe to child evaluations', { cause: error }));
    }
  );
}

/**
 * Add a new evaluation
 * Writes to localStorage for test kids (persistent test data)
 */
export async function addEvaluation(evaluation: Evaluation): Promise<void> {
  // Write to localStorage for test kids
  if (isTestKid(evaluation.childId)) {
    logger.debug('evaluationsService: Writing to localStorage for test kid', {
      evaluationId: evaluation.id,
      childId: evaluation.childId
    });
    addTestEvaluation(evaluation);
    return;
  }

  try {
    await setDoc(doc(db, COLLECTION, evaluation.id), evaluation);
    logger.info('evaluationsService: Evaluation added', {
      evaluationId: evaluation.id,
      childId: evaluation.childId,
      subject: evaluation.subjectName,
      testName: evaluation.testName,
      score: evaluation.percentage ? `${evaluation.percentage}%` : 'N/A'
    });
  } catch (error) {
    logger.error('evaluationsService: Failed to add evaluation', {
      evaluationId: evaluation.id
    }, error);
    throw new DatabaseError('Failed to add evaluation', { cause: error as Error });
  }
}

/**
 * Update an existing evaluation
 * Writes to localStorage for test kids (persistent test data)
 */
export async function updateEvaluation(
  id: string,
  updates: Partial<Evaluation>
): Promise<void> {
  // Write to localStorage for test evaluations
  if (isTestEvaluation(id)) {
    logger.debug('evaluationsService: Updating in localStorage', {
      evaluationId: id,
      updatedFields: Object.keys(updates)
    });
    updateTestEvaluation(id, updates);
    return;
  }

  try {
    await updateDoc(doc(db, COLLECTION, id), updates);
    logger.info('evaluationsService: Evaluation updated', {
      evaluationId: id,
      updatedFields: Object.keys(updates)
    });
  } catch (error) {
    logger.error('evaluationsService: Failed to update evaluation', {
      evaluationId: id
    }, error);
    throw new DatabaseError('Failed to update evaluation', { cause: error as Error });
  }
}

/**
 * Delete an evaluation and its files
 * Deletes from localStorage for test kids (persistent test data)
 */
export async function deleteEvaluation(
  id: string,
  fileUrls?: string[]
): Promise<void> {
  // Delete from localStorage for test evaluations
  if (isTestEvaluation(id)) {
    logger.debug('evaluationsService: Deleting from localStorage', { evaluationId: id });
    deleteTestEvaluation(id);
    return;
  }

  try {
    // Delete files from storage first
    if (fileUrls && fileUrls.length > 0) {
      await deleteEvaluationFiles(fileUrls);
    }

    // Delete document from Firestore
    await deleteDoc(doc(db, COLLECTION, id));
    logger.info('evaluationsService: Evaluation deleted', { evaluationId: id });
  } catch (error) {
    logger.error('evaluationsService: Failed to delete evaluation', {
      evaluationId: id
    }, error);
    throw new DatabaseError('Failed to delete evaluation', { cause: error as Error });
  }
}

/**
 * Filter evaluations by child ID (in-memory)
 */
export function filterEvaluationsByChild(
  evaluations: Evaluation[],
  childId: string
): Evaluation[] {
  return evaluations.filter(e => e.childId === childId);
}

/**
 * Filter evaluations by subject (in-memory)
 */
export function filterEvaluationsBySubject(
  evaluations: Evaluation[],
  subjectId: string
): Evaluation[] {
  return evaluations.filter(e => e.subject === subjectId);
}

/**
 * Get evaluations within a date range
 */
export function filterEvaluationsByDateRange(
  evaluations: Evaluation[],
  startDate: number,
  endDate: number
): Evaluation[] {
  return evaluations.filter(
    e => e.date >= startDate && e.date <= endDate
  );
}

/**
 * Calculate statistics from evaluations
 */
export function calculateEvaluationStats(evaluations: Evaluation[]): {
  totalEvaluations: number;
  averageScore: number;
  weakTopicsCount: number;
  strongTopicsCount: number;
  bySubject: Record<string, { count: number; avgScore: number }>;
} {
  if (evaluations.length === 0) {
    return {
      totalEvaluations: 0,
      averageScore: 0,
      weakTopicsCount: 0,
      strongTopicsCount: 0,
      bySubject: {}
    };
  }

  const withScores = evaluations.filter(e => e.percentage !== undefined);
  const averageScore = withScores.length > 0
    ? Math.round(withScores.reduce((sum, e) => sum + (e.percentage || 0), 0) / withScores.length)
    : 0;

  const weakTopicsCount = evaluations.reduce(
    (sum, e) => sum + e.weakTopics.length,
    0
  );

  const strongTopicsCount = evaluations.reduce(
    (sum, e) => sum + e.strongTopics.length,
    0
  );

  // Group by subject
  const bySubject: Record<string, { count: number; scores: number[] }> = {};
  for (const evaluation of evaluations) {
    const key = evaluation.subject || 'other';
    if (!bySubject[key]) {
      bySubject[key] = { count: 0, scores: [] };
    }
    bySubject[key].count++;
    if (evaluation.percentage !== undefined) {
      bySubject[key].scores.push(evaluation.percentage);
    }
  }

  const bySubjectStats: Record<string, { count: number; avgScore: number }> = {};
  for (const [subject, data] of Object.entries(bySubject)) {
    bySubjectStats[subject] = {
      count: data.count,
      avgScore: data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 0
    };
  }

  return {
    totalEvaluations: evaluations.length,
    averageScore,
    weakTopicsCount,
    strongTopicsCount,
    bySubject: bySubjectStats
  };
}

/**
 * Get trend data for charting
 */
export function getEvaluationTrendData(
  evaluations: Evaluation[]
): Array<{
  date: number;
  score: number;
  subject: string;
  subjectName: string;
  testName: string;
}> {
  return evaluations
    .filter(e => e.percentage !== undefined)
    .map(e => ({
      date: e.date,
      score: e.percentage!,
      subject: e.subject,
      subjectName: e.subjectName,
      testName: e.testName
    }))
    .sort((a, b) => a.date - b.date);
}
