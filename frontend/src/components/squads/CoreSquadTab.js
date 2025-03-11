import React, { useState, useEffect } from 'react';
import { usePlayerModal } from '../../context/PlayerModalContext';

// Countdown Timer Component
const CountdownTimer = ({ onExpire }) => {
  const [timeLeft, setTimeLeft] = useState({});
  const lockDate = new Date('2025-03-22T04:00:00Z'); // March 22, 2025, 4am UTC

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
      <div className="rounded-lg bg-red-100 dark:bg-red-900 px-4 py-2 text-center inline-block">
        <div className="text-sm font-bold text-red-700 dark:text-red-300">Lineup Locked</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900 px-4 py-3 inline-block">
      <div className="text-xs text-indigo-600 dark:text-indigo-300 mb-1">Core Squad Locks In:</div>
      <div className="flex space-x-2 text-center">
        <div className="bg-white dark:bg-gray-800 rounded px-2 py-1">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{timeLeft.days}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">days</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded px-2 py-1">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{timeLeft.hours}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">hrs</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded px-2 py-1">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{timeLeft.minutes}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">min</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded px-2 py-1">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{timeLeft.seconds}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">sec</div>
        </div>
      </div>
    </div>
  );
};

// Display-only role card for current week
const CurrentRoleCard = ({ role, player, leagueId }) => {
  const { openPlayerModal } = usePlayerModal();
  
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <div className="font-medium text-gray-900 dark:text-white mb-1">
        {role.name}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">
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
};

// Interactive role card for next week planning
const PlanningRoleCard = ({ role, player, isActive, onClick }) => {
  // Format multipliers text - special case for Captain/Vice Captain
  const getMultipliersText = () => {
    if (role.name === 'Captain') return '2x: All';
    if (role.name === 'Vice-Captain') return '1.5x: All';
    
    // For other roles, group by multiplier value
    const multipliers = Object.entries(role.multipliers)
      .filter(([_, value]) => value > 1)
      .reduce((acc, [key, value]) => {
        if (!acc[value]) acc[value] = [];
        // Format the key for display
        const formattedKey = key
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        acc[value].push(formattedKey);
        return acc;
      }, {});

    return Object.entries(multipliers)
      .map(([value, boosts]) => `${value}x: ${boosts.join(', ')}`)
      .join('\n');
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg text-left w-full transition-all ${
        isActive
          ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900'
          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
      }`}
    >
      <div className="font-medium text-gray-900 dark:text-white mb-2">
        {role.name}
      </div>
      {player ? (
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {player.name}
        </div>
      ) : (
        <div className="text-sm text-gray-400 dark:text-gray-500 mb-2 italic">
          No player assigned
        </div>
      )}
      <div className="text-xs space-y-2">
        <div className="text-gray-500 dark:text-gray-400">
          Allowed: {role.allowed_player_types.join(', ')}
        </div>
        <div className="whitespace-pre-line text-indigo-600 dark:text-indigo-400">
          {getMultipliersText()}
        </div>
      </div>
    </button>
  );
};

const PlayerCard = ({ player, canAssign, isAssigned, onClick }) => (
  <button
    onClick={onClick}
    disabled={!canAssign || isAssigned}
    className={`p-4 rounded-lg text-left w-full ${
      !canAssign || isAssigned
        ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700'
        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
    }`}
  >
    <div className="font-medium text-gray-900 dark:text-white">
      {player.name}
    </div>
    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
      {player.current_team?.name || 'No team'} • {player.role}
    </div>
    {isAssigned && (
      <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
        Already assigned to another role
      </div>
    )}
    {!canAssign && !isAssigned && (
      <div className="text-xs text-red-600 dark:text-red-400 mt-2">
        Invalid player type for this role
      </div>
    )}
  </button>
);

const CoreSquadTab = ({
  players,
  boostRoles,
  currentCoreSquad,
  futureCoreSquad,
  onUpdateRole,
  isOwnSquad,
  leagueId
}) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState(null);
  const [showCurrent, setShowCurrent] = useState(true);
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
    return role.allowed_player_types.includes(player.role);
  };

  return (
    <div className="space-y-8">
      {/* Current Week's Core Squad */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <button
          onClick={() => setShowCurrent(!showCurrent)}
          className="w-full flex justify-between items-center mb-4"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Current Week Core Squad
          </h2>
          <svg 
            className={`w-5 h-5 transform transition-transform ${showCurrent ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showCurrent && (
          <div>
            {currentCoreSquad?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentCoreSquad.map(assignment => {
                  const player = getPlayerById(assignment.player_id);
                  const role = getRoleById(assignment.boost_id);
                  if (!role) return null;

                  return (
                    <CurrentRoleCard
                      key={role.id}
                      role={role}
                      player={player}
                      leagueId={leagueId}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No players assigned for current week
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next Week Planning */}
      {isOwnSquad && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Week 1 (Mar 22 - Mar 28)
            </h2>
            {/* Countdown Timer */}
            <div className="mb-4 max-w-md">
              <CountdownTimer onExpire={() => setIsDeadlinePassed(true)} />
            </div>
          </div>
          
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              1. Select Role
            </h3>
            
            {isDeadlinePassed ? (
              <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 p-4 rounded-md mb-4">
                <p className="text-sm">Role selections are locked for this week.</p>
              </div>
            ) : null}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {boostRoles.map(role => {
                const assignment = futureCoreSquad?.find(a => a.boost_id === role.id);
                const player = assignment ? getPlayerById(assignment.player_id) : null;

                return (
                  <PlanningRoleCard
                    key={role.id}
                    role={role}
                    player={player}
                    isActive={selectedRole === role.id}
                    onClick={() => !isDeadlinePassed && setSelectedRole(selectedRole === role.id ? null : role.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Player Selection */}
          {selectedRole && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                2. Select Player for {getRoleById(selectedRole)?.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map(player => {
                  const canAssign = canAssignPlayerToRole(player, selectedRole);
                  const isAssigned = isPlayerAssigned(player.id);
                  
                  return (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      canAssign={canAssign}
                      isAssigned={isAssigned}
                      onClick={() => canAssign && !isAssigned && handlePlayerSelect(player.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CoreSquadTab;