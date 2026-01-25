/**
 * Google Analytics event tracking helpers
 * Uses Firebase Analytics (GA4) to track key app events
 */

import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebaseConfig';

/**
 * Track when a quiz session starts
 */
export function trackQuizStart(childId: string, subjectId: string, topic: string): void {
  logEvent(analytics, 'quiz_start', {
    child_id: childId,
    subject_id: subjectId,
    topic: topic
  });
}

/**
 * Track when a quiz session completes
 */
export function trackQuizComplete(
  childId: string,
  subjectId: string,
  score: number,
  totalQuestions: number
): void {
  logEvent(analytics, 'quiz_complete', {
    child_id: childId,
    subject_id: subjectId,
    score: score,
    total_questions: totalQuestions,
    percentage: Math.round((score / totalQuestions) * 100)
  });
}

/**
 * Track when a new child profile is created
 */
export function trackChildCreated(grade: number): void {
  logEvent(analytics, 'child_created', {
    grade: grade
  });
}

/**
 * Track when a Hebrew game is played
 */
export function trackGamePlayed(gameType: string, score: number): void {
  logEvent(analytics, 'game_played', {
    game_type: gameType,
    score: score
  });
}

/**
 * Track when an upcoming test is scheduled
 */
export function trackTestScheduled(testType: 'quiz' | 'dictation'): void {
  logEvent(analytics, 'test_scheduled', {
    test_type: testType
  });
}

/**
 * Track page views (optional - Firebase Analytics tracks these automatically)
 */
export function trackPageView(pageName: string): void {
  logEvent(analytics, 'page_view', {
    page_title: pageName
  });
}
