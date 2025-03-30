import React from 'react';

const BoostFilter = ({ includeBoost, onChange }) => {
  return (
    <div className="filter-container flex items-center sm:mt-0 md:mt-5">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={includeBoost}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Include Boost Points
        </span>
      </label>
    </div>
  );
};

export default BoostFilter;