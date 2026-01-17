/**
 * PIN Pad Component
 *
 * 4-digit numeric keypad for child authentication.
 * Shows visual feedback for entered digits and errors.
 */

import React, { useState, useEffect } from 'react';
import { Delete, Lock, Loader2 } from 'lucide-react';

interface PINPadProps {
  onSubmit: (pin: string) => Promise<void>;
  error?: string;
  isLocked?: boolean;
  lockoutSeconds?: number;
  childName?: string;
}

export const PINPad: React.FC<PINPadProps> = ({
  onSubmit,
  error,
  isLocked = false,
  lockoutSeconds = 0,
  childName
}) => {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(lockoutSeconds);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds > 0) {
      setCountdown(lockoutSeconds);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutSeconds]);

  const handleDigit = (digit: string) => {
    if (isLocked || isSubmitting || pin.length >= 4) return;
    setPin(prev => prev + digit);
  };

  const handleDelete = () => {
    if (isLocked || isSubmitting) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLocked || isSubmitting) return;
    setPin('');
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !isSubmitting && !isLocked) {
      setIsSubmitting(true);
      onSubmit(pin)
        .catch(() => {
          // Error handled by parent
        })
        .finally(() => {
          setPin('');
          setIsSubmitting(false);
        });
    }
  }, [pin, isSubmitting, isLocked, onSubmit]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
          <Lock className="text-indigo-600 w-8 h-8" />
        </div>
        {childName && (
          <p className="text-gray-600 text-sm mb-1">
            שלום {childName}!
          </p>
        )}
        <h2 className="text-xl font-bold text-gray-900">
          הכניסו את הקוד
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          4 ספרות
        </p>
      </div>

      {/* PIN Display */}
      <div className="flex justify-center gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`
              w-14 h-14 rounded-xl border-2 flex items-center justify-center
              transition-all duration-200
              ${pin.length > i
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-white border-gray-300'
              }
              ${isSubmitting ? 'animate-pulse' : ''}
            `}
          >
            {pin.length > i && (
              <div className="w-4 h-4 bg-white rounded-full"></div>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 text-center text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Lockout Message */}
      {isLocked && countdown > 0 && (
        <div className="bg-yellow-50 text-yellow-700 text-center text-sm p-3 rounded-lg mb-4">
          נחסמת למשך {countdown} שניות
        </div>
      )}

      {/* Numeric Pad */}
      <div className="grid grid-cols-3 gap-3">
        {digits.map((digit, index) => {
          if (digit === '') {
            return <div key={index} className="h-16"></div>;
          }

          if (digit === 'delete') {
            return (
              <button
                key={index}
                onClick={handleDelete}
                onDoubleClick={handleClear}
                disabled={isLocked || isSubmitting || pin.length === 0}
                className={`
                  h-16 rounded-xl flex items-center justify-center
                  text-gray-600 bg-gray-100 hover:bg-gray-200
                  transition-all active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title="לחיצה כפולה למחיקת הכל"
              >
                <Delete size={24} />
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => handleDigit(digit)}
              disabled={isLocked || isSubmitting || pin.length >= 4}
              className={`
                h-16 rounded-xl font-bold text-2xl
                bg-white border-2 border-gray-200 text-gray-900
                hover:bg-indigo-50 hover:border-indigo-300
                active:bg-indigo-100 active:scale-95
                transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {digit}
            </button>
          );
        })}
      </div>

      {/* Loading Indicator */}
      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 mt-4 text-indigo-600">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm">בודק...</span>
        </div>
      )}
    </div>
  );
};
