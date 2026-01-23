/**
 * Skill Radar Chart - Visual representation of topic mastery distribution
 *
 * Shows pKnown values for all skills in a subject as a radar/spider chart.
 * Enables parents to quickly identify strengths and weaknesses at a glance.
 *
 * Phase 5 - Profile Maintenance & Visualization
 */

import React, { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { Radar as RadarIcon } from 'lucide-react';
import { LearnerProfile } from '../../types';

interface SkillRadarChartProps {
  profile: LearnerProfile;
  subjectId: string;
  subjectName: string;
}

/**
 * Radar chart showing skill distribution for a single subject.
 * Requires minimum 3 topics to display meaningful radar visualization.
 * Limits to 8 topics maximum for readability.
 */
export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({
  profile,
  subjectId,
  subjectName
}) => {
  // Extract and transform topics for this subject
  const chartData = useMemo(() => {
    const topics = Object.values(profile.topicMastery)
      .filter(m => m.subjectId === subjectId)
      .sort((a, b) => b.pKnown - a.pKnown) // Highest mastery first
      .slice(0, 8); // Max 8 topics for readability

    // Transform to recharts format with truncated labels
    return topics.map(t => ({
      topic: t.topic.length > 12 ? t.topic.slice(0, 12) + '...' : t.topic,
      mastery: Math.round(t.pKnown * 100),
      fullTopic: t.topic,
      attempts: t.attempts
    }));
  }, [profile.topicMastery, subjectId]);

  // Need minimum 3 topics for meaningful radar
  if (chartData.length < 3) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <RadarIcon size={20} className="text-indigo-600" />
          מפת מיומנויות - {subjectName}
        </h3>
        <div className="text-center py-12 text-gray-500">
          <RadarIcon size={48} className="mx-auto mb-3 text-gray-300" />
          <p>לא מספיק נושאים להצגת גרף מכ״ם</p>
          <p className="text-sm mt-1">נדרשים לפחות 3 נושאים</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <RadarIcon size={20} className="text-indigo-600" />
        מפת מיומנויות - {subjectName}
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="topic"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
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
            formatter={(value: number, _name: string, props: { payload: { fullTopic: string; attempts: number } }) => [
              `${value}%`,
              `${props.payload.fullTopic} (${props.payload.attempts} שאלות)`
            ]}
          />
          <Radar
            name="שליטה"
            dataKey="mastery"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.5}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{ direction: 'rtl', paddingTop: '10px' }}
            iconType="circle"
          />
        </RadarChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-500 text-center mt-2">
        כל ציר מייצג נושא, המרחק מהמרכז = רמת שליטה (0-100%)
      </p>
    </div>
  );
};

export default SkillRadarChart;
