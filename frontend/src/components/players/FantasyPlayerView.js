import React, { useState } from 'react';
import FantasyPlayerSeason from './FantasyPlayerSeason';
import FantasyPlayerHistory from './FantasyPlayerHistory';

const FantasyPlayerView = ({ player, leagueId }) => {
  const [activeTab, setActiveTab] = useState('Current Season');
  const [viewMode, setViewMode] = useState('collector');
  const tabs = ['Current Season', 'Historical Data'];
  const viewModes = [
    { id: 'collector', label: 'Collector' },
    { id: 'report', label: 'Report' },
  ];

  return (
    <div className="w-full">
      {/* Tabs - reduced padding and text size on mobile */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md mb-3 sm:mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex space-x-1 rounded-xl bg-neutral-100/80 dark:bg-neutral-700/80 p-0.5 sm:p-1 lg-glass-tertiary">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm font-medium leading-5 
                  ${activeTab === tab
                    ? 'bg-white/90 dark:bg-neutral-900 text-blue-700 dark:text-blue-400 shadow'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-white/[0.2] dark:hover:bg-neutral-600/70'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <div className="flex items-center gap-1 lg-glass-tertiary lg-rounded-full p-1">
              {viewModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`px-3 py-1 text-[11px] sm:text-xs font-medium rounded-full transition-colors
                    ${viewMode === mode.id
                      ? 'bg-white/90 dark:bg-neutral-900 text-neutral-900 dark:text-white shadow'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-white/30 dark:hover:bg-neutral-700/60'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'Current Season' ? (
          <FantasyPlayerSeason player={player} leagueId={leagueId} viewMode={viewMode} />
        ) : (
          <FantasyPlayerHistory player={player} viewMode={viewMode} />
        )}
      </div>
    </div>
  );
};

export default FantasyPlayerView;
