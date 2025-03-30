import React, { useState } from 'react';
import FantasyPlayerSeason from './FantasyPlayerSeason';
import FantasyPlayerHistory from './FantasyPlayerHistory';

const FantasyPlayerView = ({ player, leagueId }) => {
  const [activeTab, setActiveTab] = useState('Current Season');
  const tabs = ['Current Season', 'Historical Data'];

  return (
    <div className="w-full">
      {/* Tabs - reduced padding and text size on mobile */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-800 mb-3 sm:mb-4">
        <div className="flex space-x-1 rounded-xl bg-neutral-100 dark:bg-neutral-700 p-0.5 sm:p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm font-medium leading-5 
                ${activeTab === tab
                  ? 'bg-white dark:bg-neutral-800 text-blue-700 dark:text-blue-400 shadow'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-white/[0.12] dark:hover:bg-neutral-600'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'Current Season' ? (
          <FantasyPlayerSeason player={player} leagueId={leagueId} />
        ) : (
          <FantasyPlayerHistory player={player} />
        )}
      </div>
    </div>
  );
};

export default FantasyPlayerView;