/**
 * Authentication Service
 *
 * Handles Firebase Google Authentication operations.
 * Manages sign-in, sign-out, and auth state changes.
 */

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  Unsubscribe
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { logger, AuthenticationError } from '../lib';

const googleProvider = new GoogleAuthProvider();

// Force account selection on every sign-in
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google popup
 * Returns the Firebase user on success
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    logger.info('authService: Starting Google sign-in');
    const result = await signInWithPopup(auth, googleProvider);
    logger.info('authService: Google sign-in successful', {
      uid: result.user.uid,
      email: result.user.email
    });
    return result.user;
  } catch (error) {
    logger.error('authService: Google sign-in failed', {}, error);
    throw new AuthenticationError('Google sign-in failed', { cause: error as Error });
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    logger.info('authService: Signing out');
    await firebaseSignOut(auth);
    logger.info('authService: Sign-out successful');
  } catch (error) {
    logger.error('authService: Sign-out failed', {}, error);
    throw new AuthenticationError('Sign-out failed', { cause: error as Error });
  }
}

/**
 * Subscribe to auth state changes
 * Called whenever user signs in or out
 */
export function subscribeToAuthState(
  onUser: (user: FirebaseUser | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onAuthStateChanged(
    auth,
    (user) => {
      logger.debug('authService: Auth state changed', {
        isSignedIn: !!user,
        email: user?.email
      });
      onUser(user);
    },
    (error) => {
      logger.error('authService: Auth state subscription error', {}, error);
      onError?.(new AuthenticationError('Auth state subscription failed', { cause: error }));
    }
  );
}

/**
 * Get the current user (synchronous)
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}
