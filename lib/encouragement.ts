/**
 * Hebrew Encouragement Messages
 *
 * Natural conversational Hebrew for Israeli children.
 * Used when quiz ends early due to fatigue or frustration.
 *
 * Guidelines:
 * - Positive framing (celebrate effort, not emphasize failure)
 * - Age-appropriate vocabulary
 * - No mention of "struggling" or "difficulty"
 */

/**
 * Messages shown when fatigue is detected
 * (fast answers + accuracy drop)
 */
export const FATIGUE_MESSAGES = [
  'עבודה מצוינת! בואו נקח הפסקה',
  'כל הכבוד! השגתם הרבה היום',
  'יפה מאוד! זמן טוב להפסקה קטנה',
  'מעולה! בואו ננוח קצת'
];

/**
 * Messages shown when frustration is detected
 * (3+ consecutive wrong on same topic)
 */
export const FRUSTRATION_MESSAGES = [
  'עבודה נהדרת! בואו ננסה משהו אחר',
  'היי, כבר תרגלתם הרבה היום',
  'מעולה! בואו נעשה הפסקה קצרה'
];

/**
 * Extended explanations for parents (shown in analytics)
 */
export const EARLY_END_EXPLANATIONS = {
  fatigue: 'זיהינו שהתשובות היו מהירות מהרגיל - לפעמים המוח צריך הפסקה קטנה.',
  frustration: 'ראינו שהחומר היה קצת מאתגר היום - נתרגל את זה שוב בפעם הבאה.',
  allTopicsBlocked: 'תרגלנו הרבה נושאים שונים היום - זה זמן מצוין להפסקה!'
} as const;

/**
 * Select random encouragement message
 *
 * @param type - 'fatigue' or 'frustration'
 * @returns Random Hebrew encouragement message
 */
export function getEncouragementMessage(type: 'fatigue' | 'frustration'): string {
  const messages = type === 'fatigue' ? FATIGUE_MESSAGES : FRUSTRATION_MESSAGES;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get parent-facing explanation for early ending
 */
export function getParentExplanation(type: keyof typeof EARLY_END_EXPLANATIONS): string {
  return EARLY_END_EXPLANATIONS[type];
}
