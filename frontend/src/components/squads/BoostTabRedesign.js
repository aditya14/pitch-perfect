import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'lucide-react';
import BoostGuide from './elements/BoostGuide';
import CurrentBoosts from './elements/CurrentBoosts';
import RoleSlotGrid from './elements/RoleSlotGrid';
import PlayerSelectionPanel from './elements/PlayerSelectionPanel';
import CountdownTimer from './elements/CountdownTimer';
import { getRoleIcon } from '../../utils/roleUtils';
import { getTextColorForBackground } from '../../utils/colorUtils';
import { canAssignPlayerToRole } from '../../utils/boostEligibility';
import { Tooltip } from 'react-tooltip';

// Define your deadline constant HERE
const BOOST_LOCK_DEADLINE = new Date('2025-04-19T10:00:00Z'); // Example: Use your actual deadline logic/source

/**
 * Redesigned BoostTab with role-centric approach
 */
const BoostTabRedesign = ({
  players,
  boostRoles,
  currentCoreSquad,
  futureCoreSquad,
  onUpdateRole,
  isOwnSquad,
  leagueId,
  squadColor
}) => {
  // State for assignments map (boostRoleId -> playerId)
  const [futureAssignments, setFutureAssignments] = useState({});
  
  // State for UI
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCurrentBoosts, setShowCurrentBoosts] = useState(true);
  const [showBoostGuide, setShowBoostGuide] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);

  // Use the defined constant
  const isDeadlinePassed = useMemo(() => new Date() >= BOOST_LOCK_DEADLINE, []);

  // Initialize futureAssignments on component mount or when futureCoreSquad changes
  useEffect(() => {
    if (!futureCoreSquad) return;
    
    const assignmentsMap = {};
    futureCoreSquad.forEach(assignment => {
      assignmentsMap[assignment.boost_id] = assignment.player_id;
    });
    
    setFutureAssignments(assignmentsMap);
  }, [futureCoreSquad]);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Helper function to get player by ID
  const getPlayerById = useCallback((playerId) => {
    return players.find(p => p.id === playerId);
  }, [players]);

  // Helper function to get role by ID
  const getRoleById = useCallback((roleId) => {
    return boostRoles.find(r => r.id === parseInt(roleId));
  }, [boostRoles]);

  // Check if a player is assigned to any role other than the specified one
  const isPlayerAssignedToOtherRole = useCallback((playerId, excludeRoleId = null) => {
    return Object.entries(futureAssignments).some(
      ([roleId, pId]) => pId === playerId && parseInt(roleId) !== (excludeRoleId ? parseInt(excludeRoleId) : null)
    );
  }, [futureAssignments]);

  // Handle slot click
  const handleSlotClick = (boostRoleId) => {
    if (isDeadlinePassed) return;
    
    setActiveSlotId(boostRoleId);
    setShowPlayerSelection(true);
  };

  // Handle closing player selection panel
  const handleClosePlayerSelection = () => {
    setActiveSlotId(null);
    setShowPlayerSelection(false);
  };

  // Handle player assignment
  const handlePlayerAssign = (playerId) => {
    if (!activeSlotId || isDeadlinePassed) return;
    
    const boostRole = getRoleById(activeSlotId);
    const player = getPlayerById(playerId);
    
    // Validate eligibility
    if (!canAssignPlayerToRole(player, activeSlotId)) {
      setError(`${player.name} is not eligible for the ${boostRole.name} role.`);
      return;
    }
    
    // Check if player is already assigned to another role
    const existingAssignment = Object.entries(futureAssignments).find(
      ([roleId, pId]) => pId === playerId && parseInt(roleId) !== activeSlotId
    );
    
    // Create new assignments map
    const newAssignments = { ...futureAssignments };
    
    // If player is already assigned elsewhere, remove from old role
    if (existingAssignment) {
      newAssignments[existingAssignment[0]] = null;
    }
    
    // Assign to new role
    newAssignments[activeSlotId] = playerId;
    
    // Update state
    setFutureAssignments(newAssignments);
    
    // Save assignment(s)
    saveAssignment(activeSlotId, playerId);
    if (existingAssignment) {
      saveAssignment(existingAssignment[0], null);
    }
    
    // Close player selection panel
    handleClosePlayerSelection();
  };

  // Handle removing assignment
  const handleRemoveAssignment = (boostRoleId) => {
    if (isDeadlinePassed) return;
    
    const newAssignments = { ...futureAssignments };
    newAssignments[boostRoleId] = null;
    
    setFutureAssignments(newAssignments);
    saveAssignment(boostRoleId, null);
  };

  // Save assignment to backend
  const saveAssignment = (boostRoleId, playerId) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    onUpdateRole(boostRoleId, playerId)
      .then(() => {
        setSuccess('Boost role updated successfully');
      })
      .catch(err => {
        setError(err.message || 'Failed to update boost role');
        
        // Revert state (optional - could also just rely on parent component to refetch)
        // This would need to revert to the original futureCoreSquad state
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Check if squad is empty (no players in the squad, meaning draft hasn't completed)
  const isSquadEmpty = !players || players.length === 0;

  const textColor = useMemo(() => getTextColorForBackground(squadColor), [squadColor]);

  if (isSquadEmpty && isOwnSquad) {
    return (
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
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Boost Management</h2>
        {!isDeadlinePassed && isOwnSquad && <CountdownTimer deadline={BOOST_LOCK_DEADLINE} />}
        {isDeadlinePassed && <p className="text-red-500 font-semibold">Boosts Locked</p>}
        {!isOwnSquad && <p className="text-gray-500 italic">Viewing squad (read-only)</p>}
      </div>

      {/* Loading/Error/Success Feedback */}
      {isLoading && <p className="text-blue-500 animate-pulse">Saving assignment...</p>}
      {error && <p className="text-red-500 bg-red-100 p-2 rounded border border-red-300">{error}</p>}
      {success && <p className="text-green-500 bg-green-100 p-2 rounded border border-green-300">{success}</p>}

      {/* Current Boosts (Collapsible) */}
      <div className="border rounded dark:border-gray-700">
        <button
          onClick={() => setShowCurrentBoosts(!showCurrentBoosts)}
          className="w-full text-left p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium rounded-t flex justify-between items-center"
        >
          This Week's Boosts
          <span>{showCurrentBoosts ? '▲' : '▼'}</span>
        </button>
        {showCurrentBoosts && (
          <div className="p-3 border-t dark:border-gray-700">
            <CurrentBoosts
              coreSquad={currentCoreSquad}
              boostRoles={boostRoles}
              players={players}
              getPlayerById={getPlayerById}
              getRoleById={getRoleById}
              squadColor={squadColor}
            />
          </div>
        )}
      </div>

      {/* Next Week's Assignment Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Next Week's Boost Assignment</h3>
        {isDeadlinePassed && <p className="text-sm text-gray-500">The deadline has passed. Assignments are locked.</p>}
        {!isOwnSquad && !isDeadlinePassed && <p className="text-sm text-gray-500">Only the squad owner can assign boosts.</p>}

        <RoleSlotGrid
          boostRoles={boostRoles}
          futureAssignments={futureAssignments}
          activeSlotId={activeSlotId}
          handleSlotClick={handleSlotClick}
          handleRemoveAssignment={handleRemoveAssignment}
          getPlayerById={getPlayerById}
          isDeadlinePassed={isDeadlinePassed || !isOwnSquad} // Disable if deadline passed OR not owner
          squadColor={squadColor}
          getRoleIcon={getRoleIcon} // Pass down utility
        />
      </div>

      {/* Player Selection Panel/Modal */}
      {showPlayerSelection && activeSlotId && (
        <PlayerSelectionPanel
          players={players}
          activeSlotId={activeSlotId}
          getRoleById={getRoleById}
          handlePlayerAssign={handlePlayerAssign}
          handleClose={handleClosePlayerSelection}
          futureAssignments={futureAssignments}
          isDeadlinePassed={isDeadlinePassed || !isOwnSquad}
          squadColor={squadColor}
          canAssignPlayerToRole={canAssignPlayerToRole} // Pass eligibility check
          isPlayerAssignedToOtherRole={isPlayerAssignedToOtherRole} // Pass check
        />
      )}

      {/* Boost Guide (Collapsible) */}
      <div className="border rounded dark:border-gray-700">
        <button
          onClick={() => setShowBoostGuide(!showBoostGuide)}
          className="w-full text-left p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium rounded-t flex justify-between items-center"
        >
          Boost Guide
          <span>{showBoostGuide ? '▲' : '▼'}</span>
        </button>
        {showBoostGuide && (
          <div className="p-3 border-t dark:border-gray-700">
            <BoostGuide />
          </div>
        )}
      </div>
      <Tooltip id="role-tooltip" /> {/* Add Tooltip provider */}
    </div>
  );
};

export default BoostTabRedesign;