/**
 * Tests for services/authService.ts
 *
 * Tests Google authentication flow including sign-in, sign-out,
 * auth state subscription, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User as FirebaseUser, Unsubscribe } from 'firebase/auth';

// Mock Firebase auth module
vi.mock('firebase/auth', async () => {
  const { vi } = await import('vitest');

  // Define mock class inside factory to avoid hoisting issues
  class MockGoogleAuthProvider {
    setCustomParameters = vi.fn();
  }

  return {
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
    GoogleAuthProvider: MockGoogleAuthProvider
  };
});

// Mock Firebase config
vi.mock('../firebaseConfig', () => ({
  auth: { currentUser: null }
}));

// Mock the logger
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
  };
});

// Import the actual firebase/auth module to access mocked functions
import * as firebaseAuth from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Import after mocks
import {
  signInWithGoogle,
  signOut,
  subscribeToAuthState,
  getCurrentUser
} from './authService';
import { AuthenticationError } from '../lib';

// Test data
const mockFirebaseUser: Partial<FirebaseUser> = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  emailVerified: true
};

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset currentUser
    (auth as { currentUser: FirebaseUser | null }).currentUser = null;
  });

  describe('signInWithGoogle', () => {
    it('returns Firebase user on successful sign-in', async () => {
      vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValue({
        user: mockFirebaseUser as FirebaseUser,
        providerId: 'google.com',
        operationType: 'signIn'
      } as any);

      const result = await signInWithGoogle();

      expect(result).toEqual(mockFirebaseUser);
      expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
    });

    it('throws AuthenticationError on sign-in failure', async () => {
      const mockError = new Error('Popup closed by user');
      vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValue(mockError);

      await expect(signInWithGoogle()).rejects.toThrow(AuthenticationError);
    });

    it('error message is Google sign-in failed', async () => {
      const mockError = new Error('Network error');
      vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValue(mockError);

      try {
        await signInWithGoogle();
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as Error).message).toBe('Google sign-in failed');
      }
    });

    it('preserves original error as cause', async () => {
      const mockError = new Error('Network error');
      vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValue(mockError);

      try {
        await signInWithGoogle();
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AuthenticationError);
        expect((e as AuthenticationError).cause).toBe(mockError);
      }
    });
  });

  describe('signOut', () => {
    it('signs out successfully', async () => {
      vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);

      await expect(signOut()).resolves.toBeUndefined();
      expect(firebaseAuth.signOut).toHaveBeenCalled();
    });

    it('throws AuthenticationError on sign-out failure', async () => {
      const mockError = new Error('Sign-out network error');
      vi.mocked(firebaseAuth.signOut).mockRejectedValue(mockError);

      await expect(signOut()).rejects.toThrow(AuthenticationError);
    });

    it('error message is Sign-out failed', async () => {
      const mockError = new Error('Firebase error');
      vi.mocked(firebaseAuth.signOut).mockRejectedValue(mockError);

      try {
        await signOut();
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as Error).message).toBe('Sign-out failed');
      }
    });

    it('preserves original error as cause', async () => {
      const mockError = new Error('Firebase error');
      vi.mocked(firebaseAuth.signOut).mockRejectedValue(mockError);

      try {
        await signOut();
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AuthenticationError);
        expect((e as AuthenticationError).cause).toBe(mockError);
      }
    });
  });

  describe('subscribeToAuthState', () => {
    it('calls onUser callback with user when signed in', () => {
      const onUser = vi.fn();
      let capturedCallback: ((user: FirebaseUser | null) => void) | undefined;

      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((
        _auth: any,
        callback: any
      ) => {
        capturedCallback = callback;
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToAuthState(onUser);

      // Simulate auth state change to signed-in
      capturedCallback!(mockFirebaseUser as FirebaseUser);

      expect(onUser).toHaveBeenCalledWith(mockFirebaseUser);
    });

    it('calls onUser callback with null when signed out', () => {
      const onUser = vi.fn();
      let capturedCallback: ((user: FirebaseUser | null) => void) | undefined;

      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((
        _auth: any,
        callback: any
      ) => {
        capturedCallback = callback;
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToAuthState(onUser);

      // Simulate auth state change to signed-out
      capturedCallback!(null);

      expect(onUser).toHaveBeenCalledWith(null);
    });

    it('returns unsubscribe function', () => {
      const onUser = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(firebaseAuth.onAuthStateChanged).mockReturnValue(mockUnsubscribe as unknown as Unsubscribe);

      const unsubscribe = subscribeToAuthState(onUser);

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('calls onError callback on auth error', () => {
      const onUser = vi.fn();
      const onError = vi.fn();
      let capturedErrorCallback: ((error: Error) => void) | undefined;

      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((
        _auth: any,
        _callback: any,
        errorCallback: any
      ) => {
        capturedErrorCallback = errorCallback;
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToAuthState(onUser, onError);

      // Simulate auth error
      const authError = new Error('Auth subscription failed');
      capturedErrorCallback!(authError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(AuthenticationError);
    });

    it('handles missing onError callback gracefully', () => {
      const onUser = vi.fn();
      let capturedErrorCallback: ((error: Error) => void) | undefined;

      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((
        _auth: any,
        _callback: any,
        errorCallback: any
      ) => {
        capturedErrorCallback = errorCallback;
        return vi.fn() as unknown as Unsubscribe;
      });

      subscribeToAuthState(onUser); // No onError provided

      // Simulate auth error - should not throw
      const authError = new Error('Auth error');
      expect(() => capturedErrorCallback!(authError)).not.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('returns current user when signed in', () => {
      (auth as { currentUser: FirebaseUser | null }).currentUser = mockFirebaseUser as FirebaseUser;

      const result = getCurrentUser();

      expect(result).toBe(mockFirebaseUser);
    });

    it('returns null when not signed in', () => {
      (auth as { currentUser: FirebaseUser | null }).currentUser = null;

      const result = getCurrentUser();

      expect(result).toBeNull();
    });
  });
});
