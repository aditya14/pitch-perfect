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

const BREAKDOWN_OPTIONS = [20, 30, 40, 50];

const SortableRow = ({ player, index, leagueId }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };
  const { openPlayerModal } = usePlayerModal();

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${
        isDragging ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
      } hover:bg-gray-50 dark:hover:bg-gray-700`}
    >
      <td className="w-8 pl-4" {...attributes} {...listeners}>
        <svg
          className="w-4 h-4 text-gray-400"
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
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
        {index + 1}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
        <button 
          onClick={() => openPlayerModal(player.id, leagueId)}
          className="text-blue-600 hover:underline"
        >
          {player.name}
        </button>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
        {player.team}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
        {roleMap[player.role] || player.role}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">
        {player.avg_points?.toFixed(1) ?? '-'}
      </td>
    </tr>
  );
};

const DraftList = ({ players, draftOrder, onSaveOrder }) => {
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [breakdownCount, setBreakdownCount] = useState(20);

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

    // Get top N players based on draft order
    const topNPlayers = draftOrder.order
      .slice(0, breakdownCount)
      .map(id => players.find(p => p.id === id))
      .filter(Boolean);

    // Role breakdown
    const roleBreakdown = topNPlayers.reduce((acc, player) => {
      acc[player.role] = (acc[player.role] || 0) + 1;
      return acc;
    }, {});

    // Team breakdown
    const teamBreakdown = topNPlayers.reduce((acc, player) => {
      acc[player.team] = (acc[player.team] || 0) + 1;
      return acc;
    }, {});

    return {
      roles: roleBreakdown,
      teams: teamBreakdown
    };
  }, [draftOrder?.order, players, breakdownCount]);

  // Helper function to get percentage
  const getPercentage = (count) => {
    return ((count / breakdownCount) * 100).toFixed(1);
  };

  if (!draftOrder?.order) return null;

  const orderedPlayers = draftOrder.order.map(id => getPlayerById(id)).filter(Boolean);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6">
        {/* Breakdown Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Show Breakdown of Top
            </label>
            <select
              value={breakdownCount}
              onChange={(e) => setBreakdownCount(Number(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
            >
              {BREAKDOWN_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <span className="text-sm text-gray-700 dark:text-gray-300">Players</span>
          </div>

          {breakdownStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Role Breakdown */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Role Distribution
                </h3>
                <div className="space-y-2">
                  {Object.entries(breakdownStats.roles).map(([role, count]) => (
                    <div key={role} className="flex items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-24">
                        {roleMap[role] || role}
                      </span>
                      <div className="flex-1 mx-4">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                          <div
                            className="h-2 bg-indigo-600 rounded-full"
                            style={{ width: `${getPercentage(count)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-20">
                        {count} ({getPercentage(count)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Breakdown */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Team Distribution
                </h3>
                <div className="space-y-2">
                  {Object.entries(breakdownStats.teams).map(([team, count]) => (
                    <div key={team} className="flex items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-24">
                        {team}
                      </span>
                      <div className="flex-1 mx-4">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                          <div
                            className="h-2 bg-indigo-600 rounded-full"
                            style={{ width: `${getPercentage(count)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-20">
                        {count} ({getPercentage(count)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
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
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="w-8"></th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Draft Order
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Name
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      IPL Team
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Role
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      2021-24 Avg
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                <SortableContext
                  items={orderedPlayers.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedPlayers.map((player, index) => (
                    <SortableRow
                      key={player.id}
                      player={player}
                      index={index}
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

const roleMap = {
  'BAT': 'Batter',
  'BOWL': 'Bowler',
  'ALL': 'All-Rounder',
  'WK': 'Wicket Keeper'
};

export default DraftList;