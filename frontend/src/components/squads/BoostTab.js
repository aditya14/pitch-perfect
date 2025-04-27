import React, { useState, useEffect } from 'react';
import BoostGuide from './elements/BoostGuide';
import CurrentBoosts from './elements/CurrentBoosts';
import BoostSelection from './elements/BoostSelection';
import { User } from 'lucide-react';

const BoostTab = ({
  players,
  boostRoles,
  currentCoreSquad,
  futureCoreSquad,
  onUpdateRole,
  isOwnSquad,
  leagueId,
  squadColor
}) => {
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  const [showCurrent, setShowCurrent] = useState(true);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Check if current time is past deadline
  useEffect(() => {
    const lockDate = new Date('2025-05-03T14:00:00Z'); // May 3, 2025, 2pm UTC
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

  // Get the role a player is assigned to
  const getPlayerRole = (playerId) => {
    const assignment = futureCoreSquad?.find(a => a.player_id === playerId);
    return assignment ? assignment.boost_id : null;
  };

  // Handle role assignment
  const handleRoleAssignment = async (roleId, playerId) => {
    if (isDeadlinePassed) return;
    
    try {
      await onUpdateRole(roleId, playerId);
      setSelectedPlayer(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Check if a player can be assigned to a role
  const canAssignPlayerToRole = (player, roleId) => {
    const role = getRoleById(roleId);
    if (!role || !role.allowed_player_types) return false;
    return role.allowed_player_types.includes(player.role);
  };

  // Check if squad is empty (no players in the squad, meaning draft hasn't completed)
  const isSquadEmpty = !players || players.length === 0;

  return (
    <div className="space-y-6">
      {/* Boost Guide Section */}
      <BoostGuide 
        boostRoles={boostRoles}
        showGuide={showGuide}
        setShowGuide={setShowGuide}
        squadColor={squadColor}
      />
      
      {/* Current Week's Core Squad Section */}
      <CurrentBoosts 
        currentCoreSquad={currentCoreSquad}
        boostRoles={boostRoles}
        getRoleById={getRoleById}
        getPlayerById={getPlayerById}
        leagueId={leagueId}
        showCurrent={showCurrent}
        setShowCurrent={setShowCurrent}
        squadColor={squadColor}
      />

      {/* Next Week Planning */}
      {isOwnSquad && !isSquadEmpty && (
        <BoostSelection
          players={players}
          boostRoles={boostRoles}
          futureCoreSquad={futureCoreSquad}
          selectedPlayer={selectedPlayer}
          setSelectedPlayer={setSelectedPlayer}
          handleRoleAssignment={handleRoleAssignment}
          isDeadlinePassed={isDeadlinePassed}
          getPlayerById={getPlayerById}
          getRoleById={getRoleById}
          canAssignPlayerToRole={canAssignPlayerToRole}
          isPlayerAssigned={isPlayerAssigned}
          getPlayerRole={getPlayerRole}
          error={error}
          squadColor={squadColor}
        />
      )}
      
      {/* Show message if squad is empty */}
      {isOwnSquad && isSquadEmpty && (
        <div className="bg-white dark:bg-neutral-800 shadow rounded-lg p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            Draft hasn't started yet
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Once the draft is complete and you have players in your squad, you'll be able to assign boost roles to your players for the upcoming week.
          </p>
        </div>
      )}
    </div>
  );
};

export default BoostTab;
