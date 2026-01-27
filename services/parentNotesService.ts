/**
 * Parent Notes Service
 *
 * CRUD operations for parent observation notes.
 * Notes are stored in /parentNotes collection and also trigger
 * profile updates via processParentNoteSignal().
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ParentNote, ParentNoteCategory } from '../types';
import { logger, DatabaseError, generateId } from '../lib';
import { processParentNoteSignal } from './signalService';

/**
 * Input for creating a new parent note
 */
export interface CreateParentNoteInput {
  childId: string;
  familyId: string;
  parentId: string;
  sessionId: string;
  questionIndex: number;
  topic: string;
  note: string;
  category: ParentNoteCategory;
  questionCorrect: boolean; // Needed for processParentNoteSignal
}

/**
 * Add a new parent note
 * Saves to Firestore and processes through signalService
 */
export async function addParentNote(input: CreateParentNoteInput): Promise<ParentNote> {
  const noteId = generateId('note');

  const parentNote: ParentNote = {
    id: noteId,
    childId: input.childId,
    familyId: input.familyId,
    parentId: input.parentId,
    sessionId: input.sessionId,
    questionIndex: input.questionIndex,
    topic: input.topic,
    note: input.note,
    category: input.category,
    timestamp: Date.now()
  };

  try {
    // Save to Firestore
    const notesRef = collection(db, 'parentNotes');
    await addDoc(notesRef, parentNote);

    logger.info('parentNotesService: Note saved', {
      noteId,
      childId: input.childId,
      topic: input.topic,
      category: input.category
    });

    // Process signal to update learner profile
    await processParentNoteSignal(parentNote, input.questionCorrect);

    return parentNote;
  } catch (error) {
    logger.error('parentNotesService: Failed to add note', {
      childId: input.childId,
      topic: input.topic
    }, error);
    throw new DatabaseError('Failed to add parent note', { cause: error as Error });
  }
}

/**
 * Get all notes for a child, ordered by timestamp descending (newest first)
 */
export async function getChildNotes(childId: string): Promise<ParentNote[]> {
  try {
    const notesRef = collection(db, 'parentNotes');
    const q = query(
      notesRef,
      where('childId', '==', childId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const notes: ParentNote[] = [];

    snapshot.forEach((doc) => {
      notes.push(doc.data() as ParentNote);
    });

    logger.debug('parentNotesService: Fetched child notes', {
      childId,
      count: notes.length
    });

    return notes;
  } catch (error) {
    logger.error('parentNotesService: Failed to get child notes', { childId }, error);
    throw new DatabaseError('Failed to get child notes', { cause: error as Error });
  }
}

/**
 * Get notes for a specific session
 */
export async function getSessionNotes(sessionId: string): Promise<ParentNote[]> {
  try {
    const notesRef = collection(db, 'parentNotes');
    const q = query(
      notesRef,
      where('sessionId', '==', sessionId),
      orderBy('questionIndex', 'asc')
    );

    const snapshot = await getDocs(q);
    const notes: ParentNote[] = [];

    snapshot.forEach((doc) => {
      notes.push(doc.data() as ParentNote);
    });

    logger.debug('parentNotesService: Fetched session notes', {
      sessionId,
      count: notes.length
    });

    return notes;
  } catch (error) {
    logger.error('parentNotesService: Failed to get session notes', { sessionId }, error);
    throw new DatabaseError('Failed to get session notes', { cause: error as Error });
  }
}

/**
 * Delete a parent note by ID
 * Note: This does NOT reverse the profile signal adjustment
 */
export async function deleteNote(noteId: string): Promise<void> {
  try {
    // Find the document by noteId field
    const notesRef = collection(db, 'parentNotes');
    const q = query(notesRef, where('id', '==', noteId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      logger.warn('parentNotesService: Note not found for deletion', { noteId });
      return;
    }

    // Delete the document
    const docRef = snapshot.docs[0].ref;
    await deleteDoc(docRef);

    logger.info('parentNotesService: Note deleted', { noteId });
  } catch (error) {
    logger.error('parentNotesService: Failed to delete note', { noteId }, error);
    throw new DatabaseError('Failed to delete note', { cause: error as Error });
  }
}

/**
 * Hebrew labels for note categories
 */
export const CATEGORY_LABELS: Record<ParentNoteCategory, string> = {
  guessed: 'ניחש/ה',
  struggled: 'התקשה/התה',
  skipped_step: 'דילג/ה על שלב',
  misunderstood: 'לא הבין/ה את השאלה',
  other: 'אחר'
};
