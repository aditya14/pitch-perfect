import React, { useMemo } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { getEventData } from '../../../utils/matchUtils';

const SquadPerformance = ({ playerEvents, loading, error, activeSquadId }) => {
  // Calculate squad totals from player events
  const squadTotals = useMemo(() => {
    if (!playerEvents || playerEvents.length === 0) return [];
    
    // Map to keep track of squad totals
    const squadMap = new Map();
    
    // Process each player event
    playerEvents.forEach(event => {
      // Check if the event has squad information
      if (event.squad_name) {
        // Use squad_name as the key since squad_id might not be available
        const squadKey = event.squad_name;
        const points = event.total_points || 
                      (event.base_stats && event.base_stats.total_points_all) || 0;
        
        if (squadMap.has(squadKey)) {
          // Update existing squad information
          const squad = squadMap.get(squadKey);
          squadMap.set(squadKey, {
            ...squad,
            points: squad.points + points
          });
        } else {
          // Add new squad information
          squadMap.set(squadKey, {
            name: event.squad_name,
            points: points,
            color: event.squad_color || '#888888'
          });
        }
      }
    });
    
    // Convert map to array and sort by points (highest to lowest)
    const sortedSquads = Array.from(squadMap.values())
      .sort((a, b) => b.points - a.points)
      .map((squad, index) => ({
        ...squad,
        rank: index + 1,
        id: index // Use index as id since we don't have squad_id
      }));
    
    return sortedSquads;
  }, [playerEvents]);

  // Get rank background color
  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 dark:bg-yellow-900";
      case 2:
        return "bg-gray-50 dark:bg-gray-500";
      default:
        return "bg-white dark:bg-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-4 h-full">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-4 h-full">
        <div className="text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  // If there are no squads to display (not a fantasy match)
  if (squadTotals.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 overflow-hidden h-full">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Squad Points
          </h2>
        </div>
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          No squad data available for this match
        </div>
      </div>
    );
  }

  // Determine layout based on number of squads
  const useGridLayout = squadTotals.length >= 4;
  
  return (
    <div className="bg-white dark:bg-gray-900 overflow-hidden h-full">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Squad Points
        </h2>
      </div>
      
      <div className="p-1">
        <div className={`grid ${useGridLayout ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-3`}>
          {squadTotals.map((squad) => (
            <div 
              key={`squad-${squad.id}`}
              className='transition-all'
            >
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className='flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-bold'>
                      {squad.rank}
                    </div>
                    
                    <div className="flex items-center">
                      <div 
                        className="h-5 w-1 mr-2 rounded-md"
                        style={{ backgroundColor: squad.color }}
                      />
                      <span className="text-base font-medium text-gray-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
                        {squad.name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {squad.points.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SquadPerformance;