// RosterList.js
import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import _ from 'lodash';
import MultiSelect from '../elements/MultiSelect';
import { usePlayerModal } from '../../context/PlayerModalContext';

const RosterList = ({ players, leagueId }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  const [filters, setFilters] = useState({
    iplTeam: [],
    role: [],
    fantasySquad: []
  });

  console.log('p', players);
  console.log('l', leagueId);
  const { openPlayerModal } = usePlayerModal();

  // Extract filter options
  const filterOptions = {
    iplTeams: _.uniq(players.map(p => p.team)).sort(),
    roles: _.uniq(players.map(p => p.role)).sort(),
    fantasySquads: _.uniq(players.map(p => p.fantasy_squad).filter(Boolean)).sort()
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const keyMap = {
      'avgPoints': 'avg_points'
    };
    setSortConfig({ key: keyMap[key] || key, direction });
  };

  const handleFilterChange = (filterType, values) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
  };

  const getSortedAndFilteredPlayers = () => {
    return players
      .filter(player => {
        return (
          (filters.iplTeam.length === 0 || filters.iplTeam.includes(player.team)) &&
          (filters.role.length === 0 || filters.role.includes(player.role)) &&
          (filters.fantasySquad.length === 0 || filters.fantasySquad.includes(player.fantasy_squad))
        );
      })
      .sort((a, b) => {
        if (sortConfig.key === 'avg_points') {
          const aPoints = parseFloat(a.avg_points) || -Infinity;
          const bPoints = parseFloat(b.avg_points) || -Infinity;
          return sortConfig.direction === 'asc' ? aPoints - bPoints : bPoints - aPoints;
        }
        
        const aVal = a[sortConfig.key] ?? -Infinity;
        const bVal = b[sortConfig.key] ?? -Infinity;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <MultiSelect
            options={filterOptions.iplTeams}
            value={filters.iplTeam}
            onChange={values => handleFilterChange('iplTeam', values)}
            placeholder="Select Teams"
          />
          <MultiSelect
            options={filterOptions.roles}
            value={filters.role}
            onChange={values => handleFilterChange('role', values)}
            placeholder="Select Roles"
          />
          <MultiSelect
            options={filterOptions.fantasySquads}
            value={filters.fantasySquad}
            onChange={values => handleFilterChange('fantasySquad', values)}
            placeholder="Select Squads"
          />
        </div>

        {/* Players Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('rank')}
                    className="flex items-center text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    Rank
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    IPL Team
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Role
                  </span>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('matches')}
                    className="flex items-center justify-end text-sm font-semibold text-gray-900 dark:text-white ml-auto"
                  >
                    Matches
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('avgPoints')}
                    className="flex items-center justify-end text-sm font-semibold text-gray-900 dark:text-white ml-auto"
                  >
                    2021-24 Avg
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {getSortedAndFilteredPlayers().map((player) => (
                <tr 
                  key={player.id}
                  className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {player.rank}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <button 
                      onClick={() => openPlayerModal(player.id, leagueId)}
                      className="text-blue-600 hover:underline"
                    >
                      {player.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {player.team}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {roleMap[player.role] || player.role}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">
                    {player.matches}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">
                    {player.avg_points?.toFixed(1) ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const roleMap = {
  'BAT': 'Batter',
  'BOWL': 'Bowler',
  'ALL': 'All-Rounder',
  'WK': 'Wicket Keeper'
};

export default RosterList;