/**
 * Child Details Page - Container Component
 *
 * Displays detailed information about a child including:
 * - Performance analytics (AnalysisTab)
 * - Test planning (PlanTab)
 * - Hebrew game settings (GamesTab)
 * - Session history (HistoryTab)
 * - Child settings (SettingsTab)
 *
 * Uses React.lazy() for code-splitting tab components.
 */

import React, { useState, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../../store';
import {
  Trophy, TrendingUp, Calendar, Gamepad2, RotateCcw, Settings, Sparkles, Award, MessageSquare
} from 'lucide-react';
import { TabType } from './types';
import { TabSkeleton } from '../../components/LoadingSkeleton';
import { useLearnerProfile } from '../../hooks';
import { AlertNotificationBanner } from './AlertNotificationBanner';

// Lazy-loaded tab components for code-splitting
const AnalysisTab = lazy(() => import('./AnalysisTab').then(m => ({ default: m.AnalysisTab })));
const PlanTab = lazy(() => import('./PlanTab').then(m => ({ default: m.PlanTab })));
const GamesTab = lazy(() => import('./GamesTab').then(m => ({ default: m.GamesTab })));
const HistoryTab = lazy(() => import('./HistoryTab').then(m => ({ default: m.HistoryTab })));
const EvaluationsTab = lazy(() => import('./EvaluationsTab').then(m => ({ default: m.EvaluationsTab })));
const NotesTab = lazy(() => import('./NotesTab').then(m => ({ default: m.NotesTab })));
const SettingsTab = lazy(() => import('./SettingsTab').then(m => ({ default: m.SettingsTab })));

export const ChildDetails: React.FC = () => {
  const { id } = useParams();
  const {
    children,
    sessions,
    subjects,
    upcomingTests,
    evaluations,
    addUpcomingTest,
    updateUpcomingTest,
    removeUpcomingTest,
    addEvaluation,
    updateEvaluation,
    deleteEvaluation,
    resetChildStats,
    updateChild
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('analysis');

  const child = children.find(c => c.id === id);

  // Filter sessions for this child (sorted newest first)
  const childSessions = sessions
    .filter(s => s.childId === id)
    .sort((a, b) => b.date - a.date);

  // Get learner profile with auto-bootstrap for existing children
  // Pass full child object (not just id) so hook can access familyId and grade for bootstrap
  // Pass subjects for regression alert message formatting
  const {
    profile,
    isLoading: profileLoading,
    getConfidenceLevel,
    activeNotification,
    dismissNotification
  } = useLearnerProfile(child, childSessions, subjects);

  if (!child) {
    return <div className="p-8">Child not found</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Profile */}
      <ProfileHeader child={child} />

      {/* Regression Alert Notification */}
      <AlertNotificationBanner
        alert={activeNotification}
        onDismiss={dismissNotification}
      />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showGamesTab={Boolean(child.showGames && child.gameSettings)}
      />

      {/* Tab Content with Suspense for lazy loading */}
      <Suspense fallback={<TabSkeleton />}>
        {activeTab === 'analysis' && (
          <AnalysisTab
            child={child}
            subjects={subjects}
            sessions={childSessions}
            profile={profile}
            profileLoading={profileLoading}
            profileConfidence={getConfidenceLevel()}
          />
        )}

        {activeTab === 'plan' && (
          <PlanTab
            child={child}
            subjects={subjects}
            upcomingTests={upcomingTests}
            addUpcomingTest={addUpcomingTest}
            updateUpcomingTest={updateUpcomingTest}
            removeUpcomingTest={removeUpcomingTest}
          />
        )}

        {activeTab === 'games' && child.showGames && child.gameSettings && (
          <GamesTab
            child={child}
            subjects={subjects}
            updateChild={updateChild}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            child={child}
            subjects={subjects}
            sessions={childSessions}
          />
        )}

        {activeTab === 'evaluations' && (
          <EvaluationsTab
            child={child}
            subjects={subjects}
            evaluations={evaluations}
            addEvaluation={addEvaluation}
            updateEvaluation={updateEvaluation}
            deleteEvaluation={deleteEvaluation}
            addUpcomingTest={addUpcomingTest}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            child={child}
            subjects={subjects}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            child={child}
            subjects={subjects}
            updateChild={updateChild}
            resetChildStats={resetChildStats}
          />
        )}
      </Suspense>
    </div>
  );
};

// --- Sub-components ---

interface ProfileHeaderProps {
  child: ReturnType<typeof useStore>['children'][number];
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ child }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center gap-6">
    <div className="text-6xl bg-indigo-50 p-4 rounded-full">{child.avatar}</div>
    <div className="text-center md:text-right flex-1">
      <h1 className="text-3xl font-bold text-gray-900">{child.name}</h1>
      <p className="text-gray-500">{child.grade}</p>
    </div>
    <div className="flex gap-4">
      <div className="bg-yellow-50 px-6 py-3 rounded-xl border border-yellow-100 text-center">
        <div className="text-sm text-gray-500">כוכבים</div>
        <div className="text-2xl font-bold text-yellow-600 flex items-center gap-1 justify-center">
          <Trophy size={20} /> {child.stars}
        </div>
      </div>
      <div className="bg-orange-50 px-6 py-3 rounded-xl border border-orange-100 text-center">
        <div className="text-sm text-gray-500">רצף ימים</div>
        <div className="text-2xl font-bold text-orange-600 flex items-center gap-1 justify-center">
          <Sparkles size={20} /> {child.streak}
        </div>
      </div>
    </div>
  </div>
);

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showGamesTab: boolean;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  showGamesTab
}) => {
  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode; show?: boolean }> = [
    { id: 'analysis', label: 'ניתוח ביצועים', icon: <TrendingUp size={18} /> },
    { id: 'plan', label: 'תוכנית לימודים', icon: <Calendar size={18} /> },
    { id: 'evaluations', label: 'הערכות', icon: <Award size={18} /> },
    { id: 'games', label: 'הגדרות משחק', icon: <Gamepad2 size={18} />, show: showGamesTab },
    { id: 'history', label: 'היסטוריה', icon: <RotateCcw size={18} /> },
    { id: 'notes', label: 'הערות', icon: <MessageSquare size={18} /> },
    { id: 'settings', label: 'הגדרות', icon: <Settings size={18} /> }
  ];

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex gap-1 overflow-x-auto px-2 md:px-1 scroll-smooth snap-x snap-mandatory md:snap-none"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {tabs.map(tab => {
        // Skip tabs that shouldn't show
        if (tab.show === false) return null;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-shrink-0 md:flex-1
              min-h-[44px] py-3 px-4
              rounded-lg text-sm font-medium
              flex items-center justify-center gap-2
              transition-all
              snap-start
              active:scale-95
              ${activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            {tab.icon}
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ChildDetails;
