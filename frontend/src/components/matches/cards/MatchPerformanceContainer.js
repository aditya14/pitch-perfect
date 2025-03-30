import React, { useState, useMemo, useEffect } from 'react';
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
  // Set initial view mode based on device - desktop: detailed, mobile: simple
  const [viewMode, setViewMode] = useState(isMobile ? 'simple' : 'detailed');
  
  // Update viewMode if isMobile changes (e.g. on window resize)
  useEffect(() => {
    setViewMode(isMobile ? 'simple' : 'detailed');
  }, [isMobile]);

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
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg p-4">
        <div className="text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Player Points
        </h2>
        <button
          onClick={toggleViewMode}
          className="p-1 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          title={viewMode === 'simple' ? 'Show detailed view' : 'Show simple view'}
        >
          {viewMode === 'simple' ? (
            <Maximize2 className="h-5 w-5" />
          ) : (
            <Minimize2 className="h-5 w-5" />
          )}
        </button>
      </div>

      {viewMode === 'simple' ? (
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
      )}
    </div>
  );
};

export default MatchPerformanceContainer;