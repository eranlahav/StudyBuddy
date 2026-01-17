/**
 * Games Tab - Hebrew game settings for a child
 *
 * Allows parents to configure vowels, categories, and other
 * settings for the Hebrew word games.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/Button';
import { GameSettings } from '../../types';
import { VOWELS } from '../../games/hebrewData';
import { DEFAULT_GAME_SETTINGS } from '../../constants';
import { Gamepad2, Save } from 'lucide-react';
import { GamesTabProps } from './types';

// Word categories for games
const CATEGORIES = [
  { id: 'animals', label: 'בעלי חיים 🦁' },
  { id: 'food', label: 'אוכל 🍔' },
  { id: 'objects', label: 'חפצים 🎒' },
  { id: 'transport', label: 'כלי תחבורה 🚗' },
  { id: 'nature', label: 'טבע 🌳' }
];

// Hebrew vowel names
const VOWEL_NAMES: Record<string, string> = {
  kamatz: 'קמץ',
  patach: 'פתח',
  tzeire: 'צירה',
  segol: 'סגול',
  hiriq: 'חיריק',
  holam: 'חולם',
  qubuts: 'קובוץ',
  shva: 'שווא'
};

export const GamesTab: React.FC<GamesTabProps> = ({
  child,
  updateChild
}) => {
  const [localGameSettings, setLocalGameSettings] = useState<GameSettings>(
    child.gameSettings || DEFAULT_GAME_SETTINGS
  );

  // Sync with child's gameSettings
  useEffect(() => {
    if (child.gameSettings) {
      setLocalGameSettings(child.gameSettings);
    } else {
      setLocalGameSettings(DEFAULT_GAME_SETTINGS);
    }
  }, [child.gameSettings]);

  const handleSaveGameSettings = async () => {
    await updateChild(child.id, { gameSettings: localGameSettings });
    alert('הגדרות המשחק נשמרו בהצלחה!');
  };

  const toggleVowel = (vowelName: string) => {
    const current = localGameSettings.allowedVowels || [];
    if (current.includes(vowelName)) {
      if (current.length === 1) return; // Prevent disabling all
      setLocalGameSettings({
        ...localGameSettings,
        allowedVowels: current.filter(v => v !== vowelName)
      });
    } else {
      setLocalGameSettings({
        ...localGameSettings,
        allowedVowels: [...current, vowelName]
      });
    }
  };

  const toggleCategory = (category: string) => {
    const current = localGameSettings.allowedCategories || [];
    if (current.includes(category)) {
      if (current.length === 1) return; // Prevent disabling all
      setLocalGameSettings({
        ...localGameSettings,
        allowedCategories: current.filter(c => c !== category)
      });
    } else {
      setLocalGameSettings({
        ...localGameSettings,
        allowedCategories: [...current, category]
      });
    }
  };

  // Don't render if child doesn't have game settings enabled
  if (!child.gameSettings) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-3 rounded-full text-purple-600">
            <Gamepad2 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">הגדרות משחק - ממלכת המילים</h3>
            <p className="text-gray-500 text-sm">התאימו את המשחקים לרמה של {child.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Vowels Selection */}
          <div>
            <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">ניקוד פעיל</h4>
            <div className="grid grid-cols-2 gap-2">
              {VOWELS.map(v => (
                <label
                  key={v.name}
                  className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={localGameSettings.allowedVowels?.includes(v.name)}
                    onChange={() => toggleVowel(v.name)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                  />
                  <span className="text-2xl w-8 text-center bg-gray-100 rounded">{v.char}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {VOWEL_NAMES[v.name] || v.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Categories & Settings */}
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">קטגוריות מילים</h4>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      localGameSettings.allowedCategories?.includes(cat.id)
                        ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 opacity-60'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">כללי</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">רמז באות חסרה (אימוג'י)</span>
                  <input
                    type="checkbox"
                    checked={localGameSettings.showMissingLetterHint}
                    onChange={e => setLocalGameSettings({
                      ...localGameSettings,
                      showMissingLetterHint: e.target.checked
                    })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">הקראת מילים (צליל סוגר)</span>
                  <input
                    type="checkbox"
                    checked={localGameSettings.enableTTS}
                    onChange={e => setLocalGameSettings({
                      ...localGameSettings,
                      enableTTS: e.target.checked
                    })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                  />
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700">אתגר מהירות (שניות)</span>
                    <span className="font-bold text-indigo-600">{localGameSettings.speedChallengeSeconds}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={localGameSettings.speedChallengeSeconds}
                    onChange={e => setLocalGameSettings({
                      ...localGameSettings,
                      speedChallengeSeconds: Number(e.target.value)
                    })}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={handleSaveGameSettings} size="lg">
            <Save size={18} className="ml-2" /> שמור שינויים
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GamesTab;
