import React, { useState } from 'react';

const SquadFilter = ({ squads, selectedSquadIds, onChange }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSquadToggle = (squadId) => {
    if (selectedSquadIds.includes(squadId)) {
      onChange(selectedSquadIds.filter(id => id !== squadId));
    } else {
      onChange([...selectedSquadIds, squadId]);
    }
  };

  const handleSelectAll = () => {
    onChange(squads.map(squad => squad.id));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  return (
    <div className="filter-container relative">
      <label htmlFor="squad-filter" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Squads
      </label>
      <button
        id="squad-filter"
        onClick={toggleDropdown}
        className="lg-glass-tertiary border border-white/50 dark:border-white/10 text-neutral-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 text-left flex justify-between items-center"
      >
        <span>
          {selectedSquadIds.length === 0
            ? 'No squads selected'
            : selectedSquadIds.length === squads.length
            ? 'All squads'
            : `${selectedSquadIds.length} squad${selectedSquadIds.length > 1 ? 's' : ''} selected`}
        </span>
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 lg-glass lg-rounded-lg border border-white/50 dark:border-white/10 shadow-lg">
          <div className="p-2 border-b border-neutral-200/70 dark:border-neutral-700/70 flex justify-between">
            <button
              onClick={handleSelectAll}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              Deselect All
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {squads.map(squad => (
              <div
                key={squad.id}
                className="flex items-center p-2 hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer"
                onClick={() => handleSquadToggle(squad.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedSquadIds.includes(squad.id)}
                  onChange={() => {}}
                  className="w-4 h-4 text-primary-600 bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 rounded focus:ring-primary-500"
                />
                <div
                  className="w-3 h-3 rounded-full ml-2"
                  style={{ backgroundColor: squad.color || '#808080' }}
                ></div>
                <label className="ml-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  {squad.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SquadFilter;
