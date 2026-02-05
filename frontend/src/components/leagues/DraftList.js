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

const SortableRow = ({ player, index, leagueId, canEdit, highlightState, searchTerm, selectedTeam }) => {
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
          : isHighlighted
            ? 'bg-amber-50 dark:bg-amber-900/20'
            : 'bg-white dark:bg-neutral-800'
      } ${isDimmed ? 'opacity-45' : ''} hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors`}
    >
      <td className="w-8 pl-4" {...attributes} {...listeners}>
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

const DraftList = ({ players, draftOrder, onSaveOrder, leagueId, canEdit = true }) => {
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [breakdownCount, setBreakdownCount] = useState(20);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleDragEnd = async (event) => {
    if (!canEdit) return;

    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = draftOrder.order.indexOf(active.id);
    const newIndex = draftOrder.order.indexOf(over.id);
    
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newOrder = arrayMove(draftOrder.order, oldIndex, newIndex);
    
    setSaving(true);
    setSaveError(null);

    try {
      await onSaveOrder(newOrder);
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

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow">
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
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-neutral-700 border-slate-300 hover:bg-slate-100 dark:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-600 dark:hover:bg-neutral-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Players</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search players or team..."
                className="h-10 w-full lg:w-64 px-3 rounded-md border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100 dark:placeholder:text-neutral-400"
              />
              {(searchTerm || selectedTeam) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTeam(null);
                  }}
                  className="h-10 px-3 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
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
                <tr className="bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600">
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
