import React, { useState } from 'react';

const PlayerListTab = ({ players, playerEvents, currentCoreSquad, boostRoles }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'total_points',
    direction: 'desc'
  });

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

  const sortedPlayers = [...players].sort((a, b) => {
    let aValue, bValue;

    switch (sortConfig.key) {
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
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortDirection = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    }
    return '';
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr>
            <th scope="col" className="px-6 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              {/* Player Column */}
              <div 
                className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('name')}
              >
                Player {getSortDirection('name')}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              {/* Team Column */}
              <div 
                className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('team')}
              >
                IPL Team {getSortDirection('team')}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              {/* Role Column */}
              <div 
                className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('role')}
              >
                Role {getSortDirection('role')}
              </div>
            </th>
            {/* Points Columns Group */}
            <th scope="col" colSpan="3" className="px-6 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Points Breakdown
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div 
                  className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('base_points')}
                >
                  Base {getSortDirection('base_points')}
                </div>
                <div 
                  className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('boost_points')}
                >
                  Boost {getSortDirection('boost_points')}
                </div>
                <div 
                  className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
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
            
            return (
              <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {player.name}
                    </div>
                    {coreRole && (
                      <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" style={{width:'fit-content'}}>
                        {coreRole}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {player.current_team?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${player.role === 'BAT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      player.role === 'BOWL' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      player.role === 'ALL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}
                  >
                    {player.role}
                  </span>
                </td>
                {/* Points Breakdown */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    {stats.basePoints.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    {stats.boostPoints.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {stats.totalPoints.toFixed(1)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerListTab