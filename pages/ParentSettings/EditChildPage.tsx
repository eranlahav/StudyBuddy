import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Check, AlertCircle, Save, Lock, Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { AvatarPicker } from '../../components/AvatarPicker';
import { AvatarEmoji } from '../../constants/avatars';
import { GradeLevel, DifficultyLevel } from '../../types';
import { hashPin, isValidPinFormat, hasPinSet } from '../../services';

interface FormErrors {
  name?: string;
  grade?: string;
  subjects?: string;
  pin?: string;
  general?: string;
}

export const EditChildPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { children, subjects, updateChild } = useStore();
  const navigate = useNavigate();

  const child = children.find(c => c.id === id);

  // Form state
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeLevel | ''>('');
  const [avatar, setAvatar] = useState<string>('');
  const [birthdate, setBirthdate] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // PIN state
  const [showPinSection, setShowPinSection] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Populate form with existing child data
  useEffect(() => {
    if (child) {
      setName(child.name);
      setGrade(child.grade);
      setAvatar(child.avatar);
      setSelectedSubjects(child.subjects);
      if (child.birthdate) {
        // Convert timestamp to YYYY-MM-DD format for date input
        const date = new Date(child.birthdate);
        setBirthdate(date.toISOString().split('T')[0]);
      }
    }
  }, [child]);

  if (!child) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="bg-red-50 rounded-2xl p-8 border border-red-200">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">ילד/ה לא נמצא/ה</h2>
          <p className="text-red-600 mb-4">לא הצלחנו למצוא את הפרופיל המבוקש</p>
          <Button onClick={() => navigate('/parent/settings')}>
            חזרה להגדרות
          </Button>
        </div>
      </div>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation (allow same name if it's the current child)
    if (!name.trim()) {
      newErrors.name = 'נא להזין שם';
    } else if (
      children.some(c => c.id !== id && c.name.toLowerCase() === name.trim().toLowerCase())
    ) {
      newErrors.name = 'כבר קיים ילד אחר עם שם זהה';
    }

    // Grade validation
    if (!grade) {
      newErrors.grade = 'נא לבחור כיתה';
    }

    // Subjects validation
    if (selectedSubjects.length === 0) {
      newErrors.subjects = 'נא לבחור לפחות מקצוע אחד';
    }

    // PIN validation (only if changing)
    if (showPinSection && (newPin || newPinConfirm)) {
      if (!isValidPinFormat(newPin)) {
        newErrors.pin = 'הקוד חייב להכיל בדיוק 4 ספרות';
      } else if (newPin !== newPinConfirm) {
        newErrors.pin = 'הקודות אינם תואמים';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(sid => sid !== subjectId)
        : [...prev, subjectId]
    );
    if (errors.subjects) {
      setErrors(prev => ({ ...prev, subjects: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Build updated proficiency (keep existing levels, add medium for new subjects)
      const proficiency: Record<string, DifficultyLevel> = { ...child.proficiency };
      selectedSubjects.forEach(subjectId => {
        if (!proficiency[subjectId]) {
          proficiency[subjectId] = 'medium';
        }
      });
      // Remove proficiency for deselected subjects
      Object.keys(proficiency).forEach(key => {
        if (!selectedSubjects.includes(key)) {
          delete proficiency[key];
        }
      });

      // Build updates object
      const updates: Partial<typeof child> = {
        name: name.trim(),
        grade: grade as GradeLevel,
        avatar,
        subjects: selectedSubjects,
        proficiency,
        birthdate: birthdate ? new Date(birthdate).getTime() : undefined
      };

      // Add PIN update if changing
      if (showPinSection && newPin && isValidPinFormat(newPin)) {
        updates.pinHash = await hashPin(newPin);
      }

      await updateChild(id!, updates);

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/parent/settings');
      }, 1500);
    } catch (error) {
      console.error('Failed to update child:', error);
      setErrors({ general: 'שגיאה בעדכון הפרופיל. נסו שוב.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success message (brief)
  if (showSuccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 animate-fade-in">
        <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
          <div className="text-6xl mb-4">{avatar}</div>
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-800">הפרופיל עודכן בהצלחה!</h2>
          <p className="text-green-600 mt-2">חוזרים להגדרות...</p>
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
        <div className="flex items-center gap-3">
          <div className="text-4xl">{child.avatar}</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Pencil className="w-6 h-6 text-indigo-600" />
              עריכת פרופיל: {child.name}
            </h1>
            <p className="text-gray-500">עדכנו את פרטי הילד/ה</p>
          </div>
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
          <h2 className="text-lg font-bold text-gray-800 mb-4">פרטים בסיסיים</h2>

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
          <h2 className="text-lg font-bold text-gray-800 mb-4">
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
          <h2 className="text-lg font-bold text-gray-800 mb-4">בחרו דמות</h2>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl bg-indigo-50 p-3 rounded-2xl border-2 border-indigo-200">
              {avatar}
            </div>
            <p className="text-gray-600">הדמות שנבחרה</p>
          </div>

          <AvatarPicker
            selected={avatar}
            onSelect={(emoji: AvatarEmoji) => setAvatar(emoji)}
            columns={8}
          />
        </div>

        {/* Section 4: Subjects */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            מקצועות לימוד <span className="text-red-500">*</span>
          </h2>

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

        {/* Section 5: PIN Management */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600" />
            קוד גישה
          </h2>

          {/* Current PIN status */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasPinSet(child.pinHash) ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
              }`}>
                {hasPinSet(child.pinHash) ? <Lock className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {hasPinSet(child.pinHash) ? 'קוד גישה מוגדר' : 'אין קוד גישה'}
                </p>
                <p className="text-sm text-gray-500">
                  {hasPinSet(child.pinHash)
                    ? 'הילד/ה צריך/ה להזין קוד כדי להיכנס'
                    : 'הילד/ה יכול/ה להיכנס ללא קוד'}
                </p>
              </div>
            </div>

            {!showPinSection && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowPinSection(true)}
              >
                {hasPinSet(child.pinHash) ? 'שנה קוד' : 'הגדר קוד'}
              </Button>
            )}
          </div>

          {/* PIN Change Section */}
          {showPinSection && (
            <div className="border-t border-gray-200 pt-4 mt-4 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">
                  {hasPinSet(child.pinHash) ? 'הגדר קוד חדש' : 'הגדר קוד גישה'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinSection(false);
                    setNewPin('');
                    setNewPinConfirm('');
                    setErrors(prev => ({ ...prev, pin: undefined }));
                  }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ביטול
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* New PIN */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    קוד חדש (4 ספרות)
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setNewPin(val);
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

                {/* Confirm PIN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    אימות קוד
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPinConfirm}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setNewPinConfirm(val);
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
              {newPin && newPinConfirm && (
                <div className={`mt-3 text-sm flex items-center gap-2 ${newPin === newPinConfirm ? 'text-green-600' : 'text-orange-600'}`}>
                  {newPin === newPinConfirm ? (
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

              {/* Remove PIN option */}
              {hasPinSet(child.pinHash) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('האם אתם בטוחים שברצונכם להסיר את קוד הגישה? הילד/ה יוכל/תוכל להיכנס ללא קוד.')) {
                        try {
                          await updateChild(id!, { pinHash: '' });
                          setShowPinSection(false);
                        } catch (error) {
                          console.error('Failed to remove PIN:', error);
                        }
                      }
                    }}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    הסר קוד גישה
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Display (read-only) */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-700 mb-3">סטטיסטיקות (לקריאה בלבד)</h2>
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
              <span>⭐</span>
              <span className="font-bold">{child.stars}</span>
              <span className="text-gray-600">כוכבים</span>
            </div>
            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
              <span>🔥</span>
              <span className="font-bold">{child.streak}</span>
              <span className="text-gray-600">רצף</span>
            </div>
          </div>
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
          <Button type="submit" disabled={isSubmitting}>
            <Save className="ml-2 w-4 h-4" />
            {isSubmitting ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </div>
      </form>
    </div>
  );
};
