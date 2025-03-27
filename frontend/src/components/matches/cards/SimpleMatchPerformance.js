import React, { useEffect, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import TeamBadge from '../../elements/TeamBadge';
import BoostInlineElement from '../../elements/BoostInlineElement';
import { usePlayerModal } from '../../../context/PlayerModalContext';
import { getPointsColorClass } from '../../../utils/matchUtils';

const SimpleMatchPerformance = ({ 
  processedEvents, 
  handleSort, 
  sortConfig, 
  hasFantasyData, 
  leagueId, 
  activeSquadId,
  isMobile
}) => {
  const { openPlayerModal } = usePlayerModal();
  const [localSortedEvents, setLocalSortedEvents] = useState([]);

  // Initially sort by total points
  useEffect(() => {
    const sortedData = [...processedEvents].sort((a, b) => {
      const pointsA = hasFantasyData && leagueId ? a.fantasy_points : a.total_points_all;
      const pointsB = hasFantasyData && leagueId ? b.fantasy_points : b.total_points_all;
      return pointsB - pointsA; // Descending order
    });
    setLocalSortedEvents(sortedData);
  }, [processedEvents, hasFantasyData, leagueId]);

  const SortableHeader = ({ label, sortKey }) => (
    <div
      onClick={() => {
        handleSort(sortKey);
        // Update local sorting state
        setLocalSortedEvents(prev => {
          const newDirection = 
            sortConfig.key === sortKey && sortConfig.direction === 'desc'
              ? 'asc'
              : 'desc';
              
          return [...prev].sort((a, b) => {
            let aValue = a[sortKey];
            let bValue = b[sortKey];
            
            if (typeof aValue === 'string') aValue = aValue.toLowerCase();
            if (typeof bValue === 'string') bValue = bValue.toLowerCase();
            
            if (newDirection === 'asc') {
              return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
              return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
          });
        });
      }}
      className="cursor-pointer group flex items-center text-left"
    >
      <span>{label}</span>
      <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
  
  // Format performance data into a readable string
  const formatPerformance = (data) => {
    let performance = [];
    
    // Add batting info if player batted
    if (data.bat_runs > 0) {
      performance.push(`${data.bat_runs}(${data.bat_balls})`);
    }
    
    // Add bowling info if player bowled
    if (data.bowl_balls > 0) {
      // const overs = `${Math.floor(data.bowl_balls / 6)}${data.bowl_balls % 6 ? '.' + (data.bowl_balls % 6) : ''}`;
      // performance.push(`${data.bowl_wickets}/${data.bowl_runs} (${overs})`);
      performance.push(`${data.bowl_wickets}/${data.bowl_runs}`);
    }
    
    // Add fielding info if player was involved in fielding
    const fielding = [];
    if (data.field_catch > 0 || data.wk_catch > 0) {
      fielding.push(`${(data.field_catch || 0) + (data.wk_catch || 0)}c`);
    }
    if (data.wk_stumping > 0) {
      fielding.push(`${data.wk_stumping}st`);
    }
    if (data.run_out_solo > 0 || data.run_out_collab > 0) {
      fielding.push(`${(data.run_out_solo || 0) + (data.run_out_collab || 0)}ro`);
    }
    
    if (fielding.length > 0) {
      performance.push(fielding.join('+'));
    }
    
    // Return a formatted string
    return performance.length > 0 ? performance.join(', ') : '-';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-20">
          <tr>
            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              <SortableHeader label="Team" sortKey="team_name" />
            </th>
            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex flex-col">
                <SortableHeader label="Player" sortKey="player_name" />
                <SortableHeader label="Squad" sortKey="squad_name" />
              </div>
            </th>
            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              <span>Performance</span>
            </th>
            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              {hasFantasyData && leagueId ? (
                <SortableHeader label="Points" sortKey="fantasy_points" />
              ) : (
                <SortableHeader label="Points" sortKey="total_points_all" />
              )}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {localSortedEvents.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                No player data available for this match
              </td>
            </tr>
          ) : (
            localSortedEvents.map((data, index) => {
              const isActiveSquadPlayer = activeSquadId && data.squad_id === activeSquadId;
              
              return (
                <tr 
                  key={`simple-row-${data.id || data.player_id || index}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                >
                  {/* Team column */}
                  <td className="px-2 py-3 whitespace-nowrap">
                    <div className="flex items-center text-xs">
                      {data.team_name && data.team_name}
                    </div>
                  </td>
                  
                  {/* Player column */}
                  <td className="px-2 py-3 whitespace-nowrap">
                    <div 
                      className="text-sm text-gray-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                      onClick={() => openPlayerModal(data.player_id, leagueId)}
                    >
                      {data.player_name} {data.player_of_match && '🏅'}
                    </div>
                    {data.squad_name && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <div 
                          className="h-3 w-1 mr-1 rounded-sm"
                          style={{ backgroundColor: data.squad_color }}
                        />
                        <span>{data.squad_name}</span>
                        
                        {data.boost_label && (
                          <span className="ml-1">
                            <BoostInlineElement
                              boostName={data.boost_label} 
                              color={data.squad_color} 
                              showLabel={false} 
                              size="S" 
                            />
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  {/* Performance column */}
                  <td className="px-2 py-3 text-sm text-sm text-gray-900 dark:text-white">
                    {formatPerformance(data)}
                  </td>
                  
                  {/* Points column */}
                  <td className="px-2 py-3 whitespace-nowrap text-sm font-medium">
                    {hasFantasyData && leagueId ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white text-base">
                          {data.fantasy_points}
                        </span>
                        <div className='flex items-center gap-1'>
                          <span className={`text-xs ${getPointsColorClass(data.base_points)}`}>
                            {data.base_points}
                          </span>
                          {data.boost_points > 0 && <span className='text-xs'> + {data.boost_points}</span>}
                        </div>
                      </div>
                    ) : (
                      <span className={`font-bold ${getPointsColorClass(data.total_points_all)}`}>
                        {data.total_points_all}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SimpleMatchPerformance;