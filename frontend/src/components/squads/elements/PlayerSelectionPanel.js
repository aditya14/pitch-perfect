import React, { useState, useMemo } from 'react';
import { Search, X, ChevronLeft, ArrowUpDown } from 'lucide-react';
import PlayerListItem from './PlayerListItem';

/**
 * Component for selecting players for a specific role
 */
const PlayerSelectionPanel = ({
  players,
  activeSlotId,
  getRoleById,
  handlePlayerAssign,
  handleClose,
  futureAssignments,
  isDeadlinePassed,
  squadColor
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterAssignedStatus, setFilterAssignedStatus] = useState('all');
  const [sortBy, setSortBy] = useState({ key: 'name', direction: 'asc' });

  // Get the active role
  const activeRole = getRoleById(activeSlotId);
  
  // Get all available teams for filtering
  const teams = useMemo(() => {
    return [...new Set(players.map(p => p.current_team?.name).filter(Boolean))].sort();
  }, [players]);

  // Check if a player is assigned to another role
  const isPlayerAssignedToOtherRole = (playerId) => {
    return Object.entries(futureAssignments).some(
      ([roleId, pId]) => pId === playerId && parseInt(roleId) !== activeSlotId
    );
  };

  // Get the role name a player is assigned to
  const getAssignedRoleName = (playerId) => {
    const roleId = Object.entries(futureAssignments).find(
      ([roleId, pId]) => pId === playerId && parseInt(roleId) !== activeSlotId
    )?.[0];
    
    return roleId ? getRoleById(parseInt(roleId))?.name : null;
  };

  // Filter players based on search, role eligibility, team, and assignment status
  const filteredPlayers = useMemo(() => {
    return players
      .filter(player => {
        // Filter 1: Role eligibility
        const isEligible = activeRole?.allowed_player_types.includes(player.role);
        if (!isEligible) return false;

        // Filter 2: Search term
        const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        // Filter 3: Team filter
        const matchesTeam = filterTeam === 'all' || player.current_team?.name === filterTeam;
        if (!matchesTeam) return false;

        // Filter 4: Assignment status
        const isAssigned = isPlayerAssignedToOtherRole(player.id);
        const matchesAssigned = 
          filterAssignedStatus === 'all' || 
          (filterAssignedStatus === 'assigned' && isAssigned) ||
          (filterAssignedStatus === 'unassigned' && !isAssigned);
        
        return matchesAssigned;
      });
  }, [players, activeRole, searchTerm, filterTeam, filterAssignedStatus, futureAssignments, activeSlotId]);

  // Sort filtered players
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy.key) {
        case 'avgPoints':
          aValue = a.avg_points || 0;
          bValue = b.avg_points || 0;
          break;
        case 'lastPoints':
          aValue = a.last_match_points || 0;
          bValue = b.last_match_points || 0;
          break;
        case 'name':
        default:
          aValue = a.name;
          bValue = b.name;
          break;
      }
      
      if (sortBy.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredPlayers, sortBy]);

  // Function to toggle sort direction
  const toggleSort = (key) => {
    if (sortBy.key === key) {
      setSortBy({
        key,
        direction: sortBy.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortBy({
        key,
        direction: 'asc'
      });
    }
  };

  // If no active role, don't render anything
  if (!activeRole) return null;

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700">
      <div className="p-4 bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center mb-4">
          <button 
            onClick={handleClose}
            className="mr-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
            Assign Player for {activeRole.name}
          </h3>
        </div>

        {/* Search input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search players..."
            className="block w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-500 dark:text-neutral-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-600 text-neutral-700 dark:text-white text-sm p-2"
          >
            <option value="all">All Teams</option>
            {teams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>

          <select
            value={filterAssignedStatus}
            onChange={(e) => setFilterAssignedStatus(e.target.value)}
            className="rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-600 text-neutral-700 dark:text-white text-sm p-2"
          >
            <option value="all">All Players</option>
            <option value="assigned">Already Assigned</option>
            <option value="unassigned">Not Assigned</option>
          </select>
        </div>
        
        {/* Sort controls */}
        <div className="mt-3 flex border-t pt-3 border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => toggleSort('name')}
            className={`flex items-center mr-4 text-sm font-medium ${
              sortBy.key === 'name' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            Name
            {sortBy.key === 'name' && (
              <ArrowUpDown size={14} className="ml-1" />
            )}
          </button>
          <button
            onClick={() => toggleSort('avgPoints')}
            className={`flex items-center mr-4 text-sm font-medium ${
              sortBy.key === 'avgPoints' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            Avg Points
            {sortBy.key === 'avgPoints' && (
              <ArrowUpDown size={14} className="ml-1" />
            )}
          </button>
          <button
            onClick={() => toggleSort('lastPoints')}
            className={`flex items-center text-sm font-medium ${
              sortBy.key === 'lastPoints' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            Last Match
            {sortBy.key === 'lastPoints' && (
              <ArrowUpDown size={14} className="ml-1" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {filteredPlayers.length} eligible players found
        </div>
      </div>

      {/* Player list with virtualization for large lists */}
      <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2">
        {sortedPlayers.length > 0 ? (
          sortedPlayers.map(player => {
            const isAssignedToOtherRole = isPlayerAssignedToOtherRole(player.id);
            const assignedRoleName = isAssignedToOtherRole ? getAssignedRoleName(player.id) : null;
            
            return (
              <PlayerListItem
                key={player.id}
                player={player}
                onClick={handlePlayerAssign}
                isAssignedToOtherRole={isAssignedToOtherRole}
                assignedRoleName={assignedRoleName}
                isEligible={!isDeadlinePassed}
                squadColor={squadColor}
              />
            );
          })
        ) : (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            No players match your filters
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSelectionPanel;