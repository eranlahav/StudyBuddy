/**
 * Progress Timeline - Area chart showing mastery progress over time
 *
 * Displays chronological session history for a specific topic,
 * using session accuracy as a proxy for historical mastery levels.
 * Includes current mastery point if available.
 *
 * Phase 5 - Profile Maintenance & Visualization
 */

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Clock } from 'lucide-react';
import { StudySession, TopicMastery } from '../../types';

interface ProgressTimelineProps {
  topic: string;
  sessions: StudySession[];
  currentMastery?: TopicMastery;
}

interface TimelineDataPoint {
  date: string;
  accuracy: number;
  mastery?: number;
  sessionLabel?: string;
}

/**
 * Area chart showing mastery/accuracy progress over time for a topic.
 * Uses session accuracy as historical proxy since pKnown snapshots
 * are not stored in sessions (future enhancement).
 */
export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({
  topic,
  sessions,
  currentMastery
}) => {
  const timelineData = useMemo((): TimelineDataPoint[] => {
    // Filter sessions for this specific topic
    const topicSessions = sessions
      .filter(s => s.topic === topic)
      .sort((a, b) => a.date - b.date); // Chronological order

    if (topicSessions.length === 0) return [];

    // Build timeline from session accuracy
    const points: TimelineDataPoint[] = topicSessions.map((session, index) => {
      const accuracy = Math.round((session.score / session.totalQuestions) * 100);
      const sessionDate = new Date(session.date);

      return {
        date: sessionDate.toLocaleDateString('he-IL', {
          day: '2-digit',
          month: '2-digit'
        }),
        accuracy,
        sessionLabel: `תרגול ${index + 1}`
      };
    });

    // Add current mastery point if available
    if (currentMastery) {
      const today = new Date();
      const lastSessionDate = new Date(topicSessions[topicSessions.length - 1].date);

      // Only add "today" point if last session wasn't today
      const isToday = lastSessionDate.toDateString() === today.toDateString();

      if (!isToday) {
        points.push({
          date: 'היום',
          accuracy: Math.round(
            (currentMastery.correctCount / Math.max(1, currentMastery.correctCount + currentMastery.incorrectCount)) * 100
          ),
          mastery: Math.round(currentMastery.pKnown * 100),
          sessionLabel: 'נוכחי'
        });
      } else {
        // Update last point with mastery
        points[points.length - 1].mastery = Math.round(currentMastery.pKnown * 100);
      }
    }

    return points;
  }, [sessions, topic, currentMastery]);

  // Empty state
  if (timelineData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-indigo-600" />
          מגמת התקדמות - {topic}
        </h3>
        <div className="text-center py-12 text-gray-500">
          <Clock size={48} className="mx-auto mb-3 text-gray-300" />
          <p>אין נתונים היסטוריים לנושא זה</p>
          <p className="text-sm mt-1">נתוני התקדמות יופיעו לאחר תרגולים</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-indigo-600" />
        מגמת התקדמות - {topic}
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={timelineData}>
          <defs>
            <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            unit="%"
            orientation="right"
            tickCount={5}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              direction: 'rtl',
              textAlign: 'right'
            }}
            formatter={(value: number, name: string) => {
              const label = name === 'accuracy' ? 'דיוק' : 'שליטה';
              return [`${value}%`, label];
            }}
            labelFormatter={(label: string, payload: Array<{ payload: TimelineDataPoint }>) => {
              if (payload?.[0]?.payload?.sessionLabel) {
                return `${payload[0].payload.sessionLabel} (${label})`;
              }
              return label;
            }}
          />
          <Area
            type="monotone"
            dataKey="accuracy"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#accuracyGradient)"
            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
          {/* Show mastery line if available */}
          {timelineData.some(d => d.mastery !== undefined) && (
            <Area
              type="monotone"
              dataKey="mastery"
              stroke="#10b981"
              strokeWidth={2}
              fill="none"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              strokeDasharray="5 5"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-6 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span>דיוק בתרגול</span>
        </div>
        {currentMastery && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500" style={{ borderStyle: 'dashed' }} />
            <span>רמת שליטה</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTimeline;
