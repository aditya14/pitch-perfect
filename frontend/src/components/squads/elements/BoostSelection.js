import React, { useMemo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, Lock, Search, X } from 'lucide-react';
import { getRoleIcon } from '../../../utils/roleUtils';

const formatLockTime = (lockAt) => {
  if (!lockAt) return null;
  const lockDate = new Date(lockAt);
  if (Number.isNaN(lockDate.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(lockDate);
};

const BoostSelection = ({
  players,
  boostRoles,
  phaseAssignments,
  handleRoleAssignment,
  getPlayerById,
  canAssignPlayerToRole,
  error,
  squadColor,
  phaseLabel,
  phaseWindow,
  lockAt,
  isEditable
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const currentPlayers = useMemo(
    () => (players || []).filter(player => !player.status || player.status === 'current'),
    [players]
  );

  const assignmentMap = useMemo(() => {
    const map = new Map();
    (phaseAssignments || []).forEach(assignment => {
      map.set(assignment.boost_id, assignment.player_id);
    });
    return map;
  }, [phaseAssignments]);

  const playerRoleMap = useMemo(() => {
    const map = new Map();
    (phaseAssignments || []).forEach(assignment => {
      map.set(assignment.player_id, assignment.boost_id);
    });
    return map;
  }, [phaseAssignments]);

  const roles = boostRoles || [];

  useEffect(() => {
    if (!selectedRoleId && roles.length) {
      const firstUnassigned = roles.find(role => !assignmentMap.has(role.id));
      setSelectedRoleId((firstUnassigned || roles[0]).id);
    }
  }, [selectedRoleId, roles, assignmentMap]);

  const selectedRole = roles.find(role => role.id === selectedRoleId);
  const assignedCount = roles.filter(role => assignmentMap.has(role.id)).length;
  const lockTime = formatLockTime(lockAt);

  const teams = useMemo(() => {
    return [...new Set(currentPlayers.map(player => player.current_team?.name).filter(Boolean))].sort();
  }, [currentPlayers]);

  const filteredPlayers = useMemo(() => {
    if (!selectedRole) return [];
    return currentPlayers
      .filter(player => {
        if (teamFilter !== 'all' && player.current_team?.name !== teamFilter) return false;
        if (searchQuery && !player.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return canAssignPlayerToRole(player, selectedRole.id);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentPlayers, teamFilter, searchQuery, selectedRole, canAssignPlayerToRole]);

  useEffect(() => {
    if (!isGuideOpen) return undefined;

    const scrollY = window.scrollY;
    const original = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = original.overflow;
      document.body.style.position = original.position;
      document.body.style.top = original.top;
      document.body.style.width = original.width;
      window.scrollTo(0, scrollY);
    };
  }, [isGuideOpen]);

  const formatMultipliers = (multipliers) => {
    if (!multipliers) return {};

    if (Object.values(multipliers).every(val => val === 2)) {
      return { simplified: '2x All', multiplier: 2 };
    }
    if (Object.values(multipliers).every(val => val === 1.5)) {
      return { simplified: '1.5x All', multiplier: 1.5 };
    }

    const grouped = { '1.5': [], '2': [] };
    Object.entries(multipliers).forEach(([key, value]) => {
      if (value === 1.5) {
        grouped['1.5'].push(key);
      } else if (value === 2) {
        grouped['2'].push(key);
      }
    });

    return grouped;
  };

  const formatStatName = (stat) => {
    return stat
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white dark:bg-neutral-950 shadow rounded-lg overflow-hidden">
      <div className="p-4 md:p-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Let's set your boosts for {phaseLabel || 'the upcoming phase'}
            </h2>
            {phaseWindow && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {phaseWindow}
              </div>
            )}
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              Changes save automatically.
            </div>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200"
            >
              <Info className="h-4 w-4" />
              Learn how boosts work
            </button>
          </div>
          <div className="flex flex-col gap-2 min-w-[220px]">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {assignedCount} of {roles.length} boosts assigned
            </div>
            <div className="flex items-center gap-2 text-xs">
              {isEditable ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200 px-2 py-1">
                  <Check className="h-3 w-3" />
                  Open for edits
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 px-2 py-1">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              )}
              {lockTime && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Locks {lockTime}
                </span>
              )}
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-4 bg-red-100 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-900 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {!isEditable && (
          <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            Boosts are locked for this phase. You can review assignments but cannot edit them.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 p-4 md:p-6">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Boost roles</h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {assignedCount}/{roles.length}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
            {roles.map(role => {
              const assignedPlayerId = assignmentMap.get(role.id);
              const assignedPlayer = assignedPlayerId ? getPlayerById(assignedPlayerId) : null;
              const isSelected = role.id === selectedRoleId;
              const isAssigned = Boolean(assignedPlayer);

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`text-left rounded-lg border px-3 py-3 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-500/10'
                      : isAssigned
                        ? 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                        : 'border-amber-200 bg-amber-50/30 dark:border-amber-500/30 dark:bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-black ring-1 ring-neutral-200 dark:ring-neutral-800 flex items-center justify-center">
                      {getRoleIcon(role.name, 18, squadColor)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                        {role.name}
                      </div>
                    </div>
                    <span
                      className={`ml-auto h-2.5 w-2.5 rounded-full ${
                        isAssigned
                          ? 'bg-emerald-500'
                          : 'bg-amber-400'
                      }`}
                      title={isAssigned ? 'Assigned' : 'Needs assignment'}
                    />
                  </div>
                  <div className="mt-2">
                    {assignedPlayer ? (
                      <div className="text-md font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                        {assignedPlayer.name}
                      </div>
                    ) : (
                      <div className="h-2 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search players"
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 py-2 pl-9 pr-3 text-sm text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500/60"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200"
              >
                <option value="all">All teams</option>
                {teams.map(team => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedRole && (
            <div className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
              Select a boost role to start assigning players.
            </div>
          )}

          {selectedRole && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Selecting for {selectedRole.name}
                  {selectedRole.allowed_player_types?.length ? (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
                      ({selectedRole.allowed_player_types.join(', ')})
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {filteredPlayers.length} players
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredPlayers.map(player => {
                  const assignedRoleId = playerRoleMap.get(player.id);
                  const assignedRole = roles.find(role => role.id === assignedRoleId);
                  const assignedHere = assignedRoleId === selectedRole.id;
                  const assignedElsewhere = assignedRoleId && assignedRoleId !== selectedRole.id;
                  const isActionDisabled = !isEditable || assignedElsewhere;

                  return (
                    <button
                      type="button"
                      disabled={isActionDisabled || assignedHere}
                      onClick={() => {
                        if (!isActionDisabled) {
                          handleRoleAssignment(selectedRole.id, player.id);
                        }
                      }}
                      key={player.id}
                      className={`relative min-w-0 rounded-lg border px-2.5 py-2.5 text-left transition-all ${
                        assignedHere
                          ? 'border-primary-400 bg-primary-50/60 dark:bg-primary-500/10'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-primary-300 hover:bg-primary-50/40 dark:hover:bg-primary-500/10'
                      } ${isActionDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {assignedRole && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 dark:bg-black/70 ring-1 ring-neutral-200/80 dark:ring-neutral-800/80 shadow-sm flex items-center justify-center">
                          {getRoleIcon(assignedRole.name, 14, squadColor)}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {player.name}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {player.role} - {player.current_team?.name || 'No team'}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredPlayers.length === 0 && (
                  <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No players match these filters.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isGuideOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 lg-modal-backdrop"
            onClick={() => setIsGuideOpen(false)}
            aria-label="Close boost guide"
          />
          <div className="relative w-full max-w-4xl lg-modal bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white p-6 md:p-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  How boosts work
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Each boost multiplies specific stats for the selected player.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="rounded-full p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map(role => {
                const formattedMultipliers = formatMultipliers(role.multipliers);
                return (
                  <div
                    key={role.id}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 flex items-center justify-center bg-white dark:bg-black rounded-full shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800">
                        {getRoleIcon(role.name, 18, squadColor)}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-neutral-800 dark:text-neutral-200">
                          {role.name}
                        </div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                          {role.allowed_player_types.join(', ')}
                        </div>
                      </div>
                    </div>

                    {formattedMultipliers.simplified ? (
                      <div className="text-xs font-medium">
                        <span
                          className={
                            formattedMultipliers.multiplier === 2
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }
                        >
                          {formattedMultipliers.simplified}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {formattedMultipliers['2'] && formattedMultipliers['2'].length > 0 && (
                          <div className="text-xs">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-block w-8">2x:</span>
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {formattedMultipliers['2'].map(stat => formatStatName(stat)).join(', ')}
                            </span>
                          </div>
                        )}
                        {formattedMultipliers['1.5'] && formattedMultipliers['1.5'].length > 0 && (
                          <div className="text-xs">
                            <span className="text-blue-600 dark:text-blue-400 font-medium inline-block w-8">1.5x:</span>
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {formattedMultipliers['1.5'].map(stat => formatStatName(stat)).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BoostSelection;
