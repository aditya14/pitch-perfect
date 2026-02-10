import React, { useEffect, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import BoostInlineElement from '../../elements/BoostInlineElement';
import { usePlayerModal } from '../../../context/PlayerModalContext';
import { getPointsColorClass } from '../../../utils/matchUtils';

const SimpleMatchPerformance = ({ 
  processedEvents, 
  handleSort, 
  sortConfig, 
  hasFantasyData, 
  leagueId, 
  activeSquadId
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
      <ArrowUpDown className="h-4 w-4 ml-1 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
  
  // Format performance data into a readable string
  const formatPerformance = (data) => {
    let batting = null;
    let bowling = null;
    let fielding = [];

    // Add batting info if player batted
    if (data.bat_runs > 0) {
      batting = `${data.bat_runs}${data.bat_not_out ? '*' : ''}(${data.bat_balls})`;
    }

    // Add bowling info if player bowled
    if (data.bowl_balls > 0) {
      // const overs = `${Math.floor(data.bowl_balls / 6)}${data.bowl_balls % 6 ? '.' + (data.bowl_balls % 6) : ''}`;
      // bowling = `${data.bowl_wickets}/${data.bowl_runs} (${overs})`;
      bowling = `${data.bowl_wickets}/${data.bowl_runs}`;
    }

    // Add fielding info if player was involved in fielding
    if (data.field_catch > 0 || data.wk_catch > 0) {
      fielding.push(`${(data.field_catch || 0) + (data.wk_catch || 0)}c`);
    }
    if (data.wk_stumping > 0) {
      fielding.push(`${data.wk_stumping}st`);
    }
    if (data.run_out_solo > 0 || data.run_out_collab > 0) {
      fielding.push(`${(data.run_out_solo || 0) + (data.run_out_collab || 0)}ro`);
    }

    // Compose second line if bowling or fielding present
    const secondLine = [bowling, fielding.length > 0 ? fielding.join('+') : null].filter(Boolean).join(', ');

    if (!batting && !secondLine) return '-';

    return (
      <>
        {batting && <span>{batting}</span>}
        {secondLine && (
          <>
            {batting && <br />}
            <span>{secondLine}</span>
          </>
        )}
      </>
    );
  };

  return (
    <div className="overflow-x-auto lg-glass-tertiary rounded-lg">
      <table className="min-w-full divide-y divide-neutral-200/70 dark:divide-neutral-800/70 mb-4">
        <thead className="lg-glass-tertiary sticky top-0 z-20">
          <tr>
            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
              <SortableHeader label="Team" sortKey="team_name" />
            </th>
            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
              <div className="flex flex-col">
                <SortableHeader label="Player" sortKey="player_name" />
                <SortableHeader label="Squad" sortKey="squad_name" />
              </div>
            </th>
            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
              <span>Performance</span>
            </th>
            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
              {hasFantasyData && leagueId ? (
                <SortableHeader label="Points" sortKey="fantasy_points" />
              ) : (
                <SortableHeader label="Points" sortKey="total_points_all" />
              )}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white/20 dark:bg-black/20 divide-y divide-neutral-200/70 dark:divide-neutral-900/70">
          {localSortedEvents.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-neutral-500 dark:text-neutral-400">
                No player data available for this match
              </td>
            </tr>
          ) : (
            localSortedEvents.map((data, index) => {
              const isActiveSquadPlayer = activeSquadId && data.squad_id === activeSquadId;
              
              return (
                <tr 
                  key={`simple-row-${data.id || data.player_id || index}`}
                  className="hover:bg-white/30 dark:hover:bg-white/5"
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
                      className="text-sm text-neutral-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                      onClick={() => openPlayerModal(data.player_id, leagueId)}
                    >
                      {data.player_name} {data.player_of_match && '🏅'}
                    </div>
                    {data.squad_name && (
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center">
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
                  <td className="px-2 py-3 text-sm text-neutral-900 dark:text-white">
                    {formatPerformance(data)}
                  </td>
                  
                  {/* Points column */}
                  <td className="px-2 py-3 whitespace-nowrap text-sm font-medium">
                    {hasFantasyData && leagueId ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-900 dark:text-white text-base font-number">
                          {data.fantasy_points}
                        </span>
                        <div className='flex items-center gap-1'>
                          <span className={`text-xs ${getPointsColorClass(data.base_points)}`}>
                            {data.base_points}
                          </span>
                          {data.boost_points !== 0 && <span className='text-xs'> {data.boost_points > 0 && '+'}{data.boost_points}</span>}
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
