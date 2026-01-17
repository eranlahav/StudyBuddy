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
import { Trophy, TrendingUp, AlertCircle } from 'lucide-react';
import { AnalysisTabProps, AnalysisData, TopicPerformance } from './types';

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  subjects,
  sessions
}) => {
  const [analysisFilter, setAnalysisFilter] = useState<string>('all');

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

export default AnalysisTab;
