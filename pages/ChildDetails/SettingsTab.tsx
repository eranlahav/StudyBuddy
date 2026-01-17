/**
 * Settings Tab - Child settings and difficulty levels
 *
 * Allows parents to set difficulty per subject and reset stats.
 */

import React from 'react';
import { DifficultyLevel } from '../../types';
import { Gauge, RotateCcw, Gamepad2 } from 'lucide-react';
import { SettingsTabProps } from './types';
import { DEFAULT_GAME_SETTINGS } from '../../constants';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  child,
  subjects,
  updateChild,
  resetChildStats
}) => {
  const handleProficiencyChange = async (subjectId: string, level: DifficultyLevel) => {
    const currentProficiency = child.proficiency || {};
    await updateChild(child.id, {
      proficiency: {
        ...currentProficiency,
        [subjectId]: level
      }
    });
  };

  const handleResetStats = () => {
    if (window.confirm('האם אתה בטוח שברצונך לאפס את הכוכבים והרצף של הילד? פעולה זו לא ניתנת לביטול.')) {
      resetChildStats(child.id);
    }
  };

  const handleToggleGames = async () => {
    const newShowGames = !child.showGames;
    // When enabling games, also initialize gameSettings if not present
    const updates: Record<string, unknown> = { showGames: newShowGames };
    if (newShowGames && !child.gameSettings) {
      updates.gameSettings = DEFAULT_GAME_SETTINGS;
    }
    await updateChild(child.id, updates);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Games Toggle */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Gamepad2 className="text-purple-600" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">משחקי קריאה</h3>
              <p className="text-sm text-gray-500">משחקי ניקוד ומילים לכיתות א'-ב'</p>
            </div>
          </div>
          <button
            onClick={handleToggleGames}
            dir="ltr"
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
              child.showGames ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                child.showGames ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Difficulty Settings */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Gauge size={20} /> רמת קושי לפי מקצוע
        </h3>
        <div className="space-y-4">
          {subjects.map(subject => (
            <div key={subject.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{subject.icon}</span>
                <span className="font-medium text-gray-900">{subject.name}</span>
              </div>
              <select
                value={child.proficiency?.[subject.id] || 'medium'}
                onChange={(e) => handleProficiencyChange(subject.id, e.target.value as DifficultyLevel)}
                className="bg-white border-gray-300 rounded-lg text-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="easy">קל - מתחילים</option>
                <option value="medium">בינוני - רגיל</option>
                <option value="hard">קשה - מתקדמים</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
        <h3 className="text-lg font-bold text-red-900 mb-2">אזור מסוכן</h3>
        <p className="text-sm text-red-700 mb-4">פעולות אלו לא ניתנות לביטול.</p>
        <button
          onClick={handleResetStats}
          className="flex items-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors font-medium"
        >
          <RotateCcw size={16} /> איפוס נקודות ורצף
        </button>
      </div>
    </div>
  );
};

export default SettingsTab;
