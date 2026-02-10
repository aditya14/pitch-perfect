import React, { useState, useEffect } from 'react';

// Import Filter Components
import TimeFrameFilter from './filters/TimeFrameFilter';
import SquadFilter from './filters/SquadFilter';
import BoostFilter from './filters/BoostFilter';

// Import Chart Components
import RunningTotalChart from './charts/RunningTotalChart';

// Import Table Components
import RunningMVPTable from './tables/RunningMVPTable';
import MatchMVPTable from './tables/MatchMVPTable';
import RunningTotalActivesTable from './tables/RunningTotalActivesTable';
import MostPlayersInMatchTable from './tables/MostPlayersInMatchTable';
import MostPointsInMatchTable from './tables/MostPointsInMatchTable';
import RankBreakdownTable from './tables/RankBreakdownTable';
import DominationTable from './tables/DominationTable';

const StatsContainer = ({ league }) => {
  // Filter states
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('overall');
  const [selectedSquadIds, setSelectedSquadIds] = useState([]);
  const [includeBoost, setIncludeBoost] = useState(true);
  
  // Initialize selectedSquadIds with all squad IDs when league data loads
  useEffect(() => {
    if (league?.squads?.length > 0) {
      setSelectedSquadIds(league.squads.map(squad => squad.id));
    }
  }, [league?.squads]);

  if (!league) {
    return (
      <div className="lg-glass lg-rounded-xl p-6 border border-white/40 dark:border-white/10">
        <p className="text-neutral-500 dark:text-neutral-400 text-center">
          Loading league data...
        </p>
      </div>
    );
  }

  return (
    <div className="lg-glass lg-rounded-xl border border-white/40 dark:border-white/10 p-4 md:p-6">
      {/* Header and Filters */}
      <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 font-caption">
        League Statistics
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
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

      {/* 1. Running Total Graph */}
      <RunningTotalChart 
        league={league} 
        selectedSquadIds={selectedSquadIds} 
        selectedTimeFrame={selectedTimeFrame}
        includeBoost={includeBoost}
      />
      <div className='mb-6'></div>

      {/* 2. Season MVP and Match MVP side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div>
          <RunningMVPTable 
            league={league} 
            selectedSquadIds={selectedSquadIds} 
            selectedTimeFrame={selectedTimeFrame} 
            includeBoost={includeBoost} 
            limit={10}
            hideTitle={true}
          />
        </div>
        <div>
          <MatchMVPTable 
            league={league} 
            selectedSquadIds={selectedSquadIds} 
            selectedTimeFrame={selectedTimeFrame} 
            includeBoost={includeBoost} 
            limit={10}
            hideTitle={true}
          />
        </div>
      </div>

      {/* 3. Most Points in Match and Domination */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div>
          <MostPointsInMatchTable 
            league={league} 
            selectedSquadIds={selectedSquadIds} 
            selectedTimeFrame={selectedTimeFrame} 
            includeBoost={includeBoost} 
            hideTitle={true}
          />
        </div>
        <div>
          <DominationTable 
            league={league} 
            selectedSquadIds={selectedSquadIds} 
            selectedTimeFrame={selectedTimeFrame} 
            hideTitle={true}
          />
        </div>
      </div>

      {/* 4. Season Total Actives and Most Players in Match */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div>
          <RunningTotalActivesTable 
            league={league} 
            selectedSquadIds={selectedSquadIds} 
            selectedTimeFrame={selectedTimeFrame} 
            hideTitle={true}
          />
        </div>
        <div>
          <MostPlayersInMatchTable 
            league={league} 
            selectedSquadIds={selectedSquadIds} 
            selectedTimeFrame={selectedTimeFrame} 
            hideTitle={true}
          />
        </div>
      </div>

      {/* 5. Rank Breakdown */}
      <div className="mb-2"></div>
      <RankBreakdownTable 
        league={league} 
        selectedSquadIds={selectedSquadIds} 
        selectedTimeFrame={selectedTimeFrame} 
        hideTitle={true}
      />
    </div>
  );
};

export default StatsContainer;
