import React, { useState, useEffect } from 'react';
import { usePlayerModal } from '../../context/PlayerModalContext';
import { 
  Info, 
  Search, 
  X,
  User, 
  ChevronDown, 
  ChevronUp,
  Crown,
  Zap,
  Handshake,
  Sparkles,
  Anchor,
  Swords,
  Bomb,
  EarthLock
} from 'lucide-react';

// Countdown Timer Component with fixed widths
const CountdownTimer = ({ onExpire }) => {
  const [timeLeft, setTimeLeft] = useState({});
  const lockDate = new Date('2025-03-22T14:00:00Z'); // March 22, 2025, 2pm UTC

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
      <div className="rounded-lg bg-red-100 dark:bg-red-900 px-4 py-2 text-center w-full md:w-auto">
        <div className="text-sm font-bold text-red-700 dark:text-red-300">Lineup Locked</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900 px-4 py-3 w-full md:w-auto">
      <div className="text-xs text-indigo-600 dark:text-indigo-300 mb-1">Boost Picks Lock For The Week In:</div>
      <div className="flex space-x-2 text-center justify-center md:justify-start">
        <div className="bg-white dark:bg-gray-800 rounded px-2 py-1 w-14">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{timeLeft.days}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">days</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded px-2 py-1 w-14">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{timeLeft.hours}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">hrs</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded px-2 py-1 w-14">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{timeLeft.minutes}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">min</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded px-2 py-1 w-14">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{timeLeft.seconds}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">sec</div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get role icon
const getRoleIcon = (roleName, size = 16, squadColor) => {
  switch(roleName) {
    case 'Captain':
      return <Crown size={size} className="text-indigo-600 dark:text-indigo-400" style={{color: squadColor}} />;
    case 'Vice-Captain':
      return <Swords size={size} className="text-indigo-500 dark:text-indigo-300" style={{color: squadColor}} />;
    case 'Slogger':
      return <Zap size={size} className="text-red-500 dark:text-red-400" style={{color: squadColor}} />;
    case 'Accumulator':
      return <Anchor size={size} className="text-yellow-500 dark:text-yellow-400" style={{color: squadColor}} />;
    case 'Safe Hands':
      return <Handshake size={size} className="text-cyan-500 dark:text-cyan-400" style={{color: squadColor}} />;
    case 'Rattler':
      return <Bomb size={size} className="text-green-500 dark:text-green-400" style={{color: squadColor}} />;
    case 'Constrictor':
      return <EarthLock size={size} className="text-emerald-500 dark:text-emerald-400" style={{color: squadColor}} />;
    default: // Virtuoso
      return <Sparkles size={size} className="text-purple-500 dark:text-purple-400" style={{color: squadColor}} />;
  }
};

// Visually enhanced role info card
const BoostGuideCard = ({ boostRoles, showGuide, setShowGuide, squadColor }) => {
  if (!Array.isArray(boostRoles) || boostRoles.length === 0) {
    return null;
  }

  // Helper function to format multipliers into grouped format
  const formatMultipliers = (multipliers) => {
    if (!multipliers) return {};
    
    // For Captain and Vice-Captain, use simplified format
    if (Object.values(multipliers).every(val => val === 2)) {
      return { simplified: "2× All", multiplier: 2 };
    }
    if (Object.values(multipliers).every(val => val === 1.5)) {
      return { simplified: "1.5× All", multiplier: 1.5 };
    }
    
    // For other roles, group by multiplier value
    const grouped = { "1.5": [], "2": [] };
    
    Object.entries(multipliers).forEach(([key, value]) => {
      if (value === 1.5) {
        grouped["1.5"].push(key);
      } else if (value === 2) {
        grouped["2"].push(key);
      }
    });
    
    return grouped;
  };
  
  // Format stat name for display
  const formatStatName = (stat) => {
    return stat.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full flex justify-between items-center mb-4"
      >
        <div className="flex items-center">
          <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Boost Guide</h2>
        </div>
        {showGuide ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      
      {showGuide && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
          {boostRoles.map(role => {
            const formattedMultipliers = formatMultipliers(role.multipliers);
            
            return (
              <div key={role.id} className="flex items-start">
                <div className="h-8 w-8 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full shadow-sm mr-3 flex-shrink-0">
                  <div className="flex items-center justify-center">
                    {getRoleIcon(role.name, 18, squadColor)}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1">{role.name}</div>
                  {/* <div className="text-xs font-light mb-1">{role.description ? role.description : ''}</div> */}
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {role.allowed_player_types.join(', ')}
                  </div>
                  
                  {formattedMultipliers.simplified ? (
                    <div className="text-xs font-medium">
                      <span className={
                        formattedMultipliers.multiplier === 2 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-blue-600 dark:text-blue-400"
                      }>
                        {formattedMultipliers.simplified}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {formattedMultipliers["2"] && formattedMultipliers["2"].length > 0 && (
                        <div className="text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-block w-8">2×:</span> 
                          <span className="text-gray-700 dark:text-gray-300">
                            {formattedMultipliers["2"].map(stat => formatStatName(stat)).join(', ')}
                          </span>
                        </div>
                      )}
                      {formattedMultipliers["1.5"] && formattedMultipliers["1.5"].length > 0 && (
                        <div className="text-xs">
                          <span className="text-blue-600 dark:text-blue-400 font-medium inline-block w-8">1.5×:</span> 
                          <span className="text-gray-700 dark:text-gray-300">
                            {formattedMultipliers["1.5"].map(stat => formatStatName(stat)).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Current Core Squad Card
const CurrentCoreSquad = ({ currentCoreSquad, getRoleById, getPlayerById, leagueId, showCurrent, setShowCurrent, squadColor }) => {
  const { openPlayerModal } = usePlayerModal();
  
  // Don't render anything if squad is empty (draft hasn't completed)
  if (!currentCoreSquad?.length) {
    return null;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <button
        onClick={() => setShowCurrent(!showCurrent)}
        className="w-full flex justify-between items-center mb-4"
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Current Week Boosts
        </h2>
        {showCurrent ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      
      {showCurrent && (
        <>
          {currentCoreSquad?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentCoreSquad.map(assignment => {
                const player = getPlayerById(assignment.player_id);
                const role = getRoleById(assignment.boost_id);
                if (!role) return null;

                return (
                  <div key={role.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-6 w-6 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full shadow-sm">
                        {getRoleIcon(role.name, 16, squadColor)}
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {role.name}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 pl-8">
                      {player ? (
                        <span
                          className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                          onClick={() => openPlayerModal(player.id, leagueId)}
                        >
                          {player.name}
                        </span>
                      ) : (
                        'No player assigned'
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No players assigned for current week
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Role Selector Component
const RoleSelector = ({ boostRoles, selectedRole, setSelectedRole, futureCoreSquad, getPlayerById, isDeadlinePassed, squadColor }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Select Boost to Assign
      </h3>
      
      {isDeadlinePassed ? (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 p-4 rounded-md mb-4">
          <p className="text-sm">Role selections are locked for this week.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {boostRoles.map(role => {
            const assignment = futureCoreSquad?.find(a => a.boost_id === role.id);
            const player = assignment ? getPlayerById(assignment.player_id) : null;
            const isActive = selectedRole === role.id;
            
            return (
              <button
                key={role.id}
                onClick={() => !isDeadlinePassed && setSelectedRole(isActive ? null : role.id)}
                disabled={isDeadlinePassed}
                className={`rounded-lg p-3 text-center transition-all h-full
                  ${isActive
                    ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900'
                    : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }
                  ${isDeadlinePassed ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-full shadow-sm mb-2">
                    {getRoleIcon(role.name, 20, squadColor)}
                  </div>
                  
                  <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                    {role.name}
                  </div>
                  
                  {player ? (
                    <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 w-full">
                      {player.name}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 dark:text-gray-500 italic">
                      Empty
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Player Selector with Search/Filter
const PlayerSelector = ({ 
  players, 
  selectedRole, 
  canAssignPlayerToRole, 
  isPlayerAssigned, 
  handlePlayerSelect, 
  getRoleById 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  
  // Get all teams for filtering
  const teams = [...new Set(players.map(p => p.current_team?.name).filter(Boolean))].sort();
  
  // Filter players based on search and filters
  const filteredPlayers = players.filter(player => {
    // Search by name
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by role
    const matchesRole = filterRole === 'all' || player.role === filterRole;
    
    // Filter by team
    const matchesTeam = filterTeam === 'all' || player.current_team?.name === filterTeam;
    
    return matchesSearch && matchesRole && matchesTeam;
  });

  const selectedRoleObj = getRoleById(selectedRole);
  
  // Add a check to make sure the role object exists
  if (!selectedRole || !selectedRoleObj) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
        <User className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select a boost above</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose one of the boosts to assign a player
        </p>
      </div>
    );
  }
  
  // Group eligible and ineligible players
  const eligiblePlayers = filteredPlayers.filter(p => canAssignPlayerToRole(p, selectedRole) && !isPlayerAssigned(p.id));
  const assignedPlayers = filteredPlayers.filter(p => isPlayerAssigned(p.id));
  const ineligiblePlayers = filteredPlayers.filter(p => !canAssignPlayerToRole(p, selectedRole) && !isPlayerAssigned(p.id));
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <div className="h-8 w-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full shadow-sm">
            {getRoleIcon(selectedRoleObj.name, 20)}
          </div>
          Select Player for {selectedRoleObj.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-10">
          Allowed player types: {selectedRoleObj.allowed_player_types.join(', ')}
        </p>
      </div>
      
      {/* Search and Filters */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-700 dark:text-white text-sm p-2"
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
              className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-700 dark:text-white text-sm p-2"
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {filteredPlayers.length} players found • {eligiblePlayers.length} eligible for this role
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {/* Eligible Players */}
        {eligiblePlayers.length > 0 && (
          <div className="px-4 py-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eligible Players</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {eligiblePlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerSelect(player.id)}
                  className="flex items-center p-3 rounded-lg text-left bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {player.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-500 mr-1"></span>
                      {player.current_team?.name || 'No team'} • {player.role}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Assigned Players */}
        {assignedPlayers.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Already Assigned</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignedPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center p-3 rounded-lg text-left bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 opacity-60"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {player.name}
                    </div>
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      Already assigned to another role
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Ineligible Players */}
        {ineligiblePlayers.length > 0 && searchQuery && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Not Eligible for This Role</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ineligiblePlayers.slice(0, 6).map(player => (
                <div
                  key={player.id}
                  className="flex items-center p-3 rounded-lg text-left bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 opacity-60"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {player.name}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">
                      Invalid player type: {player.role}
                    </div>
                  </div>
                </div>
              ))}
              {ineligiblePlayers.length > 6 && (
                <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                  +{ineligiblePlayers.length - 6} more ineligible players
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* No Results */}
        {filteredPlayers.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No players match your search criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Core Squad Tab Component
const CoreSquadTab = ({
  players,
  boostRoles,
  currentCoreSquad,
  futureCoreSquad,
  onUpdateRole,
  isOwnSquad,
  leagueId,
  squadColor
}) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState(null);
  const [showCurrent, setShowCurrent] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);

  // Check if current time is past deadline
  useEffect(() => {
    const lockDate = new Date('2025-03-22T14:00:00Z'); // March 22, 2025, 2pm UTC
    const currentTime = new Date();
    setIsDeadlinePassed(currentTime >= lockDate);
  }, []);

  // Helper to get player details by ID
  const getPlayerById = (playerId) => {
    return players.find(p => p.id === playerId);
  };

  // Get role details by ID
  const getRoleById = (roleId) => {
    return boostRoles.find(r => r.id === roleId);
  };

  // Check if player is already assigned in future core squad
  const isPlayerAssigned = (playerId) => {
    return futureCoreSquad?.some(assignment => assignment.player_id === playerId);
  };

  // Handle role assignment
  const handlePlayerSelect = async (playerId) => {
    if (!selectedRole || isDeadlinePassed) return;
    
    try {
      await onUpdateRole(selectedRole, playerId);
      setSelectedRole(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Check if a player can be assigned to a role
  const canAssignPlayerToRole = (player, roleId) => {
    const role = getRoleById(roleId);
    // Add a safety check
    if (!role || !role.allowed_player_types) return false;
    return role.allowed_player_types.includes(player.role);
  };

  // Check if squad is empty (no players in the squad, meaning draft hasn't completed)
  const isSquadEmpty = !players || players.length === 0;

  return (
    <div className="space-y-6">
      {/* Boost Guide Section - Moved to top */}
      <BoostGuideCard 
        boostRoles={boostRoles}
        showGuide={showGuide}
        setShowGuide={setShowGuide}
        squadColor={squadColor}
      />
      
      {/* Current Week's Core Squad Section - Only show if players exist */}
      <CurrentCoreSquad 
        currentCoreSquad={currentCoreSquad}
        getRoleById={getRoleById}
        getPlayerById={getPlayerById}
        leagueId={leagueId}
        showCurrent={showCurrent}
        setShowCurrent={setShowCurrent}
        squadColor={squadColor}
      />

      {/* Next Week Planning - Only show if players exist */}
      {isOwnSquad && !isSquadEmpty && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Week 1 (Mar 22 - Mar 28)
            </h2>
            
            {/* Countdown */}
            <div className="flex flex-col lg:flex-row gap-4">
              <CountdownTimer onExpire={() => setIsDeadlinePassed(true)} />
            </div>
            
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>
          
          {/* Role Selection */}
         <div className="px-6 pt-4 pb-2">
           <RoleSelector 
             boostRoles={boostRoles}
             selectedRole={selectedRole}
             setSelectedRole={setSelectedRole}
             futureCoreSquad={futureCoreSquad}
             getPlayerById={getPlayerById}
             isDeadlinePassed={isDeadlinePassed}
             squadColor={squadColor}
           />
         </div>
         
         {/* Player Selection */}
         <div className="px-6 pb-6">
           <PlayerSelector 
             players={players}
             selectedRole={selectedRole}
             canAssignPlayerToRole={canAssignPlayerToRole}
             isPlayerAssigned={isPlayerAssigned}
             handlePlayerSelect={handlePlayerSelect}
             getRoleById={getRoleById}
           />
         </div>
       </div>
     )}
     
     {/* Show message if squad is empty */}
     {isOwnSquad && isSquadEmpty && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Draft hasn't started yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Once the draft is complete and you have players in your squad, you'll be able to assign boost roles to your players for the upcoming week.
          </p>
        </div>
      )}
    </div>
  );
};

export default CoreSquadTab;