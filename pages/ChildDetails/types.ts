/**
 * Shared types for ChildDetails page components
 */

import { ChildProfile, Subject, StudySession, UpcomingTest, Evaluation } from '../../types';

/**
 * Props shared by all tab components
 */
export interface TabBaseProps {
  child: ChildProfile;
  subjects: Subject[];
}

/**
 * Props for AnalysisTab
 */
export interface AnalysisTabProps extends TabBaseProps {
  sessions: StudySession[];
}

/**
 * Analysis data computed from sessions
 */
export interface AnalysisData {
  progressData: Array<{
    date: string;
    score: number;
    topic: string;
    subjectName: string | undefined;
  }>;
  strongTopics: TopicPerformance[];
  weakTopics: TopicPerformance[];
  overallAverage: number;
  allTopics: TopicPerformance[];
}

export interface TopicPerformance {
  topicOnly: string;
  subject: string;
  percentage: number;
  count: number;
}

/**
 * Props for PlanTab
 * Note: familyId is added automatically by the store, so it's omitted from the input type
 */
export interface PlanTabProps extends TabBaseProps {
  upcomingTests: UpcomingTest[];
  addUpcomingTest: (test: Omit<UpcomingTest, 'familyId'>) => Promise<void>;
  updateUpcomingTest: (id: string, data: Partial<UpcomingTest>) => Promise<void>;
  removeUpcomingTest: (id: string) => Promise<void>;
}

/**
 * Props for GamesTab
 */
export interface GamesTabProps extends TabBaseProps {
  updateChild: (id: string, data: Partial<ChildProfile>) => Promise<void>;
}

/**
 * Props for HistoryTab
 */
export interface HistoryTabProps extends TabBaseProps {
  sessions: StudySession[];
}

/**
 * Props for SettingsTab
 */
export interface SettingsTabProps extends TabBaseProps {
  updateChild: (id: string, data: Partial<ChildProfile>) => Promise<void>;
  resetChildStats: (id: string) => Promise<void>;
}

/**
 * Props for EvaluationsTab
 */
export interface EvaluationsTabProps extends TabBaseProps {
  evaluations: Evaluation[];
  addEvaluation: (evaluation: Omit<Evaluation, 'familyId'>) => Promise<void>;
  updateEvaluation: (id: string, updates: Partial<Evaluation>) => Promise<void>;
  deleteEvaluation: (id: string, fileUrls?: string[]) => Promise<void>;
  addUpcomingTest: (test: Omit<UpcomingTest, 'familyId'>) => Promise<void>;
}

/**
 * Tab type for navigation
 */
export type TabType = 'analysis' | 'plan' | 'games' | 'history' | 'evaluations' | 'settings';
