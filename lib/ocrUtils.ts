/**
 * OCR Utilities
 *
 * Utilities for detecting and reporting OCR analysis issues.
 * Used in evaluation upload flow to warn users about potential problems.
 */

import type { EvaluationAnalysisResult } from '../services';
import type { EvaluationType } from '../types';

/**
 * Type of OCR issue detected
 */
export type OcrIssueType =
  | 'low_confidence'
  | 'missing_score'
  | 'missing_subject'
  | 'no_topics'
  | 'missing_test_name';

/**
 * Severity level of OCR issue
 */
export type OcrIssueSeverity = 'warning' | 'error';

/**
 * OCR issue detected during document analysis
 */
export interface OcrIssue {
  type: OcrIssueType;
  severity: OcrIssueSeverity;
  message: string; // Hebrew message for UI
}

/**
 * Confidence thresholds
 */
const CONFIDENCE_THRESHOLD_WARNING = 70;
const CONFIDENCE_THRESHOLD_ERROR = 50;

/**
 * Detect OCR issues from analysis result
 *
 * @param result - Analysis result from Gemini
 * @param testType - Type of document (for context-specific checks)
 * @returns Array of detected issues
 */
export function detectOcrIssues(
  result: EvaluationAnalysisResult
): OcrIssue[] {
  const issues: OcrIssue[] = [];

  // Check confidence level
  if (result.confidence < CONFIDENCE_THRESHOLD_ERROR) {
    issues.push({
      type: 'low_confidence',
      severity: 'error',
      message: 'רמת דיוק הסריקה נמוכה מאוד - מומלץ לבדוק את כל הנתונים'
    });
  } else if (result.confidence < CONFIDENCE_THRESHOLD_WARNING) {
    issues.push({
      type: 'low_confidence',
      severity: 'warning',
      message: 'רמת דיוק הסריקה נמוכה - מומלץ לבדוק את הנתונים'
    });
  }

  // Check for missing score (relevant for tests)
  if (
    result.testType === 'test' &&
    result.totalScore === undefined
  ) {
    issues.push({
      type: 'missing_score',
      severity: 'warning',
      message: 'לא הצלחנו לזהות את הציון - נא להזין ידנית'
    });
  }

  // Check for missing subject
  if (!result.subject || result.subject.trim() === '') {
    issues.push({
      type: 'missing_subject',
      severity: 'warning',
      message: 'לא הצלחנו לזהות את המקצוע - נא לבחור מהרשימה'
    });
  }

  // Check for missing topics
  if (
    result.weakTopics.length === 0 &&
    result.strongTopics.length === 0
  ) {
    issues.push({
      type: 'no_topics',
      severity: 'warning',
      message: 'לא זוהו נושאים חלשים או חזקים - ניתן להוסיף ידנית'
    });
  }

  // Check for missing test name
  if (!result.testName || result.testName.trim() === '') {
    issues.push({
      type: 'missing_test_name',
      severity: 'warning',
      message: 'לא הצלחנו לזהות את שם המבחן - נא להזין ידנית'
    });
  }

  return issues;
}

/**
 * Check if result has any critical (error-level) issues
 */
export function hasCriticalIssues(issues: OcrIssue[]): boolean {
  return issues.some(issue => issue.severity === 'error');
}

/**
 * Get overall confidence label in Hebrew
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'מצוין';
  if (confidence >= 80) return 'טוב מאוד';
  if (confidence >= 70) return 'טוב';
  if (confidence >= 50) return 'בינוני';
  return 'נמוך';
}

/**
 * Get confidence color class for styling
 */
export function getConfidenceColorClass(confidence: number): string {
  if (confidence >= 80) return 'text-green-600 bg-green-100';
  if (confidence >= 70) return 'text-blue-600 bg-blue-100';
  if (confidence >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

/**
 * Get score color class based on percentage
 */
export function getScoreColorClass(percentage: number): string {
  if (percentage >= 85) return 'text-green-600 bg-green-100';
  if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
  if (percentage >= 55) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
}

/**
 * Get test type label in Hebrew
 */
export function getTestTypeLabel(testType: EvaluationType): string {
  switch (testType) {
    case 'rubric':
      return 'משוב';
    case 'proficiency_summary':
      return 'סיכום הערכה';
    case 'test':
      return 'מבחן';
    default:
      return 'הערכה';
  }
}
