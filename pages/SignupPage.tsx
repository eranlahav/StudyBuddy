/**
 * Signup Page - Invite-based registration
 *
 * Handles new user signup via invite codes.
 * URL format: /#/signup?invite=XXXXXXXX
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { useStore } from '../store';
import {
  validateInviteCode,
  acceptInvite,
  createParent,
  addParentToFamily,
  getParent
} from '../services';
import { Invite } from '../types';
import { getUserMessage, logger } from '../lib';

// Google logo SVG component
const GoogleLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" width="20" height="20">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

type SignupState = 'validating' | 'ready' | 'signing-up' | 'success' | 'error';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithGoogle, parent } = useStore();

  const [state, setState] = useState<SignupState>('validating');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState('');

  const inviteCode = searchParams.get('invite');

  // Validate invite code on mount
  useEffect(() => {
    if (!inviteCode) {
      setError('לא סופק קוד הזמנה. בקשו קישור הזמנה חדש.');
      setState('error');
      return;
    }

    validateInviteCode(inviteCode)
      .then((validInvite) => {
        setInvite(validInvite);
        setState('ready');
      })
      .catch((err) => {
        logger.error('SignupPage: Invite validation failed', { code: inviteCode }, err);
        setError(getUserMessage(err));
        setState('error');
      });
  }, [inviteCode]);

  // If user is already logged in, redirect
  useEffect(() => {
    if (parent) {
      navigate('/parent', { replace: true });
    }
  }, [parent, navigate]);

  const handleGoogleSignup = async () => {
    if (!invite) return;

    setState('signing-up');
    setError('');

    try {
      // Sign in with Google
      await signInWithGoogle();

      // Note: The auth state change handler in store.tsx will need special handling
      // for invite-based signup. For now, we handle it here by checking if the
      // parent was created as expected.

      // Small delay to let auth state settle
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get current auth user
      const { auth } = await import('../firebaseConfig');
      const firebaseUser = auth.currentUser;

      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('Failed to get authenticated user');
      }

      // Check if parent already exists (returning user)
      const existingParent = await getParent(firebaseUser.uid);

      if (existingParent) {
        // User already has an account - they should use login instead
        setError('יש לכם כבר חשבון. השתמשו בדף ההתחברות.');
        setState('error');
        return;
      }

      // Create the new parent with the invite's family
      const newParent = await createParent(
        firebaseUser.uid,
        firebaseUser.email,
        firebaseUser.displayName || firebaseUser.email.split('@')[0],
        firebaseUser.photoURL,
        invite.familyId
      );

      // Add parent to family's parentIds
      await addParentToFamily(invite.familyId, firebaseUser.uid);

      // Mark invite as used
      await acceptInvite(invite.id, firebaseUser.uid);

      logger.info('SignupPage: Signup complete', {
        parentId: newParent.id,
        familyId: invite.familyId
      });

      setState('success');

      // Redirect after short delay
      setTimeout(() => {
        navigate('/parent', { replace: true });
      }, 2000);

    } catch (err: unknown) {
      logger.error('SignupPage: Signup failed', {}, err);

      const hasCode = (e: unknown): e is { code: string } =>
        typeof e === 'object' && e !== null && 'code' in e;

      if (hasCode(err)) {
        switch (err.code) {
          case 'auth/popup-closed-by-user':
            setError('החלון נסגר. נסו שוב.');
            break;
          case 'auth/popup-blocked':
            setError('החלון נחסם. אפשרו חלונות קופצים ונסו שוב.');
            break;
          default:
            setError(getUserMessage(err));
        }
      } else {
        setError(getUserMessage(err));
      }
      setState('ready');
    }
  };

  // Loading state
  if (state === 'validating') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">בודקים את ההזמנה...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-fade-in">
          <div className="bg-red-500 p-8 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <AlertCircle className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">שגיאה בהזמנה</h2>
          </div>

          <div className="p-8">
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center mb-6">
              {error}
            </div>

            <Button
              onClick={() => navigate('/login')}
              className="w-full justify-center"
              variant="secondary"
            >
              <ArrowRight className="ml-2 h-5 w-5" />
              לדף ההתחברות
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-fade-in">
          <div className="bg-green-500 p-8 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <CheckCircle className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">ברוכים הבאים!</h2>
            <p className="text-green-100 mt-2">
              הצטרפתם בהצלחה ל{invite?.familyName}
            </p>
          </div>

          <div className="p-8 text-center">
            <p className="text-gray-600 mb-4">מעבירים אתכם ללוח הבקרה...</p>
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Ready state - show signup form
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-fade-in">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <UserPlus className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">הצטרפות למשפחה</h2>
          <p className="text-indigo-100 mt-2 text-sm">
            הוזמנתם להצטרף ל{invite?.familyName}
          </p>
        </div>

        <div className="p-8">
          {/* Invite details */}
          <div className="bg-indigo-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-indigo-700">
              <span className="font-medium">משפחה:</span> {invite?.familyName}
            </p>
            <p className="text-sm text-indigo-700 mt-1">
              <span className="font-medium">אימייל מוזמן:</span> {invite?.email}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6">
              {error}
            </div>
          )}

          <Button
            onClick={handleGoogleSignup}
            className="w-full justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
            size="lg"
            isLoading={state === 'signing-up'}
          >
            <GoogleLogo className="ml-3" />
            הירשם עם Google
          </Button>

          <p className="text-gray-400 text-xs text-center mt-4">
            מומלץ להשתמש באותו אימייל שאליו נשלחה ההזמנה
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowRight size={16} />
              יש לכם כבר חשבון? התחברו
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
