/**
 * Prerequisite Detection Service
 *
 * Uses Gemini AI to identify topic dependencies for remediation prioritization.
 * Helps parents understand "Fix X first, then Y will make sense" relationships.
 *
 * Example: If child struggles with "fraction multiplication", AI might suggest
 * mastering "basic fractions" first.
 */

import { GoogleGenAI } from "@google/genai";
import { GradeLevel, TopicMastery } from "../types";
import { logger, retry, hasApiKey } from "../lib";

// Initialize AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// ==========================================
// TYPES
// ==========================================

/**
 * Prerequisite relationship between topics
 * Service-internal type (not exported to types.ts)
 */
export interface PrerequisiteRelationship {
  topic: string;           // The weak topic
  prerequisite: string;    // Topic that should be learned first
  confidence: number;      // 0-1 AI confidence
  rationale: string;       // Hebrew explanation
}

// ==========================================
// CONFIGURATION
// ==========================================

const PREREQUISITE_CONFIG = {
  /** Minimum AI confidence to show suggestion */
  MIN_CONFIDENCE: 0.7,
  /** Maximum relationships to return */
  MAX_RESULTS: 5
};

// Default retry options
const AI_RETRY_OPTIONS = {
  maxRetries: 2,
  initialDelayMs: 1000,
  context: 'PrerequisiteService'
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Extract numeric grade from GradeLevel enum for prompt
 * Examples: "כיתה א'" -> 1, "כיתה ג'" -> 3
 */
function gradeToNumber(grade: GradeLevel): number {
  const match = grade.match(/[א-ח]/);
  if (!match) return 3; // Default to grade 3

  const hebrewNumerals: Record<string, number> = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4,
    'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8
  };

  return hebrewNumerals[match[0]] || 3;
}

/**
 * Parse JSON from Gemini response, handling markdown code blocks
 */
function parseJsonResponse<T>(text: string): T {
  // Remove markdown code block if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return JSON.parse(cleaned.trim()) as T;
}

// ==========================================
// MAIN FUNCTIONS
// ==========================================

/**
 * Detect prerequisite relationships between weak topics and other topics
 *
 * Uses Gemini AI to identify which topics should be mastered before others.
 * Returns empty array on error (graceful degradation).
 *
 * @param weakTopics - Topics where child is struggling (pKnown < 0.5)
 * @param allTopics - All topics in the subject for context
 * @param subjectName - Subject name in Hebrew (e.g., "מתמטיקה")
 * @param gradeLevel - Child's grade level
 * @returns Array of prerequisite relationships, sorted by confidence
 *
 * @example
 * const relationships = await detectPrerequisites(
 *   [{ topic: 'כפל שברים', ... }],
 *   [{ topic: 'שברים בסיסיים', ... }, { topic: 'כפל שברים', ... }],
 *   'מתמטיקה',
 *   GradeLevel.Grade4
 * );
 * // Returns: [{ topic: 'כפל שברים', prerequisite: 'שברים בסיסיים', confidence: 0.9, rationale: '...' }]
 */
export async function detectPrerequisites(
  weakTopics: TopicMastery[],
  allTopics: TopicMastery[],
  subjectName: string,
  gradeLevel: GradeLevel
): Promise<PrerequisiteRelationship[]> {
  // Return empty array if no weak topics
  if (weakTopics.length === 0) {
    logger.info('detectPrerequisites: No weak topics provided, returning empty array');
    return [];
  }

  // Check if API key is configured
  if (!hasApiKey()) {
    logger.warn('detectPrerequisites: API key not configured, returning empty array');
    return [];
  }

  const gradeNum = gradeToNumber(gradeLevel);

  const prompt = `אתה מומחה חינוכי ישראלי. נתון:
- מקצוע: ${subjectName}
- כיתה: ${gradeNum}
- נושאים חלשים: ${weakTopics.map(t => t.topic).join(', ')}
- כל הנושאים: ${allTopics.map(t => t.topic).join(', ')}

זהה **קשרי תלות (prerequisites)** בין נושאים.
לכל נושא חלש, מצא האם יש נושא אחר שחייבים לחזק לפניו.

דוגמה:
- נושא חלש: "כפל שברים"
- תלות: "שברים בסיסיים"
- הסבר: "כדי להצליח בכפל שברים, תחילה צריך להבין שברים בסיסיים"

החזר JSON array:
[
  {
    "topic": "הנושא החלש",
    "prerequisite": "הנושא שצריך לחזק לפני",
    "confidence": 0.9,
    "rationale": "הסבר בעברית"
  }
]

אם אין תלויות ברורות, החזר [].`;

  logger.info('detectPrerequisites: Starting AI detection', {
    subject: subjectName,
    grade: gradeNum,
    weakTopicCount: weakTopics.length,
    allTopicCount: allTopics.length
  });

  try {
    return await retry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini API');
      }

      // Parse JSON, handling markdown code blocks
      const relationships = parseJsonResponse<PrerequisiteRelationship[]>(response.text);

      if (!Array.isArray(relationships)) {
        logger.warn('detectPrerequisites: Invalid response format, expected array');
        return [];
      }

      // Filter by minimum confidence
      const filtered = relationships.filter(
        rel => rel.confidence >= PREREQUISITE_CONFIG.MIN_CONFIDENCE
      );

      // Sort by confidence (highest first) and limit results
      const sorted = filtered
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, PREREQUISITE_CONFIG.MAX_RESULTS);

      logger.info('detectPrerequisites: Successfully detected relationships', {
        rawCount: relationships.length,
        filteredCount: filtered.length,
        returnedCount: sorted.length
      });

      return sorted;
    }, {
      ...AI_RETRY_OPTIONS,
      context: 'detectPrerequisites'
    });
  } catch (error) {
    // Graceful degradation - log warning and return empty array
    logger.warn('detectPrerequisites: Failed to detect prerequisites', {
      subject: subjectName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}

/**
 * Format prerequisite relationship into Hebrew message for parent dashboard
 *
 * @param relationship - Prerequisite relationship from AI detection
 * @returns Hebrew message explaining the dependency
 *
 * @example
 * const message = getPrerequisiteMessage({
 *   topic: 'כפל שברים',
 *   prerequisite: 'שברים בסיסיים',
 *   confidence: 0.9,
 *   rationale: 'כדי להצליח בכפל שברים, תחילה צריך להבין שברים בסיסיים'
 * });
 * // Returns: "מומלץ לחזק את "שברים בסיסיים" לפני "כפל שברים". כדי להצליח בכפל שברים, תחילה צריך להבין שברים בסיסיים"
 */
export function getPrerequisiteMessage(relationship: PrerequisiteRelationship): string {
  return `מומלץ לחזק את "${relationship.prerequisite}" לפני "${relationship.topic}". ${relationship.rationale}`;
}
