import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';

const BaseLineChart = ({ 
  data, 
  dataKeys,
  xAxisDataKey = 'name',
  xAxisLabel = '',
  yAxisLabel = '',
  height = 300,
  getStrokeColor,
  customTooltip,
  title,
  subtitle,
  loading = false,
  error = null,
  emptyMessage = 'No data available'
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 shadow rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <div className="space-y-4">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-1/4"></div>
          <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-900 shadow rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 shadow rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <p className="text-neutral-500 dark:text-neutral-400 text-center">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Fallback colors if getStrokeColor is not provided
  const defaultColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
  ];

  // Function to get colors, either from provided function or fallback
  const getColor = (key, index) => {
    if (getStrokeColor) {
      return getStrokeColor(key);
    }
    return defaultColors[index % defaultColors.length];
  };

  return (
    <div className="bg-white dark:bg-black shadow rounded-lg p-3 border border-neutral-200 dark:border-neutral-900">
      {title && (
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis 
              dataKey={xAxisDataKey} 
              label={{ 
                value: xAxisLabel, 
                position: 'insideBottom',
                offset: -10,
                style: { textAnchor: 'middle', fill: '#4B5563' }
              }}
              tick={{ fill: '#4B5563' }}
              tickLine={{ stroke: '#6B7280' }}
            />
            <YAxis 
              tick={{ fill: '#4B5563' }}
              tickLine={{ stroke: '#6B7280' }}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#4B5563' }
              }}
            />
            {customTooltip ? <Tooltip content={customTooltip} /> : <Tooltip />}
            {dataKeys.map((key, index) => (
              <Line
                key={key.dataKey}
                type="monotone"
                dataKey={key.dataKey}
                name={key.name || key.dataKey}
                stroke={getColor(key.dataKey, index)}
                activeDot={{ r: 6 }}
                strokeWidth={2}
                dot={true}
                hide={key.hide}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BaseLineChart;