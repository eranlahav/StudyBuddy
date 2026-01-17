
import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Lock, ArrowRight, Mail } from 'lucide-react';
import { getUserMessage } from '../lib';

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

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, authLoading } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get the intended destination after login
  const from = (location.state as { from?: Location })?.from?.pathname || '/parent';

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      console.error('Login error:', err);

      // Check for specific Firebase auth errors
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
          case 'auth/cancelled-popup-request':
            // User cancelled - no error needed
            break;
          default:
            setError(getUserMessage(err));
        }
      } else {
        setError(getUserMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-fade-in">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Lock className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            כניסת הורים
          </h2>
          <p className="text-indigo-100 mt-2 text-sm">
            התחברו עם חשבון Google כדי לנהל את הלמידה
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6">
              {error}
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            className="w-full justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
            size="lg"
            isLoading={loading || authLoading}
          >
            <GoogleLogo className="ml-3" />
            התחבר עם Google
          </Button>

          <div className="mt-8 text-center">
            <div className="flex items-center gap-2 justify-center text-gray-500 text-sm mb-4">
              <Mail size={16} />
              <span>גישה בהזמנה בלבד</span>
            </div>
            <p className="text-gray-400 text-xs">
              צריכים גישה? פנו למנהל המערכת כדי לקבל הזמנה.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={() => navigate('/')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowRight size={16} />
              חזרה לדף הבית
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
