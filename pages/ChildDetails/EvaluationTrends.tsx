/**
 * EvaluationTrends Component
 *
 * Displays a line chart showing evaluation scores over time,
 * grouped by subject with different colored lines.
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Evaluation, Subject } from '../../types';

interface EvaluationTrendsProps {
  evaluations: Evaluation[];
  subjects: Subject[];
}

// Colors for different subjects in the chart
const CHART_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
];

export const EvaluationTrends: React.FC<EvaluationTrendsProps> = ({
  evaluations,
  subjects
}) => {
  // Transform data for the chart
  const chartData = useMemo(() => {
    // Filter evaluations with scores and sort by date
    const withScores = evaluations
      .filter(e => e.percentage !== undefined)
      .sort((a, b) => a.date - b.date);

    if (withScores.length === 0) return [];

    // Group by date for x-axis points
    const dateMap = new Map<string, Record<string, number | string>>();

    withScores.forEach(evaluation => {
      const dateKey = new Date(evaluation.date).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'short'
      });

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey });
      }

      const point = dateMap.get(dateKey)!;
      // Use subject name as key
      const subjectKey = evaluation.subjectName || 'אחר';
      point[subjectKey] = evaluation.percentage!;
    });

    return Array.from(dateMap.values());
  }, [evaluations]);

  // Get unique subjects that have data
  const activeSubjects = useMemo(() => {
    const subjectNames = new Set<string>();
    evaluations.forEach(e => {
      if (e.percentage !== undefined && e.subjectName) {
        subjectNames.add(e.subjectName);
      }
    });
    return Array.from(subjectNames);
  }, [evaluations]);

  // Map subject names to colors
  const subjectColors = useMemo(() => {
    const colors: Record<string, string> = {};
    activeSubjects.forEach((name, idx) => {
      // Try to match subject's actual color
      const subject = subjects.find(s => s.name === name);
      if (subject?.color) {
        // Extract color from Tailwind class (e.g., "bg-blue-500" -> "#3b82f6")
        colors[name] = CHART_COLORS[idx % CHART_COLORS.length];
      } else {
        colors[name] = CHART_COLORS[idx % CHART_COLORS.length];
      }
    });
    return colors;
  }, [activeSubjects, subjects]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-indigo-600" />
          <h3 className="font-bold text-gray-900">מגמות לאורך זמן</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          אין עדיין מספיק נתונים להצגת מגמות.
          <br />
          <span className="text-sm">העלו הערכות עם ציונים כדי לראות את ההתקדמות.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-indigo-600" />
        <h3 className="font-bold text-gray-900">מגמות לאורך זמן</h3>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                direction: 'rtl'
              }}
              formatter={(value: number) => [`${value}%`, '']}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend
              wrapperStyle={{ direction: 'rtl' }}
            />
            {activeSubjects.map((subjectName) => (
              <Line
                key={subjectName}
                type="monotone"
                dataKey={subjectName}
                stroke={subjectColors[subjectName]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
        {activeSubjects.map(subjectName => {
          const subjectEvals = evaluations.filter(
            e => e.subjectName === subjectName && e.percentage !== undefined
          );
          const avg = subjectEvals.length > 0
            ? Math.round(subjectEvals.reduce((sum, e) => sum + (e.percentage || 0), 0) / subjectEvals.length)
            : 0;

          return (
            <div key={subjectName} className="text-center">
              <div
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{ backgroundColor: subjectColors[subjectName] }}
              />
              <div className="text-sm text-gray-500">{subjectName}</div>
              <div className="font-bold text-gray-900">{avg}%</div>
              <div className="text-xs text-gray-400">{subjectEvals.length} הערכות</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvaluationTrends;
