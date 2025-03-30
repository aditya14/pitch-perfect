import React from 'react';

const TimeFrameFilter = ({ selectedTimeFrame, onChange }) => {
  const timeFrameOptions = [
    { value: 'overall', label: 'All Matches' },
    { value: 'last5', label: 'Last 5 Matches' },
    { value: 'last10', label: 'Last 10 Matches' },
    { value: 'phase1', label: 'Week 1' },
    { value: 'phase2', label: 'Week 2' },
    // { value: 'phase3', label: 'Phase 3' }
  ];

  return (
    <div className="filter-container">
      <label htmlFor="time-frame" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Time Frame
      </label>
      <select
        id="time-frame"
        value={selectedTimeFrame}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
      >
        {timeFrameOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimeFrameFilter;