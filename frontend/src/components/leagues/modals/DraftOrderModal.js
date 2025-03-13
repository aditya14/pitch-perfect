import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { X, Info, RefreshCw, Search, Eye, EyeOff } from 'lucide-react';
import { usePlayerModal } from '../../../context/PlayerModalContext';

const BREAKDOWN_OPTIONS = [20, 30, 40, 50];

const CountdownTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(deadline) - new Date();
      
      if (difference <= 0) {
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
  }, [deadline]);

  if (timeLeft.expired) {
    return (
      <div className="text-red-600 font-medium flex items-center gap-1.5">
        <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse"></span>
        Draft order locked
      </div>
    );
  }

  return (
    <div className="text-sm flex items-center gap-2 font-semibold">
      <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse"></span>
      Draft order locks in:
      <div className="flex gap-2">
        <div>
          <span className="font-bold">{timeLeft.days}</span>
          <span className="text-gray-500 text-xs ml-1">d</span>
        </div>
        <div>
          <span className="font-bold">{timeLeft.hours}</span>
          <span className="text-gray-500 text-xs ml-1">h</span>
        </div>
        <div>
          <span className="font-bold">{timeLeft.minutes}</span>
          <span className="text-gray-500 text-xs ml-1">m</span>
        </div>
        <div>
          <span className="font-bold">{timeLeft.seconds}</span>
          <span className="text-gray-500 text-xs ml-1">s</span>
        </div>
      </div>
    </div>
  );
};

const SortableRow = ({ player, index, leagueId, columnVisibility }) => {
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
        isDragging ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
      } hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700`}
    >
      <td className="w-10 pl-4 py-3 sticky left-0 bg-inherit z-10" {...attributes} {...listeners}>
        <div className="flex items-center justify-center">
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
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white sticky left-10 bg-inherit z-10">
        {index + 1}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
        <button 
          onClick={() => openPlayerModal(player.id, leagueId)}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {player.name}
        </button>
      </td>
      {columnVisibility.team && (
        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
          {player.team}
        </td>
      )}
      {columnVisibility.role && (
        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
          {roleMap[player.role] || player.role}
        </td>
      )}
      {columnVisibility.avgPoints && (
        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
          {player.avg_points?.toFixed(1) ?? '-'}
        </td>
      )}
    </tr>
  );
};

// Enhanced breakdown card component
const BreakdownCard = ({ title, items, getPercentage }) => (
  <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
      {title}
    </h3>
    <div className="space-y-4">
      {Object.entries(items).map(([key, count]) => (
        <div key={key}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {key === 'BAT' ? 'Batter' : 
               key === 'BOWL' ? 'Bowler' : 
               key === 'ALL' ? 'All-Rounder' : 
               key === 'WK' ? 'Wicket Keeper' : key}
            </span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {count} ({getPercentage(count)}%)
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                title.includes('Role') 
                  ? 'bg-purple-500 dark:bg-purple-600' 
                  : 'bg-blue-500 dark:bg-blue-600'
              }`}
              style={{ width: `${getPercentage(count)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DraftOrderModal = ({ 
  isOpen, 
  onClose, 
  leagueId, 
  players, 
  fetchDraftOrder, 
  saveDraftOrder, 
  draftOrder,
  isLoading,
  saveError
}) => {
  const [breakdownCount, setBreakdownCount] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(null);
  const [columnVisibility, setColumnVisibility] = useState({
    team: true,
    role: true,
    avgPoints: true
  });
  const tableRef = useRef(null);
  
  const draftDeadline = "2025-03-21T04:30:00Z";  // March 21, 2025 10:00 AM IST

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Adjust this to make dragging more responsive on mobile
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // This helps distinguish between a tap and a drag on mobile
        tolerance: 5, // Slight tolerance for unintentional movement
      }
    })
  );

  // Get player by ID helper
  const getPlayerById = useCallback((id) => {
    return players.find(p => p.id === id);
  }, [players]);

  // Drag end handler
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
    await saveDraftOrder(newOrder);
  };

  // Toggle column visibility
  const toggleColumn = (column) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
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

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim() || !draftOrder?.order) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = draftOrder.order
      .map(id => getPlayerById(id))
      .filter(player => 
        player && (
          player.name.toLowerCase().includes(query) || 
          player.team.toLowerCase().includes(query) ||
          (roleMap[player.role] || player.role).toLowerCase().includes(query)
        )
      )
      .map(player => player.id);

    setSearchResults(results);
    
    // Select the first result if we have any
    if (results.length > 0) {
      setSelectedPlayerIndex(0);
    } else {
      setSelectedPlayerIndex(null);
    }
  }, [searchQuery, draftOrder?.order, getPlayerById]);

  // Scroll to selected player
  useEffect(() => {
    if (selectedPlayerIndex !== null && searchResults.length > 0 && tableRef.current) {
      const playerId = searchResults[selectedPlayerIndex];
      const playerIndex = draftOrder.order.indexOf(playerId);
      
      // Find the row element
      const rows = tableRef.current.querySelectorAll('tbody tr');
      if (rows[playerIndex]) {
        rows[playerIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedPlayerIndex, searchResults, draftOrder?.order]);

  // Navigate through search results
  const navigateSearchResults = (direction) => {
    if (!searchResults.length) return;
    
    if (direction === 'next') {
      setSelectedPlayerIndex(prev => 
        prev === null || prev >= searchResults.length - 1 ? 0 : prev + 1
      );
    } else {
      setSelectedPlayerIndex(prev => 
        prev === null || prev <= 0 ? searchResults.length - 1 : prev - 1
      );
    }
  };

  // Helper function to get percentage
  const getPercentage = (count) => {
    return ((count / breakdownCount) * 100).toFixed(1);
  };

  if (!isOpen) return null;
  
  // Format the ordered players
  const orderedPlayers = draftOrder?.order
    ? draftOrder.order.map(id => getPlayerById(id)).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-7xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Update Draft Order
          </h2>
          
          <div className="flex items-center gap-4">
            <CountdownTimer deadline={draftDeadline} />
            
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Info Card */}
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                  How the Draft Works
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Players are ranked by default using historical data (average points per game from 2021-2024). 
                  Drag and drop players to reorder them according to your preference. 
                  When the draft begins, the system will select the highest-ranked available player from your list.
                </p>
              </div>
            </div>
          </div>
          
          {/* Main Content - 2 Column Layout on Desktop */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Statistics Breakdown */}
            <div className="lg:w-1/3 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Top Player Breakdown:
                  </label>
                  <select
                    value={breakdownCount}
                    onChange={(e) => setBreakdownCount(Number(e.target.value))}
                    className="rounded-md border-gray-300 shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  >
                    {BREAKDOWN_OPTIONS.map(option => (
                      <option key={option} value={option}>{option} Players</option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mb-4">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span>Auto-refreshes as you reorder</span>
                </div>

                {breakdownStats && (
                  <div className="space-y-6">
                    <BreakdownCard 
                      title="Role Distribution" 
                      items={breakdownStats.roles} 
                      getPercentage={getPercentage} 
                    />
                    
                    <BreakdownCard 
                      title="Team Distribution" 
                      items={breakdownStats.teams} 
                      getPercentage={getPercentage} 
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Column - Reorder Table */}
            <div className="lg:w-2/3">
              {/* Search Bar - Sticky at the top */}
              <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 mb-4 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players, teams, or roles..."
                    className="block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                      <button
                        onClick={() => navigateSearchResults('prev')}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => navigateSearchResults('next')}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <span className="text-xs text-gray-500">
                        {selectedPlayerIndex !== null ? selectedPlayerIndex + 1 : 0}/{searchResults.length}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Column Visibility - Clear labeling for what they do */}
                <div className="flex flex-wrap gap-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 pr-2 flex items-center">
                    <span>Show/Hide:</span>
                  </div>
                  <button
                    onClick={() => toggleColumn('team')}
                    className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                      columnVisibility.team 
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {columnVisibility.team ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    Team
                  </button>
                  <button
                    onClick={() => toggleColumn('role')}
                    className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                      columnVisibility.role 
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {columnVisibility.role ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    Role
                  </button>
                  <button
                    onClick={() => toggleColumn('avgPoints')}
                    className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                      columnVisibility.avgPoints 
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {columnVisibility.avgPoints ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    Avg Points
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : saveError ? (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-900 dark:text-red-300 rounded-lg">
                  {saveError}
                </div>
              ) : null}

              {/* Player List Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="overflow-x-auto max-h-[50vh] sm:max-h-[60vh]">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <table className="w-full border-collapse" ref={tableRef}>
                      <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="w-10 sticky left-0 bg-gray-50 dark:bg-gray-700 z-10"></th>
                          <th className="px-4 py-3 text-left sticky left-10 bg-gray-50 dark:bg-gray-700 z-10">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Rank
                            </span>
                          </th>
                          <th className="px-4 py-3 text-left">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Name
                            </span>
                          </th>
                          {columnVisibility.team && (
                            <th className="px-4 py-3 text-left">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                IPL Team
                              </span>
                            </th>
                          )}
                          {columnVisibility.role && (
                            <th className="px-4 py-3 text-left">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Role
                              </span>
                            </th>
                          )}
                          {columnVisibility.avgPoints && (
                            <th className="px-4 py-3 text-right">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                2021-24 Avg
                              </span>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
                              columnVisibility={columnVisibility}
                            />
                          ))}
                        </SortableContext>
                      </tbody>
                    </table>
                  </DndContext>
                </div>
              </div>
            </div>
          </div>
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

export default DraftOrderModal;