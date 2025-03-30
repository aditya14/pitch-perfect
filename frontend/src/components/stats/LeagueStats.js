import React, { useState, useEffect } from 'react';

// Import Filter Components
import TimeFrameFilter from './filters/TimeFrameFilter';
import SquadFilter from './filters/SquadFilter';
import BoostFilter from './filters/BoostFilter';

// Import Chart Components
import RunningTotalChart from './charts/RunningTotalChart';

// Import Table Components
import SeasonMVPTable from './tables/SeasonMVPTable';
import MatchMVPTable from './tables/MatchMVPTable';
import SeasonTotalActivesTable from './tables/SeasonTotalActivesTable';
import MostPlayersInMatchTable from './tables/MostPlayersInMatchTable';
import MostPointsInMatchTable from './tables/MostPointsInMatchTable';
import RankBreakdownTable from './tables/RankBreakdownTable';
import DominationTable from './tables/DominationTable';

const LeagueStats = ({ league }) => {
  // Filter states
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('overall');
  const [selectedSquadIds, setSelectedSquadIds] = useState([]);
  const [includeBoost, setIncludeBoost] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Initialize selectedSquadIds with all squad IDs when league data loads
  useEffect(() => {
    if (league?.squads?.length > 0) {
      setSelectedSquadIds(league.squads.map(squad => squad.id));
    }
  }, [league?.squads]);

  if (!league) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Loading league data...
        </p>
      </div>
    );
  }

  // Tab definitions
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'player-stats', label: 'Player Stats' },
    { id: 'squad-stats', label: 'Squad Stats' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          League Statistics
        </h2>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 flex ">
          <TimeFrameFilter 
            selectedTimeFrame={selectedTimeFrame} 
            onChange={setSelectedTimeFrame} 
          />
          
          <SquadFilter 
            squads={league.squads || []} 
            selectedSquadIds={selectedSquadIds} 
            onChange={setSelectedSquadIds} 
          />
          
          <BoostFilter 
            includeBoost={includeBoost} 
            onChange={setIncludeBoost} 
          />
        </div>
        
        {/* Custom Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(index)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === index
                    ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Tab Content */}
        <div>
          {/* Overview Tab */}
          {activeTab === 0 && (
            <div className="space-y-6">
              <RunningTotalChart 
                league={league} 
                selectedSquadIds={selectedSquadIds} 
                selectedTimeFrame={selectedTimeFrame} 
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SeasonMVPTable 
                  league={league} 
                  selectedSquadIds={selectedSquadIds} 
                  selectedTimeFrame={selectedTimeFrame} 
                  includeBoost={includeBoost} 
                />
                
                <MostPointsInMatchTable 
                  league={league} 
                  selectedSquadIds={selectedSquadIds} 
                  selectedTimeFrame={selectedTimeFrame} 
                  includeBoost={includeBoost} 
                />
              </div>
              
              <RankBreakdownTable 
                league={league} 
                selectedSquadIds={selectedSquadIds} 
                selectedTimeFrame={selectedTimeFrame} 
              />
            </div>
          )}
          
          {/* Player Stats Tab */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <SeasonMVPTable 
                league={league} 
                selectedSquadIds={selectedSquadIds} 
                selectedTimeFrame={selectedTimeFrame} 
                includeBoost={includeBoost} 
              />
              
              <MatchMVPTable 
                league={league} 
                selectedSquadIds={selectedSquadIds} 
                selectedTimeFrame={selectedTimeFrame} 
                includeBoost={includeBoost} 
              />
            </div>
          )}
          
          {/* Squad Stats Tab */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SeasonTotalActivesTable 
                  league={league} 
                  selectedSquadIds={selectedSquadIds} 
                  selectedTimeFrame={selectedTimeFrame} 
                />
                
                <MostPlayersInMatchTable 
                  league={league} 
                  selectedSquadIds={selectedSquadIds} 
                  selectedTimeFrame={selectedTimeFrame} 
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MostPointsInMatchTable 
                  league={league} 
                  selectedSquadIds={selectedSquadIds} 
                  selectedTimeFrame={selectedTimeFrame} 
                  includeBoost={includeBoost} 
                />
                
                <DominationTable 
                  league={league} 
                  selectedSquadIds={selectedSquadIds} 
                  selectedTimeFrame={selectedTimeFrame} 
                />
              </div>
              
              <RankBreakdownTable 
                league={league} 
                selectedSquadIds={selectedSquadIds} 
                selectedTimeFrame={selectedTimeFrame} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeagueStats;