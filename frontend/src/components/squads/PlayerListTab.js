import React, { useState, useMemo } from 'react';
import { usePlayerModal } from '../../context/PlayerModalContext';
import { ArrowRightCircle, Bandage } from 'lucide-react';
import BoostInlineElement from '../elements/BoostInlineElement';

const PlayerListTab = ({
  players,
  playerEvents,
  currentCoreSquad,
  activePhaseAssignments = [],
  hasActivePhase = false,
  boostRoles,
  leagueId,
  squadColor
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'total_points',  // Default to sorting by total points
    direction: 'desc'
  });
  const [showTraded, setShowTraded] = useState(true); 
  const [filterType, setFilterType] = useState('All');
  const { openPlayerModal } = usePlayerModal();

  const getPlayerStats = (playerId) => {
    const events = playerEvents[playerId] || {
      matches_played: 0,
      base_points: 0,
      boost_points: 0
    };
    
    return {
      matches: events.matches_played,
      basePoints: events.base_points,
      boostPoints: events.boost_points,
      totalPoints: events.base_points + events.boost_points
    };
  };

  const getCurrentBoostRole = (playerId) => {
    const assignmentSource = hasActivePhase ? activePhaseAssignments : currentCoreSquad;
    const assignment = assignmentSource?.find(role => role.player_id === playerId);
    if (!assignment) return null;
    
    const boostRole = boostRoles.find(role => role.id === assignment.boost_id);
    return boostRole?.name || null;
  };

  // Get unique IPL teams from the players list
  const iplTeams = useMemo(() => {
    const teamSet = new Set();
    players.forEach(player => {
      if (player.current_team?.name) {
        teamSet.add(player.current_team.name);
      }
    });
    return Array.from(teamSet).sort();
  }, [players]);

  // Get unique player roles from the players list
  const playerRoles = useMemo(() => {
    const roleSet = new Set();
    players.forEach(player => {
      if (player.role) {
        roleSet.add(player.role);
      }
    });
    return Array.from(roleSet).sort();
  }, [players]);

  // Filter players based on selected filter and traded status
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Filter by trade status
      if (!showTraded && player.status === 'traded') {
        return false;
      }
      
      // Apply filter based on selected type
      if (filterType === 'All') {
        return true;
      } else if (iplTeams.includes(filterType)) {
        return player.current_team?.name === filterType;
      } else if (playerRoles.includes(filterType)) {
        return player.role === filterType;
      }
      
      return true;
    });
  }, [players, showTraded, filterType, iplTeams, playerRoles]);

  // Sort the filtered players
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      // Only sort by status if we're not sorting by another column
      if (a.status !== b.status && sortConfig.key === 'status') {
        return a.status === 'current' ? -1 : 1;
      }

      let aValue, bValue;

      switch (sortConfig.key) {
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'team':
          aValue = a.current_team?.name || '';
          bValue = b.current_team?.name || '';
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'matches':
          aValue = getPlayerStats(a.id).matches;
          bValue = getPlayerStats(b.id).matches;
          break;
        case 'base_points':
          aValue = getPlayerStats(a.id).basePoints;
          bValue = getPlayerStats(b.id).basePoints;
          break;
        case 'boost_points':
          aValue = getPlayerStats(a.id).boostPoints;
          bValue = getPlayerStats(b.id).boostPoints;
          break;
        case 'total_points':
          aValue = getPlayerStats(a.id).totalPoints;
          bValue = getPlayerStats(b.id).totalPoints;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }, [filteredPlayers, sortConfig]);

  // Group players by the selected filter
  const groupedPlayers = useMemo(() => {
    if (filterType === 'All') {
      return { 'All Players': sortedPlayers };
    } else if (iplTeams.includes(filterType)) {
      return { [filterType]: sortedPlayers };
    } else if (playerRoles.includes(filterType)) {
      return { [filterType]: sortedPlayers };
    } else {
      // Group by team or role based on filter selection
      const groups = {};
      sortedPlayers.forEach(player => {
        let groupKey;
        
        if (filterType === 'By Team') {
          groupKey = player.current_team?.name || 'Unknown Team';
        } else if (filterType === 'By Role') {
          groupKey = player.role || 'Unknown Role';
        } else {
          groupKey = 'All Players';
        }
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(player);
      });
      
      // Sort the group keys
      return Object.keys(groups).sort().reduce((obj, key) => {
        obj[key] = groups[key];
        return obj;
      }, {});
    }
  }, [sortedPlayers, filterType, iplTeams, playerRoles]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortDirection = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    }
    return '';
  };

  // Count traded players for the toggle button label
  const tradedCount = players.filter(player => player.status === 'traded').length;

  // Get appropriate icon for player role
  const getRoleIcon = (role) => {
    switch (role) {
      case 'BAT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'BOWL':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ALL':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'WK':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Determine if columns should be hidden based on filter type
  const showTeamColumn = filterType !== 'By Team';
  const showRoleColumn = filterType !== 'By Role';

  return (
    <div className="relative">
      <div className="mb-3">
        {/* Filter controls */}
        <div className="flex flex-wrap items-center mb-3 gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterType('All')}
              className={`px-2 py-1 text-xs rounded-md ${
                filterType === 'All' 
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 font-medium' 
                  : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('By Team')}
              className={`px-2 py-1 text-xs rounded-md ${
                filterType === 'By Team' 
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 font-medium' 
                  : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200'
              }`}
            >
              By Team
            </button>
            <button
              onClick={() => setFilterType('By Role')}
              className={`px-2 py-1 text-xs rounded-md ${
                filterType === 'By Role' 
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 font-medium' 
                  : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200'
              }`}
            >
              By Role
            </button>
          </div>
          
          {/* Toggle for traded players */}
          {tradedCount > 0 && (
            <div className="ml-auto flex items-center">
              <span className="mr-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                {showTraded ? 'Show' : 'Hide'} Inactive ({tradedCount})
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showTraded}
                  onChange={() => setShowTraded(!showTraded)}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-neutral-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-neutral-700 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white dark:bg-neutral-950 shadow rounded-lg overflow-hidden">
        {/* Table layout for all screen sizes */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs sm:text-sm">
            {/* Fixed header - with column group headers */}
            <thead className="bg-neutral-50 dark:bg-neutral-900 sticky top-0 z-10">
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                {/* Group Headers */}
                <th scope="col" className="px-2 py-1.5 text-center text-2xs sm:text-xs font-medium text-neutral-600 dark:text-neutral-300 uppercase tracking-wider bg-neutral-100 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800">
                  Player
                </th>
                
                <th scope="col" colSpan="3" className="px-2 py-1.5 text-center text-2xs sm:text-xs font-medium text-neutral-600 dark:text-neutral-300 uppercase tracking-wider bg-neutral-100 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800">
                  Points
                </th>
                
                <th scope="col" colSpan={showTeamColumn && showRoleColumn ? 3 : showTeamColumn || showRoleColumn ? 2 : 1} className="px-2 py-1.5 text-center text-2xs sm:text-xs font-medium text-neutral-600 dark:text-neutral-300 uppercase tracking-wider bg-neutral-100 dark:bg-neutral-950">
                  Details
                </th>
              </tr>
              
              <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                {/* Player name column */}
                <th 
                  scope="col" 
                  className="px-2 py-1 text-left text-2xs sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-wider cursor-pointer whitespace-nowrap border-r border-neutral-200 dark:border-neutral-800"
                  onClick={() => requestSort('name')}
                >
                  <div className="flex items-center space-x-0.5">
                    <span>Name</span>
                    <span>{getSortDirection('name')}</span>
                  </div>
                </th>
                
                {/* Points columns - grouped together */}
                <th 
                  scope="col" 
                  className="px-1.5 py-1 text-right text-2xs sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-wider cursor-pointer whitespace-nowrap bg-neutral-50/50 dark:bg-neutral-900"
                  onClick={() => requestSort('total_points')}
                >
                  <div className="flex items-center justify-end space-x-0.5">
                    <span className="font-semibold">Total</span>
                    <span>{getSortDirection('total_points')}</span>
                  </div>
                </th>
                
                <th 
                  scope="col" 
                  className="px-1.5 py-1 text-right text-2xs sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-wider cursor-pointer whitespace-nowrap bg-neutral-50/50 dark:bg-neutral-900"
                  onClick={() => requestSort('base_points')}
                >
                  <div className="flex items-center justify-end space-x-0.5">
                    <span>Base</span>
                    <span>{getSortDirection('base_points')}</span>
                  </div>
                </th>
                
                <th 
                  scope="col" 
                  className="px-1.5 py-1 text-right text-2xs sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-wider cursor-pointer whitespace-nowrap border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900"
                  onClick={() => requestSort('boost_points')}
                >
                  <div className="flex items-center justify-end space-x-0.5">
                    <span>Boost</span>
                    <span>{getSortDirection('boost_points')}</span>
                  </div>
                </th>
                
                {/* Matches */}
                <th 
                  scope="col" 
                  className="px-1.5 py-1 text-center text-2xs sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-wider cursor-pointer whitespace-nowrap"
                  onClick={() => requestSort('matches')}
                >
                  <div className="flex items-center justify-center space-x-0.5">
                    <span>M</span>
                    <span>{getSortDirection('matches')}</span>
                  </div>
                </th>
                
                {/* Team (conditionally shown) */}
                {showTeamColumn && (
                  <th 
                    scope="col" 
                    className="px-1.5 py-1 text-center text-2xs sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-wider cursor-pointer whitespace-nowrap"
                    onClick={() => requestSort('team')}
                  >
                    <div className="flex items-center justify-center space-x-0.5">
                      <span>Team</span>
                      <span>{getSortDirection('team')}</span>
                    </div>
                  </th>
                )}
                
                {/* Role (conditionally shown) */}
                {showRoleColumn && (
                  <th 
                    scope="col" 
                    className="px-1.5 py-1 text-center text-2xs sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-wider cursor-pointer whitespace-nowrap"
                    onClick={() => requestSort('role')}
                  >
                    <div className="flex items-center justify-center space-x-0.5">
                      <span>Role</span>
                      <span>{getSortDirection('role')}</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            
            {/* Table body with grouped players */}
            <tbody className="bg-white dark:bg-neutral-950 divide-y divide-neutral-200 dark:divide-neutral-800">
              {Object.entries(groupedPlayers).map(([groupName, groupPlayers]) => (
                <React.Fragment key={groupName}>
                  {/* Group header row when grouping is applied */}
                  {(filterType === 'By Team' || filterType === 'By Role') && (
                    <tr className="bg-neutral-100 dark:bg-neutral-900">
                      <td 
                        colSpan={showTeamColumn && showRoleColumn ? 7 : showTeamColumn || showRoleColumn ? 6 : 5} 
                        className="px-2 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
                      >
                        {groupName}
                      </td>
                    </tr>
                  )}
                  
                  {/* Player rows */}
                  {groupPlayers.map((player, idx) => {
                    const stats = getPlayerStats(player.id);
                    const coreRole = getCurrentBoostRole(player.id);
                    const isTraded = player.status === 'traded';
                    const isEven = idx % 2 === 0;
                    const injuryTooltip = player.replacement?.name
                      ? `Ruled out. Replacement: ${player.replacement.name}`
                      : 'Ruled out';
                    
                    return (
                      <tr 
                        key={player.id} 
                        className={`hover:bg-neutral-50 dark:hover:bg-neutral-900 ${isTraded ? 'bg-neutral-50/70 dark:bg-neutral-900/70' : isEven ? 'bg-white dark:bg-neutral-950' : 'bg-neutral-50/30 dark:bg-neutral-950/80'}`}
                      >
                        {/* Name with boost icon */}
                        <td className="px-2 py-1 whitespace-nowrap border-r border-neutral-200 dark:border-neutral-800">
                          <div className="flex items-center">
                            {isTraded && (
                              <ArrowRightCircle 
                                size={10} 
                                className="mr-0.5 text-orange-500 dark:text-orange-400 flex-shrink-0" 
                              />
                            )}
                            <span 
                              className={`text-2xs sm:text-xs font-light ${isTraded ? 'text-neutral-600 dark:text-neutral-500' : 'text-neutral-900 dark:text-neutral-200'} cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 truncate max-w-[100px] sm:max-w-[200px] md:max-w-none`}
                              onClick={() => openPlayerModal(player.id, leagueId)}
                            >
                              {player.name}
                            </span>
                            {player.ruled_out && (
                              <Bandage
                                size={12}
                                className="ml-1 text-rose-500 dark:text-rose-400 flex-shrink-0"
                                title={injuryTooltip}
                                aria-label={injuryTooltip}
                              />
                            )}
                            {coreRole && !isTraded && (
                              <BoostInlineElement
                                boostName={coreRole} 
                                color={squadColor} 
                                showLabel={false} 
                                size="XS" 
                              />
                            )}
                          </div>
                        </td>
                        
                        {/* Points group - no different background in dark mode */}
                        <td className="px-1.5 py-1 text-right whitespace-nowrap bg-neutral-50/50 dark:bg-transparent">
                          <span className={`text-2xs sm:text-xs font-semibold ${isTraded ? 'text-neutral-600 dark:text-neutral-500' : 'text-neutral-900 dark:text-neutral-200'}`}>
                            {Number.isInteger(stats.totalPoints) ? stats.totalPoints : stats.totalPoints.toFixed(1)}
                          </span>
                        </td>
                        
                        <td className="px-1.5 py-1 text-right whitespace-nowrap text-2xs sm:text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-transparent">
                          {Number.isInteger(stats.basePoints) ? stats.basePoints : stats.basePoints.toFixed(1)}
                        </td>
                        
                        <td className="px-1.5 py-1 text-right whitespace-nowrap text-2xs sm:text-xs text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-transparent">
                          {Number.isInteger(stats.boostPoints) ? stats.boostPoints : stats.boostPoints.toFixed(1)}
                        </td>
                        
                        {/* Matches */}
                        <td className="px-1.5 py-1 text-center whitespace-nowrap text-2xs sm:text-xs text-neutral-600 dark:text-neutral-400">
                          {stats.matches}
                        </td>
                        
                        {/* Team (conditionally shown) */}
                        {showTeamColumn && (
                          <td className="px-1.5 py-1 text-center whitespace-nowrap text-2xs sm:text-xs text-neutral-500 dark:text-neutral-500">
                            {player.current_team?.short_name || '-'}
                          </td>
                        )}
                        
                        {/* Role (conditionally shown) */}
                        {showRoleColumn && (
                          <td className="px-1.5 py-1 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-1 py-0.5 rounded text-2xs sm:text-xs font-medium ${getRoleIcon(player.role)}`}>
                              {player.role}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  
                  {groupPlayers.length === 0 && (
                    <tr>
                      <td 
                        colSpan={showTeamColumn && showRoleColumn ? 7 : showTeamColumn || showRoleColumn ? 6 : 5} 
                        className="px-2 py-1.5 text-center text-2xs sm:text-xs text-neutral-500 dark:text-neutral-500"
                      >
                        No players found in this group
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlayerListTab;
