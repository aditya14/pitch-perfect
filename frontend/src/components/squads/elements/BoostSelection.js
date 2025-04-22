import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User } from 'lucide-react';
import { usePlayerModal } from '../../../context/PlayerModalContext';
import { Anchor, Bomb, Crown, EarthLock, Handshake, Sparkles, Swords, Zap, ArrowLeft } from 'lucide-react';

// Helper function to get role icon
const getRoleIcon = (roleName, size = 16, squadColor) => {
    switch(roleName) {
      case 'Captain':
        return <Crown size={size} style={{color: squadColor}} />;
      case 'Vice-Captain':
        return <Swords size={size} style={{color: squadColor}} />;
      case 'Slogger':
        return <Zap size={size} style={{color: squadColor}} />;
      case 'Accumulator':
        return <Anchor size={size} style={{color: squadColor}} />;
      case 'Safe Hands':
        return <Handshake size={size} style={{color: squadColor}} />;
      case 'Rattler':
        return <Bomb size={size} style={{color: squadColor}} />;
      case 'Constrictor':
        return <EarthLock size={size} style={{color: squadColor}} />;
      default: // Virtuoso
        return <Sparkles size={size} style={{color: squadColor}} />;
    }
  };
  
  // Countdown Timer Component
  const CountdownTimer = ({ onExpire }) => {
    const [timeLeft, setTimeLeft] = useState({});
    const lockDate = new Date('2025-04-26T14:00:00Z'); // April 26, 2025, 2pm UTC
  
    useEffect(() => {
      const calculateTimeLeft = () => {
        const difference = lockDate - new Date();
        
        if (difference <= 0) {
          if (onExpire) onExpire();
          return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            expired: true
          };
        }
  
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          expired: false
        };
      };
  
      setTimeLeft(calculateTimeLeft());
      
      const timer = setInterval(() => {
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);
      }, 1000);
  
      return () => clearInterval(timer);
    }, [onExpire]);
  
    if (timeLeft.expired) {
      return (
        <div className="rounded-lg bg-red-100 dark:bg-red-900 px-4 py-2 text-center w-full">
          <div className="text-sm font-bold text-red-700 dark:text-red-300">Lineup Locked</div>
        </div>
      );
    }
  
    return (
      <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900 px-4 py-3 w-full">
        <div className="text-xs text-neutral-600 dark:text-neutral-300 mb-1">Boost Picks Lock For The Week In:</div>
        <div className="flex space-x-2 text-center justify-center md:justify-start">
          <div className="bg-white dark:bg-neutral-800 rounded px-2 py-1 w-14">
            <div className="text-lg font-bold text-neutral-600 dark:text-neutral-400">{timeLeft.days}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">days</div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded px-2 py-1 w-14">
            <div className="text-lg font-bold text-neutral-600 dark:text-neutral-400">{timeLeft.hours}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">hrs</div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded px-2 py-1 w-14">
            <div className="text-lg font-bold text-neutral-600 dark:text-neutral-400">{timeLeft.minutes}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">min</div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded px-2 py-1 w-14">
            <div className="text-lg font-bold text-neutral-600 dark:text-neutral-400">{timeLeft.seconds}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">sec</div>
          </div>
        </div>
      </div>
    );
  };

const BoostSelection = ({
  players,
  boostRoles,
  futureCoreSquad,
  selectedPlayer,
  setSelectedPlayer,
  handleRoleAssignment,
  isDeadlinePassed,
  getPlayerById,
  getRoleById,
  canAssignPlayerToRole,
  isPlayerAssigned,
  getPlayerRole,
  error,
  squadColor
}) => {
  const { openPlayerModal } = usePlayerModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterAssigned, setFilterAssigned] = useState('all');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  const playerListRef = useRef(null);
  
  // Check if we're in mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Get all teams for filtering
  const teams = [...new Set(players.map(p => p.current_team?.name).filter(Boolean))].sort();
  
  // Filter and sort players
  // First show players with boosts, then sort alphabetically
  const filteredPlayers = players
  .filter(player => {
    // Check if the player is in your squad (assuming `isInSquad` is a property)
    const isInSquad = player.isInSquad; // Replace with the appropriate condition or data source.

    // Ensure the player passes all the other filters
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || player.role === filterRole;
    const matchesTeam = filterTeam === 'all' || player.current_team?.name === filterTeam;
    const isAssigned = isPlayerAssigned(player.id);
    const matchesAssigned =
      filterAssigned === 'all' ||
      (filterAssigned === 'assigned' && isAssigned) ||
      (filterAssigned === 'unassigned' && !isAssigned);

    return isInSquad && matchesSearch && matchesRole && matchesTeam && matchesAssigned;
  })
  .sort((a, b) => {
    const aHasBoost = isPlayerAssigned(a.id);
    const bHasBoost = isPlayerAssigned(b.id);

    if (aHasBoost && !bHasBoost) return -1;
    if (!aHasBoost && bHasBoost) return 1;

    return a.name.localeCompare(b.name);
  });

  // Get eligible roles for a player
  const getEligibleRolesForPlayer = (player) => {
    if (!player) return [];
    return boostRoles.filter(role => canAssignPlayerToRole(player, role.id));
  };

  // Handle player selection and save scroll position
  const handlePlayerSelect = (player) => {
    if (playerListRef.current) {
      setScrollPosition(playerListRef.current.scrollTop);
    }
    setSelectedPlayer(player);
  };

  // Handle back button - restore scroll position
  const handleBackToPlayerList = () => {
    setSelectedPlayer(null);
    // Use setTimeout to ensure the player list is rendered before scrolling
    setTimeout(() => {
      if (playerListRef.current) {
        playerListRef.current.scrollTop = scrollPosition;
      }
    }, 0);
  };

  return (
    <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
          Week 6 (Apr 26 - May 2)
        </h2>
        
        {/* Countdown and retention info */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-1/2">
            <CountdownTimer onExpire={() => {}} />
          </div>
          <div className="lg:w-1/2 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-blue-600 dark:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Summary of next week's assignments */}
      <div className="bg-neutral-50 dark:bg-neutral-700 p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="font-medium text-neutral-900 dark:text-white mb-3">Next Week's Boosts</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {boostRoles.map(role => {
            const assignment = futureCoreSquad?.find(a => a.boost_id === role.id);
            const player = assignment ? getPlayerById(assignment.player_id) : null;
            
            return (
              <div key={role.id} className="flex items-center p-2 bg-white dark:bg-black rounded border border-neutral-200 dark:border-neutral-600">
                <div className="h-6 w-6 flex-shrink-0 mr-2">
                  {getRoleIcon(role.name, 16, squadColor)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{role.name}</div>
                  {player ? (
                    <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {player.name}
                    </div>
                  ) : (
                    <div className="text-xs italic text-neutral-400 dark:text-neutral-500">Empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conditional rendering based on screen size */}
      {isMobileView && selectedPlayer ? (
        /* Mobile Player Detail View */
        <div className="p-4">
          {/* Back button */}
          <button 
            onClick={handleBackToPlayerList}
            className="flex items-center text-neutral-600 dark:text-neutral-400 mb-4"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Players</span>
          </button>

          {/* Selected Player Header */}
          <div className="mb-5 pb-4 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              {selectedPlayer.name}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {selectedPlayer.role} • {selectedPlayer.current_team?.name || 'No team'}
            </p>
          </div>

          {/* Eligible Roles */}
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Eligible Boosts
          </h4>
          
          <div className="space-y-3">
            {getEligibleRolesForPlayer(selectedPlayer).map(role => {
              const currentAssignment = futureCoreSquad?.find(a => a.boost_id === role.id);
              const isCurrentlyAssigned = currentAssignment?.player_id === selectedPlayer.id;
              const hasOtherPlayerAssigned = currentAssignment && !isCurrentlyAssigned;
              
              return (
                <div key={role.id} className="group relative">
                  <button
                    onClick={() => !isDeadlinePassed && handleRoleAssignment(role.id, selectedPlayer.id)}
                    disabled={isDeadlinePassed}
                    className={`
                      w-full flex items-start p-3 rounded-lg text-left transition-all
                      ${isCurrentlyAssigned 
                        ? 'bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800' 
                        : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900/30'}
                      ${isDeadlinePassed ? 'opacity-75 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="h-10 w-10 flex items-center justify-center bg-white dark:bg-black rounded-full shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700 mr-3 flex-shrink-0">
                      {getRoleIcon(role.name, 20, squadColor)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-medium text-neutral-900 dark:text-white">
                        {role.name}
                      </div>
                      
                      {isCurrentlyAssigned ? (
                        <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                          Currently Assigned
                        </div>
                      ) : hasOtherPlayerAssigned ? (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          Currently: {getPlayerById(currentAssignment.player_id)?.name}
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          Available
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}

            {getEligibleRolesForPlayer(selectedPlayer).length === 0 && (
              <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
                This player is not eligible for any boost roles
              </div>
            )}
          </div>
        </div>
      ) : isMobileView ? (
        /* Mobile Player List View */
        <div>
          {/* Search and Filters */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-700">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players..."
                className="block w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-500 dark:text-neutral-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile Filters - Simplified for mobile */}
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="flex-1 rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-600 text-neutral-700 dark:text-white text-sm p-2"
              >
                <option value="all">All Roles</option>
                <option value="BAT">Batters</option>
                <option value="BOWL">Bowlers</option>
                <option value="ALL">All-Rounders</option>
                <option value="WK">Wicket Keepers</option>
              </select>
              
              <select
                value={filterAssigned}
                onChange={(e) => setFilterAssigned(e.target.value)}
                className="flex-1 rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-600 text-neutral-700 dark:text-white text-sm p-2"
              >
                <option value="all">All Players</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
            
            <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {filteredPlayers.length} players found
            </div>
          </div>

          {/* Players List - Full height scrollable on mobile */}
          <div
            ref={playerListRef}
            className="p-4 overflow-y-auto"
            style={{ maxHeight: '60vh' }}
          >
            <div className="space-y-2">
              {filteredPlayers.map(player => {
                const isAssigned = isPlayerAssigned(player.id);
                const assignedRole = isAssigned ? getRoleById(getPlayerRole(player.id)) : null;
                
                return (
                  <div 
                    key={player.id}
                    onClick={() => !isDeadlinePassed && handlePlayerSelect(player)}
                    className={`
                      rounded-lg p-3 cursor-pointer border transition-all
                      border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700
                      ${isDeadlinePassed ? 'opacity-75 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {player.name}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {player.role} • {player.current_team?.name || 'No team'}
                        </div>
                      </div>

                      {/* Current assignment indicator - just the icon */}
                      {isAssigned && assignedRole && (
                        <div className="h-6 w-6 flex items-center justify-center bg-white dark:bg-black rounded-full shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700">
                          {getRoleIcon(assignedRole.name, 16, squadColor)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredPlayers.length === 0 && (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No players match your filters
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Two-panel View (Original UI) */
        <div className="flex flex-col lg:flex-row">
          {/* Left Panel - Player Selection */}
          <div className="lg:w-3/5 border-r border-neutral-200 dark:border-neutral-700">
            {/* Search and Filters */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="block w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-500 dark:text-neutral-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-600 text-neutral-700 dark:text-white text-sm p-2"
                >
                  <option value="all">All Roles</option>
                  <option value="BAT">Batters</option>
                  <option value="BOWL">Bowlers</option>
                  <option value="ALL">All-Rounders</option>
                  <option value="WK">Wicket Keepers</option>
                </select>
                
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
                  value={filterAssigned}
                  onChange={(e) => setFilterAssigned(e.target.value)}
                  className="rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-600 text-neutral-700 dark:text-white text-sm p-2"
                >
                  <option value="all">All Players</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
              
              <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {filteredPlayers.length} players found
              </div>
            </div>

            {/* Players Grid */}
            <div 
              className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto"
              ref={playerListRef}
            >
              {filteredPlayers.map(player => {
                const isAssigned = isPlayerAssigned(player.id);
                const isSelected = selectedPlayer?.id === player.id;
                const assignedRole = isAssigned ? getRoleById(getPlayerRole(player.id)) : null;
                
                return (
                  <div 
                    key={player.id}
                    onClick={() => !isDeadlinePassed && setSelectedPlayer(player)}
                    className={`
                      rounded-lg p-3 cursor-pointer border transition-all
                      ${isSelected 
                        ? 'border-neutral-500 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700' 
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700'}
                      ${isDeadlinePassed ? 'opacity-75 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {player.name}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {player.role} • {player.current_team?.name || 'No team'}
                        </div>
                      </div>

                      {/* Current assignment indicator - just the icon */}
                      {isAssigned && assignedRole && (
                        <div className="h-6 w-6 flex items-center justify-center bg-white dark:bg-black rounded-full shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700">
                          {getRoleIcon(assignedRole.name, 16, squadColor)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredPlayers.length === 0 && (
                <div className="col-span-full text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No players match your filters
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Role Assignment */}
          <div className="lg:w-2/5">
            {/* Player Details or No Selection State */}
            {!selectedPlayer ? (
              <div className="p-6 text-center">
                <div className="mx-auto w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                  Select a player
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Choose a player from the list to assign boost roles
                </p>
              </div>
            ) : (
              <div className="p-5">
                {/* Selected Player Header */}
                <div className="mb-5 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                      {selectedPlayer.name}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {selectedPlayer.role} • {selectedPlayer.current_team?.name || 'No team'}
                    </p>
                  </div>
                </div>

                {/* Eligible Roles */}
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Eligible Boosts
                </h4>
                
                <div className="space-y-3">
                  {getEligibleRolesForPlayer(selectedPlayer).map(role => {
                    const currentAssignment = futureCoreSquad?.find(a => a.boost_id === role.id);
                    const isCurrentlyAssigned = currentAssignment?.player_id === selectedPlayer.id;
                    const hasOtherPlayerAssigned = currentAssignment && !isCurrentlyAssigned;
                    
                    return (
                      <div key={role.id} className="group relative">
                        <button
                          onClick={() => !isDeadlinePassed && handleRoleAssignment(role.id, selectedPlayer.id)}
                          disabled={isDeadlinePassed}
                          className={`
                            w-full flex items-start p-3 rounded-lg text-left transition-all
                            ${isCurrentlyAssigned 
                              ? 'bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800' 
                              : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900/30'}
                            ${isDeadlinePassed ? 'opacity-75 cursor-not-allowed' : ''}
                          `}
                        >
                          <div className="h-10 w-10 flex items-center justify-center bg-white dark:bg-black rounded-full shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700 mr-3 flex-shrink-0">
                            {getRoleIcon(role.name, 20, squadColor)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-lg font-medium text-neutral-900 dark:text-white">
                              {role.name}
                            </div>
                            
                            {isCurrentlyAssigned ? (
                              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                                Currently Assigned
                              </div>
                            ) : hasOtherPlayerAssigned ? (
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                Currently: {getPlayerById(currentAssignment.player_id)?.name}
                              </div>
                            ) : (
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                Available
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}

                  {getEligibleRolesForPlayer(selectedPlayer).length === 0 && (
                    <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
                      This player is not eligible for any boost roles
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoostSelection;
