import React, { useState } from 'react';
import FantasyPlayerSeason from './FantasyPlayerSeason';
import FantasyPlayerHistory from './FantasyPlayerHistory';

const FantasyPlayerView = ({ player, leagueId }) => {
  const [activeTab, setActiveTab] = useState('Current Season');
  const tabs = ['Current Season', 'Historical Data'];

  return (
    <div className="w-full py-4">
      {/* Tabs */}
      <div className="flex space-x-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium leading-5 ${
              activeTab === tab
                ? 'bg-white text-blue-700 shadow'
                : 'text-gray-700 hover:bg-white/[0.12] hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === 'Current Season' ? (
          <FantasyPlayerSeason player={player} />
        ) : (
          <FantasyPlayerHistory player={player} leagueId={leagueId} />
        )}
      </div>
    </div>
  );
};

export default FantasyPlayerView;