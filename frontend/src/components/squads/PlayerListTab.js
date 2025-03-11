import React, { useState } from 'react';
import { usePlayerModal } from '../../context/PlayerModalContext';
import { getTextColorForBackground } from '../../utils/colorUtils';
import { ArrowRightCircle } from 'lucide-react';

const PlayerListTab = ({ players, playerEvents, currentCoreSquad, boostRoles, leagueId, squadColor }) => {
  console.log('PlayerListTab:', players, playerEvents, currentCoreSquad, boostRoles, leagueId, squadColor);
  const [sortConfig, setSortConfig] = useState({
    key: 'total_points',  // Default to sorting by total points
    direction: 'desc'
  });
  const [showTraded, setShowTraded] = useState(true); // Default to showing traded players
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
    const assignment = currentCoreSquad?.find(role => role.player_id === playerId);
    if (!assignment) return null;
    
    const boostRole = boostRoles.find(role => role.id === assignment.boost_id);
    return boostRole?.name || null;
  };

  // Filter players based on the showTraded toggle
  const filteredPlayers = players.filter(player => {
    if (showTraded) {
      return true; // Show all players
    } else {
      return player.status === 'current'; // Only show current players
    }
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
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

  return (
    <div>
      {/* Toggle switch for showing/hiding traded players */}
      {tradedCount > 0 && (
        <div className="mb-4 flex justify-end items-center">
          <span className="mr-2 text-sm text-gray-600 dark:text-gray-300">
            {showTraded ? 'Showing' : 'Hiding'} Traded Players ({tradedCount})
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={showTraded}
              onChange={() => setShowTraded(!showTraded)}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      )}
      
      {/* Sort controls for mobile - MOVED TO TOP, BEFORE the mobile card list */}
      <div className="md:hidden mb-4">
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Sort Players By:</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => requestSort('name')}
            className={`px-3 py-1 text-xs rounded-full ${
              sortConfig.key === 'name' 
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            onClick={() => requestSort('total_points')}
            className={`px-3 py-1 text-xs rounded-full ${
              sortConfig.key === 'total_points' 
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Points {sortConfig.key === 'total_points' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            onClick={() => requestSort('matches')}
            className={`px-3 py-1 text-xs rounded-full ${
              sortConfig.key === 'matches' 
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Matches {sortConfig.key === 'matches' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            onClick={() => requestSort('role')}
            className={`px-3 py-1 text-xs rounded-full ${
              sortConfig.key === 'role' 
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Role {sortConfig.key === 'role' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Mobile view - card-based layout */}
        <div className="md:hidden">
          {sortedPlayers.map(player => {
            const stats = getPlayerStats(player.id);
            const coreRole = getCurrentBoostRole(player.id);
            const isTraded = player.status === 'traded';
            
            return (
              <div 
                key={player.id} 
                className={`border-b dark:border-gray-700 p-4 ${isTraded ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
              >
                {/* Player header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {isTraded && (
                      <ArrowRightCircle 
                        size={16} 
                        className="mr-1 text-orange-500 dark:text-orange-400 flex-shrink-0" 
                      />
                    )}
                    <span 
                      className={`text-sm font-medium ${isTraded ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'} cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400`}
                      onClick={() => openPlayerModal(player.id, leagueId)}
                    >
                      {player.name}
                    </span>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${player.role === 'BAT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        player.role === 'BOWL' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        player.role === 'ALL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}
                    >
                      {player.role}
                    </span>
                    {coreRole && !isTraded && (
                      <span 
                        className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                        style={{backgroundColor: squadColor, color: getTextColorForBackground(squadColor)}}
                      >
                        {coreRole}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Mobile card - team short name */}
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Team: {player.current_team?.short_name || '-'}
                </div>
                
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Matches</div>
                    <div className="font-medium">{stats.matches}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Base Points</div>
                    <div className="font-medium">{Number.isInteger(stats.basePoints) ? stats.basePoints : stats.basePoints.toFixed(1)}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Boost Points</div>
                    <div className="font-medium">{Number.isInteger(stats.boostPoints) ? stats.boostPoints : stats.boostPoints.toFixed(1)}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Points</div>
                    <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {Number.isInteger(stats.totalPoints) ? stats.totalPoints : stats.totalPoints.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {sortedPlayers.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No players found
            </div>
          )}
        </div>
        
        {/* Desktop view - table layout */}
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 hidden md:table">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              {/* Player Info Group */}
              <th scope="col" colSpan="3" className="px-6 py-3 border-b dark:border-gray-700 text-center border-r dark:border-gray-600">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Player Information
                </div>
                <div className="grid grid-cols-3 gap-4 mt-2 border-t dark:border-gray-600 pt-2">
                  <div 
                    className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('name')}
                  >
                    Name {getSortDirection('name')}
                  </div>
                  <div 
                    className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('team')}
                  >
                    Team {getSortDirection('team')}
                  </div>
                  <div 
                    className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('role')}
                  >
                    Role {getSortDirection('role')}
                  </div>
                </div>
              </th>
              
              {/* Matches Column */}
              <th scope="col" className="px-6 py-3 border-b dark:border-gray-700 text-center border-r dark:border-gray-600">
                <div 
                  className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('matches')}
                >
                  Matches {getSortDirection('matches')}
                </div>
              </th>
              
              {/* Points Columns Group */}
              <th scope="col" colSpan="3" className="px-6 py-3 border-b dark:border-gray-700 text-center">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Points Breakdown
                </div>
                <div className="grid grid-cols-3 gap-4 mt-2 border-t dark:border-gray-600 pt-2">
                  <div 
                    className="text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('base_points')}
                  >
                    Base {getSortDirection('base_points')}
                  </div>
                  <div 
                    className="text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('boost_points')}
                  >
                    Boost {getSortDirection('boost_points')}
                  </div>
                  <div 
                    className="text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer font-bold"
                    onClick={() => requestSort('total_points')}
                  >
                    Total {getSortDirection('total_points')}
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedPlayers.map(player => {
              const stats = getPlayerStats(player.id);
              const coreRole = getCurrentBoostRole(player.id);
              const isTraded = player.status === 'traded';
              
              return (
                <tr 
                  key={player.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isTraded ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
                >
                  {/* Player Info (Name, Team, Role) in a group */}
                  <td colSpan="3" className="px-6 py-4 border-r dark:border-gray-700">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Name */}
                      <div className="flex items-center">
                        {isTraded && (
                          <ArrowRightCircle 
                            size={16} 
                            className="mr-1 text-orange-500 dark:text-orange-400 flex-shrink-0" 
                          />
                        )}
                        <span 
                          className={`text-sm font-medium truncate ${isTraded ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'} cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400`}
                          onClick={() => openPlayerModal(player.id, leagueId)}
                        >
                          {player.name}
                        </span>
                      </div>
                      
                      {/* Team - use short_name */}
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {player.current_team?.short_name || '-'}
                      </div>
                      
                      {/* Role */}
                      <div className="flex items-center">
                        <div className="min-w-[50px]">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${player.role === 'BAT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              player.role === 'BOWL' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              player.role === 'ALL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}
                          >
                            {player.role}
                          </span>
                        </div>
                        {coreRole && !isTraded && (
                          <div className="ml-2">
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                              style={{backgroundColor: squadColor, color: getTextColorForBackground(squadColor)}}
                            >
                              {coreRole}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Matches */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600 dark:text-gray-300 border-r dark:border-gray-700">
                    {stats.matches}
                  </td>
                  
                  {/* Points Breakdown */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600 dark:text-gray-300">
                    {Number.isInteger(stats.basePoints) ? stats.basePoints : stats.basePoints.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600 dark:text-gray-300">
                    {Number.isInteger(stats.boostPoints) ? stats.boostPoints : stats.boostPoints.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-sm font-semibold ${isTraded ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {Number.isInteger(stats.totalPoints) ? stats.totalPoints : stats.totalPoints.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sortedPlayers.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No players found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerListTab;