import React, { useState, useEffect, useMemo } from 'react';
import BoostGuide from './elements/BoostGuide';
import CurrentBoosts from './elements/CurrentBoosts';
import BoostSelection from './elements/BoostSelection';
import { User } from 'lucide-react';
import api from '../../utils/axios';

const BoostTab = ({
  squadId,
  players,
  boostRoles,
  currentCoreSquad,
  onUpdateRole,
  isOwnSquad,
  leagueId,
  squadColor
}) => {
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  const [showCurrent, setShowCurrent] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [phases, setPhases] = useState([]);
  const [phaseAssignments, setPhaseAssignments] = useState({});
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [phaseError, setPhaseError] = useState(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);

  useEffect(() => {
    const fetchPhaseBoosts = async () => {
      if (!squadId) return;
      try {
        setPhaseLoading(true);
        const response = await api.get(`/squads/${squadId}/phase-boosts/`);
        const assignments = response.data.assignments || {};
        const normalizedAssignments = {};
        Object.keys(assignments).forEach(key => {
          normalizedAssignments[parseInt(key, 10)] = assignments[key];
        });
        setPhases(response.data.phases || []);
        setPhaseAssignments(normalizedAssignments);
        setPhaseError(null);
      } catch (err) {
        console.warn('Non-critical: Failed to load phase boosts:', err);
        setPhaseError('Failed to load phase boosts');
      } finally {
        setPhaseLoading(false);
      }
    };

    fetchPhaseBoosts();
  }, [squadId]);

  // Helper to get player details by ID
  const getPlayerById = (playerId) => {
    return players.find(p => p.id === playerId);
  };

  // Get role details by ID
  const getRoleById = (roleId) => {
    return boostRoles.find(r => r.id === roleId);
  };

  const phaseMeta = useMemo(() => {
    const now = new Date();
    return (phases || [])
      .map(phase => {
        const startAt = phase.start ? new Date(phase.start) : null;
        const endAt = phase.end ? new Date(phase.end) : null;
        const openAt = phase.open_at ? new Date(phase.open_at) : null;
        const lockAt = phase.lock_at ? new Date(phase.lock_at) : null;
        const isCurrent = startAt && endAt ? now >= startAt && now <= endAt : false;
        const isUpcoming = startAt ? now < startAt : false;
        const status = isCurrent ? 'current' : isUpcoming ? 'upcoming' : 'completed';
        return {
          ...phase,
          startAt,
          endAt,
          openAt,
          lockAt,
          status
        };
      })
      .sort((a, b) => a.phase - b.phase);
  }, [phases]);

  const { defaultPhase, seasonComplete } = useMemo(() => {
    if (!phaseMeta.length) {
      return { defaultPhase: null, seasonComplete: false };
    }
    const current = phaseMeta.find(p => p.status === 'current');
    const upcoming = phaseMeta.find(p => p.status === 'upcoming');
    const latest = phaseMeta[phaseMeta.length - 1];
    const hasUpcoming = Boolean(upcoming);
    const hasCurrent = Boolean(current);
    const isComplete = !hasUpcoming && !hasCurrent && latest?.endAt && new Date() > latest.endAt;
    return {
      defaultPhase: current || upcoming || latest,
      seasonComplete: isComplete
    };
  }, [phaseMeta]);

  useEffect(() => {
    if (!selectedPhaseId && defaultPhase?.id) {
      setSelectedPhaseId(defaultPhase.id);
    }
  }, [defaultPhase, selectedPhaseId]);

  useEffect(() => {
    setSelectedPlayer(null);
  }, [selectedPhaseId]);

  const selectedPhase = phaseMeta.find(p => p.id === selectedPhaseId) || defaultPhase;
  const selectedAssignments = selectedPhase?.id
    ? (phaseAssignments[selectedPhase.id] || [])
    : (currentCoreSquad || []);

  const isEditable = Boolean(
    isOwnSquad &&
    selectedPhase?.openAt &&
    selectedPhase?.lockAt &&
    new Date() >= selectedPhase.openAt &&
    new Date() < selectedPhase.lockAt
  );

  const phaseWindow = selectedPhase?.startAt && selectedPhase?.endAt
    ? `${selectedPhase.startAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${selectedPhase.endAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : null;
  const statusLabel = selectedPhase?.status
    ? selectedPhase.status.charAt(0).toUpperCase() + selectedPhase.status.slice(1)
    : null;
  const phaseSubtitle = [phaseWindow, statusLabel].filter(Boolean).join(' • ');

  const isPlayerAssigned = (playerId) => {
    return selectedAssignments?.some(assignment => assignment.player_id === playerId);
  };

  const getPlayerRole = (playerId) => {
    const assignment = selectedAssignments?.find(a => a.player_id === playerId);
    return assignment ? assignment.boost_id : null;
  };

  const handleRoleAssignment = async (roleId, playerId) => {
    if (!selectedPhase?.id || !isEditable) return;
    
    try {
      const response = await onUpdateRole(roleId, playerId, selectedPhase.id);
      if (response?.phase_id && response?.assignments) {
        setPhaseAssignments(prev => ({
          ...prev,
          [response.phase_id]: response.assignments
        }));
      } else {
        setPhaseAssignments(prev => {
          const updated = { ...prev };
          const list = [...(updated[selectedPhase.id] || [])];
          const idx = list.findIndex(item => item.boost_id === roleId);
          const nextAssignment = { boost_id: roleId, player_id: playerId };
          if (idx >= 0) {
            list[idx] = nextAssignment;
          } else {
            list.push(nextAssignment);
          }
          updated[selectedPhase.id] = list;
          return updated;
        });
      }
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

      <div className="bg-white dark:bg-neutral-950 shadow rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Phase</div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-white">
              {selectedPhase?.label || 'Boost assignments'}
            </div>
            {phaseSubtitle && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {phaseSubtitle}
              </div>
            )}
          </div>
          <div className="min-w-[220px]">
            <select
              value={selectedPhaseId || ''}
              onChange={(e) => setSelectedPhaseId(parseInt(e.target.value, 10))}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 text-sm p-2"
              disabled={phaseLoading || phaseMeta.length === 0}
            >
              {phaseMeta.length === 0 && (
                <option value="">No phases</option>
              )}
              {phaseMeta.map(phase => (
                <option key={phase.id} value={phase.id}>
                  {phase.label} • {phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}
                </option>
              ))}
            </select>
            {phaseLoading && (
              <div className="text-xs text-neutral-400 mt-2">Loading phases...</div>
            )}
            {phaseError && (
              <div className="text-xs text-red-500 mt-2">{phaseError}</div>
            )}
          </div>
        </div>
        {seasonComplete && (
          <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Season complete. Viewing the final phase assignments.
          </div>
        )}
        {!seasonComplete && selectedPhase && !isEditable && (
          <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Editing is closed for this phase.
          </div>
        )}
      </div>
      
      {/* Phase Boosts */}
      <CurrentBoosts 
        phaseAssignments={selectedAssignments}
        boostRoles={boostRoles}
        getRoleById={getRoleById}
        getPlayerById={getPlayerById}
        leagueId={leagueId}
        showCurrent={showCurrent}
        setShowCurrent={setShowCurrent}
        squadColor={squadColor}
        title={selectedPhase?.label ? `${selectedPhase.label} boosts` : 'Boost assignments'}
        subtitle={phaseSubtitle}
      />

      {/* Boost Planning */}
      {isOwnSquad && !isSquadEmpty && selectedPhase && isEditable && (
        <BoostSelection
          players={players}
          boostRoles={boostRoles}
          phaseAssignments={selectedAssignments}
          selectedPlayer={selectedPlayer}
          setSelectedPlayer={setSelectedPlayer}
          handleRoleAssignment={handleRoleAssignment}
          getPlayerById={getPlayerById}
          getRoleById={getRoleById}
          canAssignPlayerToRole={canAssignPlayerToRole}
          isPlayerAssigned={isPlayerAssigned}
          getPlayerRole={getPlayerRole}
          error={error}
          squadColor={squadColor}
          phaseLabel={selectedPhase?.label}
          phaseWindow={phaseWindow}
          lockAt={selectedPhase?.lockAt || selectedPhase?.lock_at}
          isEditable={isEditable}
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
