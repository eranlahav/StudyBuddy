import React from 'react';
import { AVATAR_OPTIONS, AvatarEmoji } from '../constants/avatars';

interface AvatarPickerProps {
  selected: string;
  onSelect: (avatar: AvatarEmoji) => void;
  columns?: 4 | 5 | 6 | 8;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  selected,
  onSelect,
  columns = 8
}) => {
  const gridColsClass = {
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    8: 'grid-cols-8'
  }[columns];

  return (
    <div className={`grid ${gridColsClass} gap-2`}>
      {AVATAR_OPTIONS.map((emoji, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(emoji)}
          className={`
            text-3xl p-3 rounded-xl transition-all duration-200
            ${selected === emoji
              ? 'bg-indigo-600 scale-110 shadow-lg ring-2 ring-indigo-300'
              : 'bg-white hover:bg-indigo-50 hover:scale-105 shadow-sm hover:shadow-md border border-gray-100'
            }
          `}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
