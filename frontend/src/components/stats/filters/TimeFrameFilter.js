import React from 'react';

const TimeFrameFilter = ({ selectedTimeFrame, onChange }) => {
  const timeFrameOptions = [
    { value: 'overall', label: 'All Matches' },
    { value: '1', label: 'Week 1' },
    { value: '2', label: 'Week 2' },
    { value: '3', label: 'Week 3' },
    { value: '4', label: 'Week 4' },
    { value: '5', label: 'Week 5' },
    { value: '6', label: 'Week 6' },
    { value: '7', label: 'Week 7' },
    { value: '8', label: 'Week 8' },
  ];

  return (
    <div className="filter-container">
      <label htmlFor="time-frame" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Time Frame
      </label>
      <select
        id="time-frame"
        value={selectedTimeFrame}
        onChange={(e) => onChange(e.target.value)}
        className="lg-glass-tertiary border border-white/50 dark:border-white/10 text-neutral-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
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
