import React from 'react';

const BoostFilter = ({ includeBoost, onChange }) => {
  return (
    <div className="filter-container">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Point Calculation
      </label>
      <div className="flex items-center h-10 mt-1">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            value=""
            className="sr-only peer"
            checked={includeBoost}
            onChange={() => onChange(!includeBoost)}
          />
          <div className="relative w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-600"></div>
          <span className="ms-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {includeBoost ? 'Base + Boost' : 'Base Only'}
          </span>
        </label>
      </div>
    </div>
  );
};

export default BoostFilter;