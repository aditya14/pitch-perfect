import React, { useState, useMemo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import SimpleMatchPerformance from './SimpleMatchPerformance';
import DetailedMatchPerformance from './DetailedMatchPerformance';
import { getEventData } from '../../../utils/matchUtils';

const MatchPerformanceContainer = ({ 
  playerEvents, 
  loading, 
  error, 
  sortConfig, 
  handleSort, 
  activeSquadId, 
  leagueId,
  isMobile
}) => {
  const [viewMode, setViewMode] = useState('simple'); // 'simple' or 'detailed'

  // Process the data once for both views
  const processedEvents = useMemo(() => {
    if (!playerEvents?.length) return [];
    return playerEvents.map(event => getEventData(event));
  }, [playerEvents]);

  const hasFantasyData = useMemo(() => {
    return playerEvents.some(event => event.fantasy_points || event.squad_name);
  }, [playerEvents]);

  // Toggle between simple and detailed views
  const toggleViewMode = () => {
    setViewMode(viewMode === 'simple' ? 'detailed' : 'simple');
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Match Performance
        </h2>
        {!isMobile && (
          <button
            onClick={toggleViewMode}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={viewMode === 'simple' ? 'Show detailed view' : 'Show simple view'}
          >
            {viewMode === 'simple' ? (
              <Maximize2 className="h-5 w-5" />
            ) : (
              <Minimize2 className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {/* On mobile, always show the detailed view */}
      {isMobile ? (
        <DetailedMatchPerformance 
          processedEvents={processedEvents}
          handleSort={handleSort}
          sortConfig={sortConfig}
          hasFantasyData={hasFantasyData}
          leagueId={leagueId}
          activeSquadId={activeSquadId}
          isMobile={isMobile}
        />
      ) : (
        viewMode === 'simple' ? (
          <SimpleMatchPerformance 
            processedEvents={processedEvents}
            handleSort={handleSort}
            sortConfig={sortConfig}
            hasFantasyData={hasFantasyData}
            leagueId={leagueId}
            activeSquadId={activeSquadId}
            isMobile={isMobile}
          />
        ) : (
          <DetailedMatchPerformance 
            processedEvents={processedEvents}
            handleSort={handleSort}
            sortConfig={sortConfig}
            hasFantasyData={hasFantasyData}
            leagueId={leagueId}
            activeSquadId={activeSquadId}
            isMobile={isMobile}
          />
        )
      )}
    </div>
  );
};

export default MatchPerformanceContainer;