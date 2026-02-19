// DraftList.js
import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlayerModal } from '../../context/PlayerModalContext';

const BREAKDOWN_OPTIONS = [
  { value: 20, label: 'Top 20' },
  { value: 35, label: 'Top 35' },
  { value: 50, label: 'Top 50' },
  { value: 'ALL', label: 'All' },
];
const ENABLE_PLAYER_PROFILE_LINK = false;

const getHighlightParts = (value, searchTerm) => {
  if (!value || !searchTerm) return null;
  const source = String(value);
  const lowerSource = source.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();
  const start = lowerSource.indexOf(lowerSearch);
  if (start === -1) return null;
  return {
    before: source.slice(0, start),
    match: source.slice(start, start + searchTerm.length),
    after: source.slice(start + searchTerm.length),
  };
};

const SortableRow = ({
  player,
  index,
  leagueId,
  canEdit,
  highlightState,
  searchTerm,
  selectedTeam,
  isMultiSelectMode,
  isSelected,
  onSelectPlayer,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };
  const { openPlayerModal } = usePlayerModal();
  const highlightedName = getHighlightParts(player.name, searchTerm);
  const isHighlighted = highlightState === 'highlighted';
  const isDimmed = highlightState === 'dimmed';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${
        isDragging
          ? 'bg-neutral-50 dark:bg-neutral-700'
          : isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20'
          : isHighlighted
            ? 'bg-amber-50 dark:bg-amber-900/20'
            : 'bg-white dark:bg-neutral-800'
      } ${isDimmed ? 'opacity-45' : ''} hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors`}
    >
      <td className="w-8 pl-4">
        <div className="flex items-center gap-1">
          {isMultiSelectMode && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectPlayer(player.id);
              }}
              className={`h-4 w-4 rounded border ${
                isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-700'
              }`}
              aria-label={isSelected ? `Deselect ${player.name}` : `Select ${player.name}`}
            >
              {isSelected && (
                <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 011.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          )}
          <div {...attributes} {...listeners}>
        <svg
          className={`w-4 h-4 ${canEdit ? 'text-neutral-400' : 'text-neutral-300 dark:text-neutral-600'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
        {index + 1}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {ENABLE_PLAYER_PROFILE_LINK ? (
          <button
            onClick={() => openPlayerModal(player.id, leagueId)}
            className="text-blue-600 hover:underline"
          >
            {highlightedName ? (
              <>
                {highlightedName.before}
                <mark className="bg-amber-200/70 dark:bg-amber-500/30 px-0.5 rounded-sm">{highlightedName.match}</mark>
                {highlightedName.after}
              </>
            ) : (
              player.name
            )}
          </button>
        ) : (
          <span>
            {highlightedName ? (
              <>
                {highlightedName.before}
                <mark className="bg-amber-200/70 dark:bg-amber-500/30 px-0.5 rounded-sm">{highlightedName.match}</mark>
                {highlightedName.after}
              </>
            ) : (
              player.name
            )}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
        <span className={selectedTeam && selectedTeam === player.team ? 'font-semibold text-amber-700 dark:text-amber-300' : ''}>
          {player.team}
        </span>
      </td>
      {/* <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 text-right">
        {player.avg_points?.toFixed(1) ?? '-'}
      </td> */}
    </tr>
  );
};

const DraftList = ({ players, draftOrder, onSaveOrder, leagueId, canEdit = true, liquidGlass = false }) => {
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [breakdownCount, setBreakdownCount] = useState(20);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor)
  );

  const getPlayerById = (id) => {
    return players.find(p => p.id === id);
  };

  const handleSelectPlayer = (playerId) => {
    if (!isMultiSelectMode) return;
    setSelectedPlayers((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const toggleMultiSelect = () => {
    setIsMultiSelectMode((prev) => {
      if (prev) setSelectedPlayers([]);
      return !prev;
    });
  };

  const handleDragEnd = async (event) => {
    if (!canEdit) return;

    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const normalizeId = (id) => (typeof id === 'string' ? Number(id) : id);
    const activeId = normalizeId(active.id);
    const overId = normalizeId(over.id);
    const currentOrder = (draftOrder.order || []).map(normalizeId);
    const selectedSet = new Set(selectedPlayers.map(normalizeId));
    const isGroupedMove = selectedSet.size > 0 && selectedSet.has(activeId);

    let newOrder = currentOrder;
    if (isGroupedMove) {
      const movingIds = currentOrder.filter((id) => selectedSet.has(id));
      const orderWithoutMoving = currentOrder.filter((id) => !selectedSet.has(id));
      const insertIndex = orderWithoutMoving.indexOf(overId);
      if (!movingIds.length || insertIndex === -1) return;
      newOrder = [
        ...orderWithoutMoving.slice(0, insertIndex + 1),
        ...movingIds,
        ...orderWithoutMoving.slice(insertIndex + 1),
      ];
    } else {
      const oldIndex = currentOrder.indexOf(activeId);
      const newIndex = currentOrder.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;
      newOrder = arrayMove(currentOrder, oldIndex, newIndex);
    }
    
    setSaving(true);
    setSaveError(null);

    try {
      await onSaveOrder(newOrder);
      if (isGroupedMove) {
        setSelectedPlayers([]);
      }
    } catch (err) {
      setSaveError('Failed to save draft order. Changes will be lost if you leave the page.');
    } finally {
      setSaving(false);
    }
  };

  // Memoized breakdown calculations
  const breakdownStats = useMemo(() => {
    if (!draftOrder?.order) return null;
    const allTeams = Array.from(
      new Set(players.map((player) => player.team || 'Unknown'))
    ).sort((a, b) => a.localeCompare(b));
    const limit = breakdownCount === 'ALL'
      ? draftOrder.order.length
      : Number(breakdownCount);

    // Get top N players based on draft order
    const topNPlayers = draftOrder.order
      .slice(0, limit)
      .map(id => players.find(p => p.id === id))
      .filter(Boolean);

    // Team breakdown
    const teamBreakdown = allTeams.reduce((acc, team) => {
      acc[team] = 0;
      return acc;
    }, {});

    topNPlayers.forEach((player) => {
      const teamName = player.team || 'Unknown';
      teamBreakdown[teamName] = (teamBreakdown[teamName] || 0) + 1;
    });

    return {
      teams: teamBreakdown
    };
  }, [draftOrder?.order, players, breakdownCount]);

  if (!draftOrder?.order) return null;

  const orderedPlayers = draftOrder.order.map(id => getPlayerById(id)).filter(Boolean);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const hasHighlightFilters = Boolean(normalizedSearch || selectedTeam);
  const highlightedPlayerIds = new Set(
    orderedPlayers
      .filter((player) => {
        const teamMatch = !selectedTeam || player.team === selectedTeam;
        const searchMatch = !normalizedSearch || `${player.name} ${player.team || ''}`.toLowerCase().includes(normalizedSearch);
        return teamMatch && searchMatch;
      })
      .map((player) => player.id)
  );
  const highlightedCount = highlightedPlayerIds.size;
  const teamEntries = breakdownStats
    ? Object.entries(breakdownStats.teams).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    : [];

  const containerClasses = liquidGlass
    ? 'lg-glass lg-rounded-xl border border-white/20 dark:border-neutral-700/40 shadow-lg'
    : 'bg-white dark:bg-neutral-800 rounded-lg shadow';
  const optionActiveClasses = liquidGlass
    ? 'lg-glass-secondary text-primary-600 dark:text-primary-300 border-white/20 dark:border-white/10'
    : 'bg-primary-600 text-white border-primary-600';
  const optionInactiveClasses = liquidGlass
    ? 'lg-glass-tertiary text-slate-700 dark:text-slate-300 border-white/20 dark:border-neutral-600 hover:text-primary-600 dark:hover:text-primary-300'
    : 'bg-white text-neutral-700 border-slate-300 hover:bg-slate-100 dark:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-600 dark:hover:bg-neutral-600';
  const utilityButtonClasses = liquidGlass
    ? 'h-10 px-3 text-xs font-medium lg-rounded-md border border-white/20 dark:border-neutral-600 lg-glass-tertiary text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-300'
    : 'h-10 px-3 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600';
  const tableHeaderClasses = liquidGlass
    ? 'bg-white/35 dark:bg-neutral-700/50 border-b border-white/30 dark:border-neutral-600'
    : 'bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600';

  return (
    <div className={containerClasses}>
      <div className="p-6">
        {/* Breakdown Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Team Distribution of
              </span>
              {BREAKDOWN_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setBreakdownCount(option.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                    breakdownCount === option.value
                      ? optionActiveClasses
                      : optionInactiveClasses
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Players</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMultiSelect}
                disabled={!canEdit}
                className={`h-10 px-3 text-xs font-medium rounded-md border ${
                  isMultiSelectMode
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-200'
                    : liquidGlass
                      ? 'lg-glass-tertiary text-slate-700 dark:text-slate-200 border-white/20 dark:border-neutral-600 hover:text-primary-600 dark:hover:text-primary-300'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'
                } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Multi-select
              </button>
              {isMultiSelectMode && selectedPlayers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPlayers([])}
                  className={utilityButtonClasses}
                >
                  Clear ({selectedPlayers.length})
                </button>
              )}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search players or team..."
                className={`h-10 w-full lg:w-64 px-3 rounded-md border shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                  liquidGlass
                    ? 'border-white/25 dark:border-neutral-600 bg-white/65 dark:bg-neutral-700/70 text-slate-900 dark:text-neutral-100 placeholder:text-slate-500 dark:placeholder:text-neutral-400'
                    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100 dark:placeholder:text-neutral-400'
                }`}
              />
              {(searchTerm || selectedTeam) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTeam(null);
                  }}
                  className={utilityButtonClasses}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {breakdownStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Team Breakdown */}
              <div className="md:col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2">
                  {teamEntries.map(([team, count]) => {
                    const visibleBlocks = Math.min(count, 8);
                    return (
                      <button
                        key={team}
                        onClick={() => setSelectedTeam((prev) => (prev === team ? null : team))}
                        className={`rounded-md border p-1.5 text-left transition ${
                          selectedTeam === team
                            ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
                            : liquidGlass
                              ? 'border-white/25 bg-white/45 hover:border-white/40 dark:border-neutral-700 dark:bg-neutral-800/70 dark:hover:border-neutral-500'
                              : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate pr-2">
                            {team}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                            {count}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-0.5">
                          {Array.from({ length: visibleBlocks }).map((_, idx) => (
                            <span
                              key={`${team}-block-${idx}`}
                              className={`h-1 w-2.5 rounded-sm ${
                                selectedTeam === team ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-600'
                              }`}
                            />
                          ))}
                          {count > visibleBlocks && (
                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">+{count - visibleBlocks}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {hasHighlightFilters && (
            <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
              Highlighting {highlightedCount} of {orderedPlayers.length} players
              {selectedTeam ? ` | Team: ${selectedTeam}` : ''}
              {normalizedSearch ? ` | Search: "${searchTerm}"` : ''}
            </p>
          )}
          {isMultiSelectMode && canEdit && (
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              Select multiple players, then drag one selected row to move the group together.
            </p>
          )}
        </div>

        {!canEdit && (
          <div className="mb-4 p-4 bg-amber-100 border border-amber-300 text-amber-800 rounded relative">
            Draft window is currently locked. You can review your rankings but cannot edit them right now.
          </div>
        )}
        {saveError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded relative">
            {saveError}
          </div>
        )}

        {saving && (
          <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded relative">
            Saving changes...
          </div>
        )}

        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className={tableHeaderClasses}>
                  <th className="w-8"></th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Draft Order
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Name
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Team
                    </span>
                  </th>
                  {/* <th className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      2021-24 Avg
                    </span>
                  </th> */}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-600">
                <SortableContext
                  items={orderedPlayers.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedPlayers.map((player, index) => (
                    <SortableRow
                      key={player.id}
                      player={player}
                      index={index}
                      leagueId={leagueId}
                      canEdit={canEdit}
                      searchTerm={normalizedSearch}
                      selectedTeam={selectedTeam}
                      isMultiSelectMode={isMultiSelectMode}
                      isSelected={selectedPlayers.includes(player.id)}
                      onSelectPlayer={handleSelectPlayer}
                      highlightState={
                        hasHighlightFilters
                          ? (highlightedPlayerIds.has(player.id) ? 'highlighted' : 'dimmed')
                          : 'default'
                      }
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export default DraftList;
