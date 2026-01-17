/**
 * Shared avatar options for child profiles
 * Used in: AddChildPage, EditChildPage, ChildDashboard
 */

export const AVATAR_OPTIONS = [
  // Animals
  '🦁', '🐯', '🐻', '🐶', '🐱', '🐼', '🐨', '🐸',
  // Fantasy
  '🦄', '🐲', '🦖', '🦕', '🐳', '🐬', '🐙', '🦋',
  // People & Heroes
  '👩‍🚀', '👨‍🚀', '🦸‍♂️', '🦸‍♀️', '🧚‍♀️', '🧜‍♀️', '🧙‍♂️', '🥷',
  // Fun
  '🤖', '👽', '👻', '🤡', '🤠', '👑', '🎩', '👓',
  // Sports & Hobbies
  '⚽', '🏀', '🏈', '🎾', '🎸', '🎨', '🚀', '🚗'
] as const;

export type AvatarEmoji = typeof AVATAR_OPTIONS[number];

export const DEFAULT_AVATAR: AvatarEmoji = '🦁';
