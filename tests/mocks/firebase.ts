/**
 * Firebase Mock
 *
 * Mocks Firestore operations for testing without a real database.
 * Provides an in-memory store that can be manipulated in tests.
 */

import { vi } from 'vitest';

// In-memory data store for tests
export const mockFirestoreData: Record<string, Record<string, unknown>> = {
  children: {},
  subjects: {},
  sessions: {},
  upcomingTests: {},
};

// Helper to reset mock data between tests
export function resetMockFirestore() {
  Object.keys(mockFirestoreData).forEach(collection => {
    mockFirestoreData[collection] = {};
  });
}

// Helper to seed mock data
export function seedMockFirestore(collection: string, data: Record<string, unknown>[]) {
  data.forEach(item => {
    const id = (item as { id: string }).id;
    mockFirestoreData[collection][id] = item;
  });
}

// Mock snapshot for onSnapshot callbacks
function createMockSnapshot(collection: string) {
  const docs = Object.entries(mockFirestoreData[collection] || {}).map(([id, data]) => ({
    id,
    data: () => data,
    exists: () => true,
  }));

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: { id: string; data: () => unknown }) => void) => {
      docs.forEach(callback);
    },
  };
}

// Store for snapshot listeners (to simulate real-time updates)
const snapshotListeners: Map<string, Set<(snapshot: ReturnType<typeof createMockSnapshot>) => void>> = new Map();

// Trigger snapshot listeners (call this after modifying mockFirestoreData)
export function triggerSnapshotUpdate(collection: string) {
  const listeners = snapshotListeners.get(collection);
  if (listeners) {
    const snapshot = createMockSnapshot(collection);
    listeners.forEach(callback => callback(snapshot));
  }
}

// Mock Firestore functions
export const mockCollection = vi.fn((_db: unknown, collectionName: string) => ({
  _collectionName: collectionName,
}));

export const mockDoc = vi.fn((_db: unknown, collectionName: string, docId: string) => ({
  _collectionName: collectionName,
  _docId: docId,
}));

export const mockSetDoc = vi.fn(async (docRef: { _collectionName: string; _docId: string }, data: unknown) => {
  mockFirestoreData[docRef._collectionName][docRef._docId] = data;
  triggerSnapshotUpdate(docRef._collectionName);
});

export const mockUpdateDoc = vi.fn(async (docRef: { _collectionName: string; _docId: string }, updates: unknown) => {
  const existing = mockFirestoreData[docRef._collectionName][docRef._docId] || {};
  mockFirestoreData[docRef._collectionName][docRef._docId] = { ...existing as object, ...updates as object };
  triggerSnapshotUpdate(docRef._collectionName);
});

export const mockDeleteDoc = vi.fn(async (docRef: { _collectionName: string; _docId: string }) => {
  delete mockFirestoreData[docRef._collectionName][docRef._docId];
  triggerSnapshotUpdate(docRef._collectionName);
});

export const mockOnSnapshot = vi.fn((
  collectionRef: { _collectionName: string },
  onData: (snapshot: ReturnType<typeof createMockSnapshot>) => void,
  _onError?: (error: Error) => void
) => {
  const collectionName = collectionRef._collectionName;

  // Initialize listener set for this collection
  if (!snapshotListeners.has(collectionName)) {
    snapshotListeners.set(collectionName, new Set());
  }
  snapshotListeners.get(collectionName)!.add(onData);

  // Immediately call with current data
  const snapshot = createMockSnapshot(collectionName);
  onData(snapshot);

  // Return unsubscribe function
  return () => {
    snapshotListeners.get(collectionName)?.delete(onData);
  };
});

export const mockWriteBatch = vi.fn(() => {
  const operations: Array<{ type: 'set' | 'update' | 'delete'; collection: string; id: string; data?: unknown }> = [];

  return {
    set: vi.fn((docRef: { _collectionName: string; _docId: string }, data: unknown) => {
      operations.push({ type: 'set', collection: docRef._collectionName, id: docRef._docId, data });
    }),
    update: vi.fn((docRef: { _collectionName: string; _docId: string }, data: unknown) => {
      operations.push({ type: 'update', collection: docRef._collectionName, id: docRef._docId, data });
    }),
    delete: vi.fn((docRef: { _collectionName: string; _docId: string }) => {
      operations.push({ type: 'delete', collection: docRef._collectionName, id: docRef._docId });
    }),
    commit: vi.fn(async () => {
      operations.forEach(op => {
        if (op.type === 'set') {
          mockFirestoreData[op.collection][op.id] = op.data;
        } else if (op.type === 'update') {
          const existing = mockFirestoreData[op.collection][op.id] || {};
          mockFirestoreData[op.collection][op.id] = { ...existing as object, ...op.data as object };
        } else if (op.type === 'delete') {
          delete mockFirestoreData[op.collection][op.id];
        }
      });
      // Trigger updates for all affected collections
      const affectedCollections = new Set(operations.map(op => op.collection));
      affectedCollections.forEach(triggerSnapshotUpdate);
    }),
  };
});

// Mock db object
export const mockDb = {};

// Setup function to apply mocks
export function setupFirebaseMocks() {
  vi.mock('firebase/firestore', () => ({
    collection: mockCollection,
    doc: mockDoc,
    setDoc: mockSetDoc,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
    onSnapshot: mockOnSnapshot,
    writeBatch: mockWriteBatch,
  }));

  vi.mock('../firebaseConfig', () => ({
    db: mockDb,
  }));
}
