
import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Lock, Mail, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, signup } = useStore();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/parent');
    } catch (err: any) {
      console.error(err);
      if (err.message === 'AUTH_FAILED') {
        setError('שם משתמש או סיסמה שגויים (נסו: admin / admin)');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('פרטי ההתחברות שגויים');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('המייל הזה כבר קיים במערכת');
      } else if (err.code === 'auth/weak-password') {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      } else {
        setError('אירעה שגיאה. נסו שוב מאוחר יותר');
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
             {isSignup ? 'יצירת חשבון מנהל' : 'כניסת הורים'}
           </h2>
           <p className="text-indigo-100 mt-2 text-sm">
             {isSignup ? 'הגדירו את הגישה ללוח הבקרה' : 'הזינו פרטים כדי לנהל את הלמידה'}
           </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם משתמש / אימייל</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={20} />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-gray-300 pr-10 focus:ring-indigo-500 focus:border-indigo-500 py-3"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border-gray-300 pr-10 focus:ring-indigo-500 focus:border-indigo-500 py-3"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full justify-center" 
              size="lg"
              isLoading={loading}
            >
              {isSignup ? 'צור חשבון' : 'התחבר'}
              <ArrowRight className="mr-2 h-5 w-5" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center gap-2 mx-auto"
            >
              {isSignup ? (
                <>
                  <LogIn size={16} /> כבר יש לכם חשבון? התחברו
                </>
              ) : (
                <>
                  <UserPlus size={16} /> אין לכם חשבון? הירשמו כמנהלים
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
