import React, { useState } from 'react';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Check, AlertCircle, PartyPopper, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/Button';
import { AvatarPicker } from '../../components/AvatarPicker';
import { DEFAULT_AVATAR, AvatarEmoji } from '../../constants/avatars';
import { GradeLevel, DifficultyLevel } from '../../types';
import { hashPin, isValidPinFormat } from '../../services';

const MAX_CHILDREN = 5;
const WELCOME_BONUS_STARS = 5;

interface FormErrors {
  name?: string;
  grade?: string;
  subjects?: string;
  pin?: string;
  general?: string;
}

export const AddChildPage: React.FC = () => {
  const { children, subjects, addChild } = useStore();
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeLevel | ''>('');
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR);
  const [birthdate, setBirthdate] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // PIN state
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const canAddMore = children.length < MAX_CHILDREN;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'נא להזין שם';
    } else if (children.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      newErrors.name = 'כבר קיים ילד עם שם זהה';
    }

    // Grade validation
    if (!grade) {
      newErrors.grade = 'נא לבחור כיתה';
    }

    // Subjects validation
    if (selectedSubjects.length === 0) {
      newErrors.subjects = 'נא לבחור לפחות מקצוע אחד';
    }

    // PIN validation (optional but must be valid if provided)
    if (pin || pinConfirm) {
      if (!isValidPinFormat(pin)) {
        newErrors.pin = 'הקוד חייב להכיל בדיוק 4 ספרות';
      } else if (pin !== pinConfirm) {
        newErrors.pin = 'הקודות אינם תואמים';
      }
    }

    // Max children check
    if (!canAddMore) {
      newErrors.general = `הגעתם למגבלת ${MAX_CHILDREN} ילדים`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
    // Clear subject error when user selects
    if (errors.subjects) {
      setErrors(prev => ({ ...prev, subjects: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Build proficiency map (all start at medium)
      const proficiency: Record<string, DifficultyLevel> = {};
      selectedSubjects.forEach(subjectId => {
        proficiency[subjectId] = 'medium';
      });

      // Hash PIN if provided
      const pinHash = pin ? await hashPin(pin) : '';

      // Create child data (familyId, createdAt, createdBy added by store)
      const newChildData = {
        id: crypto.randomUUID(),
        name: name.trim(),
        grade: grade as GradeLevel,
        avatar,
        stars: WELCOME_BONUS_STARS,
        streak: 0,
        subjects: selectedSubjects,
        proficiency,
        pinHash,
        ...(birthdate && { birthdate: new Date(birthdate).getTime() })
      };

      await addChild(newChildData);
      setShowSuccess(true);
    } catch (error) {
      console.error('Failed to add child:', error);
      setErrors({ general: 'שגיאה בהוספת הילד. נסו שוב.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setGrade('');
    setAvatar(DEFAULT_AVATAR);
    setBirthdate('');
    setSelectedSubjects([]);
    setPin('');
    setPinConfirm('');
    setErrors({});
    setShowSuccess(false);
  };

  // Success screen
  if (showSuccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 animate-fade-in">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 border-2 border-green-200 shadow-lg">
          <div className="text-8xl mb-4 animate-bounce">{avatar}</div>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <PartyPopper className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            {name} נוסף/ה בהצלחה!
          </h2>
          <p className="text-green-600 mb-2">
            קיבל/ה <span className="font-bold">{WELCOME_BONUS_STARS} כוכבים</span> כמתנת הצטרפות
          </p>
          <p className="text-gray-600 mb-8">מה תרצו לעשות עכשיו?</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={resetForm} variant="secondary">
              <UserPlus className="ml-2 w-4 h-4" />
              הוסף ילד/ה נוסף/ת
            </Button>
            <Button onClick={() => navigate('/parent')}>
              חזרה ללוח הבקרה
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/parent/settings')}
          className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-indigo-600" />
            הוספת ילד/ה חדש/ה
          </h1>
          <p className="text-gray-500">מלאו את הפרטים להוספת ילד/ה למשפחה</p>
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errors.general}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            פרטים בסיסיים
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם הילד/ה <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="לדוגמה: יעל"
                className={`w-full rounded-lg border p-3 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Birthdate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך לידה <span className="text-gray-400">(אופציונלי)</span>
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Grade */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            כיתה <span className="text-red-500">*</span>
          </h2>

          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value as GradeLevel);
              if (errors.grade) setErrors(prev => ({ ...prev, grade: undefined }));
            }}
            className={`w-full rounded-lg border p-3 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.grade ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          >
            <option value="">בחרו כיתה...</option>
            {Object.values(GradeLevel).map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {errors.grade && (
            <p className="mt-1 text-sm text-red-600">{errors.grade}</p>
          )}
        </div>

        {/* Section 3: Avatar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            בחרו דמות
          </h2>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl bg-indigo-50 p-3 rounded-2xl border-2 border-indigo-200">
              {avatar}
            </div>
            <p className="text-gray-600">הדמות שנבחרה תופיע בפרופיל של הילד/ה</p>
          </div>

          <AvatarPicker
            selected={avatar}
            onSelect={(emoji: AvatarEmoji) => setAvatar(emoji)}
            columns={8}
          />
        </div>

        {/* Section 4: Subjects */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            מקצועות לימוד <span className="text-red-500">*</span>
          </h2>

          <p className="text-gray-600 text-sm mb-4">בחרו את המקצועות שהילד/ה ילמד/תלמד</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {subjects.map(subject => {
              const isSelected = selectedSubjects.includes(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => handleSubjectToggle(subject.id)}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg ${subject.color} flex items-center justify-center text-xl text-white`}>
                    {subject.icon}
                  </div>
                  <span className={`font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {subject.name}
                  </span>
                  {isSelected && (
                    <Check className="w-5 h-5 text-indigo-600 mr-auto" />
                  )}
                </button>
              );
            })}
          </div>

          {errors.subjects && (
            <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.subjects}
            </p>
          )}
        </div>

        {/* Section 5: PIN */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <Lock className="w-5 h-5 text-indigo-600" />
            קוד גישה <span className="text-gray-400 text-sm font-normal">(אופציונלי)</span>
          </h2>

          <p className="text-gray-600 text-sm mb-4">
            הגדירו קוד בן 4 ספרות לאבטחת גישת הילד/ה. אם לא תגדירו קוד, הילד/ה יוכל/תוכל להיכנס ללא קוד.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PIN Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                קוד גישה (4 ספרות)
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPin(val);
                    if (errors.pin) setErrors(prev => ({ ...prev, pin: undefined }));
                  }}
                  placeholder="****"
                  className={`w-full rounded-lg border p-3 text-gray-900 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.pin ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* PIN Confirm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                אימות קוד
              </label>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pinConfirm}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinConfirm(val);
                  if (errors.pin) setErrors(prev => ({ ...prev, pin: undefined }));
                }}
                placeholder="****"
                className={`w-full rounded-lg border p-3 text-gray-900 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.pin ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          {/* PIN Match Indicator */}
          {pin && pinConfirm && (
            <div className={`mt-3 text-sm flex items-center gap-2 ${pin === pinConfirm ? 'text-green-600' : 'text-orange-600'}`}>
              {pin === pinConfirm ? (
                <>
                  <Check className="w-4 h-4" />
                  הקודות תואמים
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  הקודות אינם תואמים
                </>
              )}
            </div>
          )}

          {errors.pin && (
            <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.pin}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/parent/settings')}
          >
            ביטול
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !canAddMore}
          >
            {isSubmitting ? 'מוסיף...' : 'הוסף ילד/ה'}
          </Button>
        </div>
      </form>
    </div>
  );
};
