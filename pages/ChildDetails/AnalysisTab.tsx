/**
 * Analysis Tab - Performance analytics for a child
 *
 * Shows progress charts, strengths, and areas for improvement
 * with optional subject filtering.
 */

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Brain, CheckCircle, BookOpen, AlertTriangle, Clock, TrendingUp as TrendIcon, Info, Trophy, TrendingUp, AlertCircle } from 'lucide-react';
import { AnalysisTabProps, AnalysisData, TopicPerformance } from './types';
import { LearnerProfile, TopicMastery, getMasteryLevel, MasteryLevel } from '../../types';
import { formatRelativeDay, getEngagementLabel, getEngagementColorClass } from '../../lib';
import { getConfidenceMessage } from '../../hooks';
import { SkillRadarChart } from './SkillRadarChart';
import { ProgressTimeline } from './ProgressTimeline';

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  subjects,
  sessions,
  profile,
  profileLoading,
  profileConfidence
}) => {
  const [analysisFilter, setAnalysisFilter] = useState<string>('all');
  // IMPORTANT: Store the full TopicMastery object, not just a string key
  // This avoids lookup issues with composite keys not matching topicMastery structure
  const [selectedTopic, setSelectedTopic] = useState<TopicMastery | null>(null);

  // Compute analysis data
  const analysisData = useMemo((): AnalysisData => {
    // Filter sessions based on selected subject
    const filteredSessions = analysisFilter === 'all'
      ? sessions
      : sessions.filter(s => s.subjectId === analysisFilter);

    // Take last 20 sessions for chart clarity, reverse for chronological order
    const sessionsForChart = [...filteredSessions].slice(0, 20).reverse();

    const progressData = sessionsForChart.map(s => ({
      date: new Date(s.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
      score: Math.round((s.score / s.totalQuestions) * 100),
      topic: s.topic,
      subjectName: subjects.find(sub => sub.id === s.subjectId)?.name
    }));

    // Aggregate stats by topic
    const topicStats: Record<string, { correct: number; total: number; subjectName: string; rawTopic: string }> = {};
    let totalCorrect = 0;
    let totalQuestions = 0;

    filteredSessions.forEach(s => {
      const key = `${s.topic}::${s.subjectId}`;
      if (!topicStats[key]) {
        topicStats[key] = {
          correct: 0,
          total: 0,
          subjectName: subjects.find(sub => sub.id === s.subjectId)?.name || '',
          rawTopic: s.topic
        };
      }
      topicStats[key].correct += s.score;
      topicStats[key].total += s.totalQuestions;
      totalCorrect += s.score;
      totalQuestions += s.totalQuestions;
    });

    const topicPerformance: TopicPerformance[] = Object.values(topicStats).map((stats) => ({
      topicOnly: stats.rawTopic,
      subject: stats.subjectName,
      percentage: Math.round((stats.correct / stats.total) * 100),
      count: stats.total
    }));

    const overallAverage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const strongTopics = [...topicPerformance].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
    const weakTopics = [...topicPerformance].filter(t => t.percentage < 80).sort((a, b) => a.percentage - b.percentage).slice(0, 3);
    const allTopics = [...topicPerformance].sort((a, b) => b.percentage - a.percentage);

    return { progressData, strongTopics, weakTopics, overallAverage, allTopics };
  }, [sessions, subjects, analysisFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Subject Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setAnalysisFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border shadow-sm ${
            analysisFilter === 'all'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          הכל
        </button>
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => setAnalysisFilter(sub.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border shadow-sm flex items-center gap-2 ${
              analysisFilter === sub.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{sub.icon}</span>
            {sub.name}
          </button>
        ))}
      </div>

      {/* NEW: Topic Mastery Section - Full width */}
      <TopicMasterySection
        profile={profile}
        profileLoading={profileLoading}
        profileConfidence={profileConfidence}
        subjects={subjects}
        selectedSubject={analysisFilter}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
      />

      {/* Progress Timeline - shown when topic clicked */}
      {selectedTopic && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-gray-900">מגמת התקדמות</h3>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              סגור
            </button>
          </div>
          <ProgressTimeline
            topic={selectedTopic.topic}
            sessions={sessions}
            currentMastery={selectedTopic}
          />
        </div>
      )}

      {/* Skill Radar Chart - only show if subject selected and profile exists */}
      {analysisFilter !== 'all' && profile && (
        <SkillRadarChart
          profile={profile}
          subjectId={analysisFilter}
          subjectName={subjects.find(s => s.id === analysisFilter)?.name || analysisFilter}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress Chart */}
        <ProgressChart
          data={analysisData.progressData}
          filterName={analysisFilter !== 'all' ? subjects.find(s => s.id === analysisFilter)?.name : undefined}
        />

        <div className="space-y-6">
          {/* Strengths */}
          <StrengthsCard topics={analysisData.strongTopics} />

          {/* Weaknesses */}
          <WeaknessesCard
            topics={analysisData.weakTopics}
            hasData={analysisData.progressData.length > 0}
          />
        </div>
      </div>
    </div>
  );
};

// --- Memoized Sub-components ---
// These components use React.memo() to prevent unnecessary re-renders
// when parent state changes but their props remain the same.

interface ProgressChartProps {
  data: AnalysisData['progressData'];
  filterName?: string;
}

const ProgressChart = React.memo<ProgressChartProps>(({ data, filterName }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
      <TrendingUp size={20} className="text-indigo-600" /> מגמת שיפור
      {filterName && <span className="text-sm font-normal text-gray-500">({filterName})</span>}
    </h3>
    <div className="h-64">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              unit="%"
              domain={[0, 100]}
              orientation="right"
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                direction: 'rtl'
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ fill: '#6366f1', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-gray-400">
          אין מספיק נתונים להצגת גרף
        </div>
      )}
    </div>
  </div>
));
ProgressChart.displayName = 'ProgressChart';

interface StrengthsCardProps {
  topics: TopicPerformance[];
}

const StrengthsCard = React.memo<StrengthsCardProps>(({ topics }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
    <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
      <Trophy size={20} /> נקודות חוזקה
    </h3>
    {topics.length > 0 ? (
      <div className="space-y-3">
        {topics.map((item, i) => (
          <div key={i} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <div>
              <div className="font-bold text-gray-800">{item.topicOnly}</div>
              <div className="text-xs text-green-600">{item.subject}</div>
            </div>
            <div className="text-green-700 font-bold">{item.percentage}%</div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500">עדיין אין מספיק נתונים לזיהוי חוזקות.</p>
    )}
  </div>
));
StrengthsCard.displayName = 'StrengthsCard';

interface WeaknessesCardProps {
  topics: TopicPerformance[];
  hasData: boolean;
}

const WeaknessesCard = React.memo<WeaknessesCardProps>(({ topics, hasData }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
    <h3 className="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2">
      <AlertCircle size={20} /> נושאים לחיזוק
    </h3>
    {topics.length > 0 ? (
      <div className="space-y-3">
        {topics.map((item, i) => (
          <div key={i} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
            <div>
              <div className="font-bold text-gray-800">{item.topicOnly}</div>
              <div className="text-xs text-orange-600">{item.subject}</div>
            </div>
            <div className="text-orange-700 font-bold">{item.percentage}%</div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500">
        {hasData ? "מצוין! אין נושאים חלשים כרגע." : "עדיין אין מספיק נתונים."}
      </p>
    )}
  </div>
));
WeaknessesCard.displayName = 'WeaknessesCard';

// --- Topic Mastery Section ---

interface TopicMasteryCardProps {
  mastery: TopicMastery;
  subjectName: string;
  onSelect?: () => void;  // Callback for drill-down to timeline
}

const TopicMasteryCard = React.memo<TopicMasteryCardProps>(({ mastery, subjectName, onSelect }) => {
  const level = getMasteryLevel(mastery.pKnown);
  const percentage = Math.round(mastery.pKnown * 100);

  const levelConfig = {
    mastered: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: CheckCircle,
      label: 'נשלט'
    },
    learning: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: BookOpen,
      label: 'בלמידה'
    },
    weak: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      icon: AlertTriangle,
      label: 'לחיזוק'
    }
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  const trendIcon = {
    improving: { icon: TrendIcon, color: 'text-green-500', rotate: '' },
    stable: { icon: TrendIcon, color: 'text-gray-400', rotate: 'rotate-90' },
    declining: { icon: TrendIcon, color: 'text-red-500', rotate: 'rotate-180' }
  };

  const trend = trendIcon[mastery.recentTrend];

  return (
    <div
      className={`p-4 rounded-xl border ${config.bg} ${config.border} ${onSelect ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => e.key === 'Enter' && onSelect() : undefined}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Icon size={18} className={config.text} />
          <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <trend.icon size={14} className={`${trend.color} ${trend.rotate}`} />
        </div>
      </div>

      <h4 className="font-bold text-gray-900 mb-1">{mastery.topic}</h4>
      <p className="text-xs text-gray-500 mb-3">{subjectName}</p>

      {/* Mastery bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">שליטה</span>
          <span className={`font-bold ${config.text}`}>{percentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              level === 'mastered' ? 'bg-green-500' :
              level === 'learning' ? 'bg-blue-500' : 'bg-orange-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Signal source and engagement indicators */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {/* Signal source indicator */}
        {mastery.lastSignalType && (
          <span className="text-xs text-gray-500">
            {mastery.lastSignalType === 'evaluation' && '📄 מבחן'}
            {mastery.lastSignalType === 'quiz' && '📝 תרגול'}
            {mastery.lastSignalType === 'engagement' && '⏱️ מעורבות'}
            {mastery.lastSignalType === 'parent_note' && '👨‍👩‍👧 הערה'}
          </span>
        )}
        {/* Engagement level display */}
        {mastery.lastEngagementLevel && (
          <span className={`text-xs ${getEngagementColorClass(mastery.lastEngagementLevel)}`}>
            {getEngagementLabel(mastery.lastEngagementLevel)}
          </span>
        )}
      </div>

      {/* Multi-dimensional metrics */}
      {mastery.dimensions && (
        <div className="mb-3 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-600 grid grid-cols-3 gap-2">
            <div>
              <span className="text-gray-400">דיוק:</span>{' '}
              {Math.round(mastery.dimensions.accuracy * 100)}%
            </div>
            <div>
              <span className="text-gray-400">מהירות:</span>{' '}
              {mastery.dimensions.speed >= 1 ? 'מהיר' : mastery.dimensions.speed >= 0.7 ? 'נורמלי' : 'איטי'}
            </div>
            <div>
              <span className="text-gray-400">עקביות:</span>{' '}
              {Math.round(mastery.dimensions.consistency * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Parent notes count */}
      {mastery.parentNotes && mastery.parentNotes.length > 0 && (
        <div className="text-xs text-purple-600 mb-2">
          👨‍👩‍👧 {mastery.parentNotes.length} הערות הורים
        </div>
      )}

      {/* Stats */}
      <div className="flex justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <BookOpen size={12} />
          {mastery.attempts} שאלות
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatRelativeDay(mastery.lastAttempt)}
        </span>
      </div>
    </div>
  );
});
TopicMasteryCard.displayName = 'TopicMasteryCard';

interface TopicMasterySectionProps {
  profile: LearnerProfile | null;
  profileLoading: boolean;
  profileConfidence: 'low' | 'medium' | 'high';
  subjects: { id: string; name: string }[];
  selectedSubject: string;
  selectedTopic: TopicMastery | null;
  setSelectedTopic: (topic: TopicMastery | null) => void;
}

const TopicMasterySection = React.memo<TopicMasterySectionProps>(({
  profile,
  profileLoading,
  profileConfidence,
  subjects,
  selectedSubject,
  selectedTopic,
  setSelectedTopic
}) => {
  if (profileLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain size={20} className="text-purple-600" /> שליטה בנושאים
        </h3>
        <div className="flex items-center justify-center h-32 text-gray-400">
          <div className="animate-pulse">טוען פרופיל...</div>
        </div>
      </div>
    );
  }

  if (!profile || Object.keys(profile.topicMastery).length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain size={20} className="text-purple-600" /> שליטה בנושאים
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Brain size={48} className="mx-auto mb-3 text-gray-300" />
          <p>עדיין אין נתונים על שליטה בנושאים.</p>
          <p className="text-sm mt-1">הנתונים יופיעו אחרי התרגול הראשון.</p>
        </div>
      </div>
    );
  }

  // Filter topics by selected subject
  const allTopics = Object.values(profile.topicMastery);
  const filteredTopics = selectedSubject === 'all'
    ? allTopics
    : allTopics.filter(t => t.subjectId === selectedSubject);

  // Group by mastery level
  const mastered = filteredTopics.filter(t => getMasteryLevel(t.pKnown) === 'mastered');
  const learning = filteredTopics.filter(t => getMasteryLevel(t.pKnown) === 'learning');
  const weak = filteredTopics.filter(t => getMasteryLevel(t.pKnown) === 'weak');

  // Sort each group by pKnown (highest first for mastered, lowest first for weak)
  mastered.sort((a, b) => b.pKnown - a.pKnown);
  learning.sort((a, b) => b.pKnown - a.pKnown);
  weak.sort((a, b) => a.pKnown - b.pKnown);

  const getSubjectName = (subjectId: string) =>
    subjects.find(s => s.id === subjectId)?.name || subjectId;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Brain size={20} className="text-purple-600" /> שליטה בנושאים
        </h3>
        {/* Confidence indicator */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Info size={14} />
          <span>{getConfidenceMessage(profileConfidence)}</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-700">{mastered.length}</div>
          <div className="text-xs text-green-600">נשלט</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">{learning.length}</div>
          <div className="text-xs text-blue-600">בלמידה</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-700">{weak.length}</div>
          <div className="text-xs text-orange-600">לחיזוק</div>
        </div>
      </div>

      {/* Topic cards */}
      {filteredTopics.length > 0 ? (
        <div className="space-y-4">
          {/* Weak topics first (priority for improvement) */}
          {weak.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1">
                <AlertTriangle size={14} /> נושאים לחיזוק
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {weak.map(topic => (
                  <TopicMasteryCard
                    key={`${topic.subjectId}-${topic.topic}`}
                    mastery={topic}
                    subjectName={getSubjectName(topic.subjectId)}
                    onSelect={() => setSelectedTopic(topic)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Learning topics */}
          {learning.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <BookOpen size={14} /> בתהליך למידה
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {learning.map(topic => (
                  <TopicMasteryCard
                    key={`${topic.subjectId}-${topic.topic}`}
                    mastery={topic}
                    subjectName={getSubjectName(topic.subjectId)}
                    onSelect={() => setSelectedTopic(topic)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mastered topics */}
          {mastered.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                <CheckCircle size={14} /> נושאים נשלטים
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mastered.map(topic => (
                  <TopicMasteryCard
                    key={`${topic.subjectId}-${topic.topic}`}
                    mastery={topic}
                    subjectName={getSubjectName(topic.subjectId)}
                    onSelect={() => setSelectedTopic(topic)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          אין נושאים במקצוע זה עדיין.
        </div>
      )}
    </div>
  );
});
TopicMasterySection.displayName = 'TopicMasterySection';

export default AnalysisTab;
