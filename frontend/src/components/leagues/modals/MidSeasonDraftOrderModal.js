// frontend/src/components/leagues/modals/MidSeasonDraftOrderModal.js
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
import { 
  X, 
  Info, 
  Calendar,
  Users,
  Clock, 
  AlertTriangle,
  Check,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  GripVertical,
  CheckSquare,
  Square
} from 'lucide-react';
import { usePlayerModal } from '../../../context/PlayerModalContext';
// Using the correct path to the axios utility
import api from '../../../utils/axios';

const BREAKDOWN_OPTIONS = [20, 30, 40, 50];

// Custom TouchSensor for better mobile support - with custom activation area
const CustomTouchSensor = (options) => {
  return useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // Slight delay to differentiate from taps
      tolerance: 5,
      activationMode: 'lock', // Important: once dragging starts, it's locked in
    },
    ...options
  });
};

// Helper function to safely get transform CSS
const getTransformStyle = (transform) => {
  try {
    // Defensive checks to make sure all needed properties exist
    if (transform && CSS && CSS.Transform && typeof CSS.Transform.toString === 'function') {
      return CSS.Transform.toString(transform);
    }
    return '';
  } catch (error) {
    console.error('Error calculating transform:', error);
    return '';
  }
};

const SortableRow = ({ 
  player, 
  index, 
  leagueId, 
  columnVisibility, 
  selectedPlayers, 
  onSelectPlayer,
  isMultiSelectMode,
  isRetained
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: player.id,
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    }
  });

  const style = {
    transform: getTransformStyle(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    boxShadow: isDragging ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
  };
  
  const { openPlayerModal } = usePlayerModal();
  const isSelected = selectedPlayers.includes(player.id);

  // Only show checkboxes in multi-select mode and if not retained
  const showCheckbox = isMultiSelectMode && !isRetained;

  return (
    <tr
      ref={setNodeRef}
      style={{
        ...style,
        pointerEvents: isDragging ? 'none' : undefined,
      }}
      className={`${
        isRetained 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50'
          : isDragging 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 z-50' 
            : isSelected 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
              : 'bg-white dark:bg-neutral-800'
      } hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-700 select-none touch-manipulation text-xs sm:text-sm`}
    >
      <td className="pl-2 pr-2 sm:pr-0 py-2 sm:py-3 sticky left-0 bg-inherit z-10 select-none flex items-center gap-1">
        {/* Grip handle (only for non-retained players) */}
        {!isRetained ? (
          <div 
            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600 cursor-grab active:cursor-grabbing"
            {...attributes} 
            {...listeners}
          >
            <GripVertical className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-400" />
          </div>
        ) : (
          <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
          </div>
        )}
        
        {/* Checkbox (only shown in multi-select mode for non-retained players) */}
        {showCheckbox && (
          <button 
            className="ml-1 flex items-center justify-center focus:outline-none"
            onClick={() => onSelectPlayer(player.id)}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-500" />
            ) : (
              <Square className="w-4 h-4 text-neutral-400" />
            )}
          </button>
        )}
      </td>
      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-neutral-900 dark:text-white sticky left-8 sm:left-10 bg-inherit z-10 select-none text-left">
        {index + 1}
      </td>
      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white select-none text-left">
        <button 
          onClick={() => openPlayerModal(player.id, leagueId)}
          className="text-blue-600 dark:text-blue-400 hover:underline select-none"
        >
          {player.name}
        </button>
        {isRetained && (
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded">
            Retained
          </span>
        )}
      </td>
      {columnVisibility.avgPoints && (
        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-neutral-900 dark:text-white text-left sm:text-right select-none">
          {typeof player.avg_points === 'number' ? player.avg_points.toFixed(1) : '-'}
        </td>
      )}
      {columnVisibility.team && (
        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-neutral-900 dark:text-white text-left select-none">
          {player.team}
        </td>
      )}
      {columnVisibility.role && (
        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-neutral-900 dark:text-white text-left select-none">
          {player.role}
        </td>
      )}
    </tr>
  );
};

// Enhanced breakdown card component
const BreakdownCard = ({ title, items, getPercentage }) => (
  <div className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
      {title}
    </h3>
    <div className="space-y-4">
      {Object.entries(items).map(([key, count]) => (
        <div key={key}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {key === 'BAT' ? 'Batter' : 
               key === 'BOWL' ? 'Bowler' : 
               key === 'ALL' ? 'All-Rounder' : 
               key === 'WK' ? 'Wicket Keeper' : key}
            </span>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {count} ({getPercentage(count)}%)
            </span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
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

const LoadingPlaceholder = () => (
  <div className="animate-pulse space-y-6 w-full">
    {/* Header placeholder */}
    <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-4"></div>
    
    {/* Stats placeholders */}
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/3">
        <div className="bg-neutral-200 dark:bg-neutral-700 h-64 rounded-lg"></div>
      </div>
      <div className="lg:w-2/3">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded mb-4"></div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MidSeasonDraftOrderModal = ({ 
  isOpen, 
  onClose, 
  leagueId, 
  players, 
  fetchDraftOrder, 
  saveDraftOrder,
  draftOrder,
  isLoading,
  saveError,
  retainedPlayers = []
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // For multi-select feature
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
    percentComplete: 0
  });
  
  const tableRef = useRef(null);
  const tableContainerRef = useRef(null);
  const draftDeadline = new Date('2025-04-22T13:00:00Z'); // April 22, 2025 1:00 PM UTC
  const isMobile = useRef(window.innerWidth < 1024);

  // Combine retained players with draft order
  const retainedPlayerIds = useMemo(() => 
    new Set(retainedPlayers.map(player => player.id)), 
    [retainedPlayers]
  );

  // Configure sensors with modified behavior - modified for better scrolling
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Different settings based on device
        distance: isMobile.current ? 8 : 4,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    CustomTouchSensor({
      // Mobile-specific touch settings
      activationConstraint: {
        delay: isMobile.current ? 200 : 150,
        tolerance: isMobile.current ? 8 : 5,
      }
    })
  );

  // Get player by ID helper
  const getPlayerById = useCallback((id) => {
    return players.find(p => p.id === id);
  }, [players]);

  // Handle selection of player for multi-select
  const handleSelectPlayer = useCallback((playerId) => {
    // Don't allow selection of retained players
    if (retainedPlayerIds.has(playerId)) return;

    setSelectedPlayers(prev => {
      // If player is already selected, remove them from selection
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } 
      // Otherwise add to selection
      return [...prev, playerId];
    });
  }, [retainedPlayerIds]);

  // Toggle multi-select mode
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(prev => !prev);
    // Clear selection when exiting multi-select mode
    if (isMultiSelectMode) {
      setSelectedPlayers([]);
    }
  };

  // Handle clear all selections
  const clearSelections = () => {
    setSelectedPlayers([]);
  };

  // Handle drag start - disable scrolling
  const handleDragStart = (event) => {
    // Don't allow dragging retained players
    if (retainedPlayerIds.has(event.active.id)) {
      event.cancel();
      return;
    }

    setIsDragging(true);
    // Only disable scrolling on mobile
    if (isMobile.current && tableContainerRef.current) {
      tableContainerRef.current.style.overflow = 'hidden';
    }
  };

  // Drag end handler
  const handleDragEnd = async (event) => {
    setIsDragging(false);
    // Only re-enable scrolling on mobile
    if (isMobile.current && tableContainerRef.current) {
      tableContainerRef.current.style.overflow = 'auto';
    }
    
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    // Convert IDs to numbers if they're strings
    const activeId = typeof active.id === 'string' ? parseInt(active.id, 10) : active.id;
    const overId = typeof over.id === 'string' ? parseInt(over.id, 10) : over.id;
    
    // Make sure the draftOrder.order array contains numbers, not strings
    const currentOrder = draftOrder.order.map(id => 
      typeof id === 'string' ? parseInt(id, 10) : id
    );
    
    try {
      setIsSaving(true);
      
      let newOrder;
      
      if (selectedPlayers.length > 0 && selectedPlayers.includes(activeId)) {
        // Multi-select drag logic
        const selectedIds = selectedPlayers.map(id => 
          typeof id === 'string' ? parseInt(id, 10) : id
        );
        
        // First, remove all selected items from the array
        let orderWithoutSelected = currentOrder.filter(id => !selectedIds.includes(id));
        
        // Find the target position (where overId is now located in the filtered array)
        const targetPosition = orderWithoutSelected.indexOf(overId);
        
        if (targetPosition === -1) {
          console.error("Target position not found after filtering");
          setIsSaving(false);
          return;
        }
        
        // Insert all selected items at the target position
        newOrder = [
          ...orderWithoutSelected.slice(0, targetPosition + 1),
          ...selectedIds,
          ...orderWithoutSelected.slice(targetPosition + 1)
        ];
        
        // If the overId is also in selectedIds, we need to remove its duplicate
        if (selectedIds.includes(overId)) {
          newOrder = newOrder.filter((id, index) => 
            id !== overId || index === targetPosition
          );
        }
      } else {
        // Single item drag logic - original behavior
        const oldIndex = currentOrder.indexOf(activeId);
        const newIndex = currentOrder.indexOf(overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          // Create a new array by moving the item
          newOrder = [...currentOrder];
          const [removed] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, removed);
        } else {
          console.error("Could not find indexes:", { oldIndex, newIndex });
          setIsSaving(false);
          return;
        }
      }
      
      // Verify the arrays have the same length
      if (newOrder.length !== currentOrder.length) {
        console.error("Order length mismatch:", { 
          originalLength: currentOrder.length,
          newLength: newOrder.length,
          originalOrder: currentOrder,
          newOrder: newOrder
        });
        setIsSaving(false);
        return;
      }
      
      // Save the new order
      await saveDraftOrder(newOrder);
      
      // Clear selections after successful move
      setSelectedPlayers([]);
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsSaving(false);
    } catch (error) {
      console.error("Error updating draft order:", error);
      setIsSaving(false);
    }
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

    // Get top N players based on draft order, excluding retained players
    const topNPlayers = draftOrder.order
      .filter(id => !retainedPlayerIds.has(id))
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
  }, [draftOrder?.order, players, breakdownCount, retainedPlayerIds]);

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
  
  // Adjust table container height on resize
  useEffect(() => {
    if (!isOpen) return;
    
    const adjustTableHeight = () => {
      if (tableContainerRef.current) {
        // On desktop, allow the table to extend fully
        if (window.innerWidth >= 1024) { // lg breakpoint
          tableContainerRef.current.style.maxHeight = 'none';
        } else {
          // On mobile, limit height
          tableContainerRef.current.style.maxHeight = '60vh';
        }
      }
    };
    
    // Run once and add resize listener
    adjustTableHeight();
    window.addEventListener('resize', adjustTableHeight);
    
    return () => window.removeEventListener('resize', adjustTableHeight);
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    // Calculate total seconds between now and deadline for progress calculation
    const calculateTotalInitialSeconds = () => {
      // Start counting 7 days before deadline as 0%
      const startDate = new Date(draftDeadline);
      startDate.setDate(startDate.getDate() - 7);
      const now = new Date();
      return Math.max(0, Math.floor((draftDeadline - startDate) / 1000));
    };

    const totalInitialSeconds = calculateTotalInitialSeconds();

    const calculateTimeLeft = () => {
      try {
        const now = new Date();
        const difference = new Date(draftDeadline) - now;
        
        if (difference <= 0) {
          return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            expired: true,
            percentComplete: 100
          };
        }

        // Calculate percentage complete (inverted, since we want progress toward deadline)
        const startDate = new Date(draftDeadline);
        startDate.setDate(startDate.getDate() - 7);
        const elapsedSeconds = Math.floor((now - startDate) / 1000);
        const percentComplete = Math.min(100, Math.max(0, (elapsedSeconds / totalInitialSeconds) * 100));

        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          expired: false,
          percentComplete: percentComplete
        };
      } catch (error) {
        console.error("Error calculating time left:", error);
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: false,
          percentComplete: 0
        };
      }
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [draftDeadline]);

  // Function to safely format 2-digit numbers with leading zero
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "00";
    return num < 10 ? `0${num}` : `${num}`;
  };

  // Determine color based on time remaining
  const getProgressColor = () => {
    if (timeLeft.days >= 3) return "bg-emerald-500 dark:bg-emerald-600";
    if (timeLeft.days >= 1) return "bg-yellow-500 dark:bg-yellow-600";
    return "bg-red-500 dark:bg-red-600";
  };

  if (!isOpen) return null;
  
  // Format the ordered players
  const orderedPlayers = draftOrder?.order
    ? draftOrder.order.map(id => getPlayerById(id)).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-7xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-2 sm:p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
            Mid-Season Draft Order
          </h2>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Show success message or countdown */}
            {saveSuccess ? (
              <div className="text-green-600 font-medium flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>Updated successfully</span>
              </div>
            ) : (
              <div className="flex flex-col items-end">
                <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Draft closes in:
                </div>
                <div className="flex items-center text-sm font-semibold text-neutral-900 dark:text-white">
                  <span className="font-mono">{formatNumber(timeLeft.days)}d {formatNumber(timeLeft.hours)}h {formatNumber(timeLeft.minutes)}m</span>
                </div>
              </div>
            )}
            
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-2 flex-1 overflow-y-auto">
          {isLoading && !draftOrder ? (
            <LoadingPlaceholder />
          ) : (
            <>
              {/* Draft Timeline - Condensed for mid-season */}
              <div className="my-4 bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Mid-Season Draft Timeline
                </h3>
                
                <div className="relative border-l-2 border-blue-300 dark:border-blue-700 ml-3 pl-4 pb-1">
                  <div className="mb-4 relative">
                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-7 top-0 border-2 border-white dark:border-neutral-800"></div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="font-medium text-blue-600 dark:text-blue-400">April 19-22:</span> Rank non-retained players for the mid-season draft
                    </p>
                  </div>
                  
                  <div className="mb-4 relative">
                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-7 top-0 border-2 border-white dark:border-neutral-800"></div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="font-medium text-blue-600 dark:text-blue-400">April 22:</span> Draft closes at 6:30 PM IST, selections automatically processed
                    </p>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-7 top-0 border-2 border-white dark:border-neutral-800"></div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="font-medium text-blue-600 dark:text-blue-400">April 22-26:</span> Set up your Week 6 boosts with your new squad
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="my-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                      How the Mid-Season Draft Works
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Your Week 5 core squad players are automatically retained for the second half of the season. 
                      Reorder the remaining available players according to your preference. 
                      When the draft executes, the system will select the highest-ranked available player from your list.
                    </p>
                    {retainedPlayers.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Your retained players ({retainedPlayers.length}):
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {retainedPlayers.map(player => (
                            <span key={player.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {player.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Multi-select controls */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={toggleMultiSelectMode}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    isMultiSelectMode 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700' 
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {isMultiSelectMode ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {isMultiSelectMode ? 'Exit Multi-Select' : 'Enable Multi-Select'}
                </button>
                
                {isMultiSelectMode && (
                  <>
                    <div className="h-4 border-r border-neutral-300 dark:border-neutral-600"></div>
                    
                    <button
                      onClick={clearSelections}
                      disabled={selectedPlayers.length === 0}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        selectedPlayers.length === 0
                          ? 'bg-neutral-100 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500 cursor-not-allowed'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                      }`}
                    >
                      Clear Selection
                    </button>
                    
                    <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                      <span className="font-medium mr-1">{selectedPlayers.length}</span>
                      {selectedPlayers.length === 1 ? "player" : "players"} selected
                    </div>
                  </>
                )}
              </div>
              
              {/* Main Content - 2 Column Layout on Desktop */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Statistics Breakdown */}
                <div className="lg:w-1/3 space-y-6">
                  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 overflow-hidden p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:flex lg:flex-col">
                    {/* Top section - controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Top Player Breakdown:
                      </label>
                      <select
                        value={breakdownCount}
                        onChange={(e) => setBreakdownCount(Number(e.target.value))}
                        className="rounded-md border-neutral-300 shadow-sm bg-white dark:bg-neutral-700 dark:border-neutral-600 text-neutral-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                      >
                        {BREAKDOWN_OPTIONS.map(option => (
                          <option key={option} value={option}>{option} Players</option>
                        ))}
                      </select>
                    </div>

                    <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center mb-4">
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      <span>Auto-refreshes as you reorder</span>
                    </div>

                    {/* Scrollable content area */}
                    {breakdownStats && (
                      <div className="lg:overflow-y-auto lg:flex-1 lg:pb-4">
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
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right Column - Reorder Table */}
                <div className="lg:w-2/3">
                  {/* Search Bar - Sticky at the top */}
                  <div className="sticky top-0 z-20 bg-white dark:bg-neutral-800 mb-4 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search players, teams, or roles..."
                        className="block w-full pl-10 pr-12 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                          <button
                            onClick={() => navigateSearchResults('prev')}
                            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigateSearchResults('next')}
                            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <span className="text-xs text-neutral-500">
                            {selectedPlayerIndex !== null ? selectedPlayerIndex + 1 : 0}/{searchResults.length}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Column Visibility - Clear labeling for what they do */}
                    <div className="flex flex-wrap gap-2">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 pr-2 flex items-center">
                        <span>Show/Hide:</span>
                      </div>
                      <button
                        onClick={() => toggleColumn('avgPoints')}
                        className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                          columnVisibility.avgPoints 
                            ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300' 
                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {columnVisibility.avgPoints ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        Avg
                      </button>
                      <button
                        onClick={() => toggleColumn('team')}
                        className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                          columnVisibility.team 
                            ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300' 
                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {columnVisibility.team ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        Team
                      </button>
                      <button
                        onClick={() => toggleColumn('role')}
                        className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                          columnVisibility.role 
                            ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300' 
                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {columnVisibility.role ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        Role
                      </button>
                    </div>
                  </div>
                  
                  {isSaving ? (
                    <div className="flex justify-center items-center h-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : saveError ? (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-900 dark:text-red-300 rounded-lg">
                      {saveError}
                    </div>
                  ) : null}

                  {/* Player List Table */}
                  <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow overflow-hidden">
                    {/* Visual indicator for dragging mode */}
                    {isDragging && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 text-xs flex items-center justify-center text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800">
                        <span>Reordering... release to drop player</span>
                      </div>
                    )}
                    
                    <div 
                      ref={tableContainerRef} 
                      className={`overflow-auto ${isDragging ? 'bg-neutral-50 dark:bg-neutral-900/40' : ''}`}
                      style={{ 
                        transition: 'background-color 0.2s ease',
                        maxHeight: '70vh',
                      }}
                    >
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        autoScroll={{
                          enabled: true,
                          speed: 800,
                          threshold: {
                            x: 0,
                            y: 0.2
                          }
                        }}
                      >
                        <table className="w-full border-collapse" ref={tableRef}>
                          <thead className="bg-neutral-50 dark:bg-neutral-700">
                            <tr className="border-b border-neutral-200 dark:border-neutral-600">
                              <th className="pl-2 pr-2 sm:pr-0 py-2 sm:py-3 sticky left-0 bg-neutral-50 dark:bg-neutral-700 z-10">
                                {isMultiSelectMode && (
                                  <div className="flex items-center">
                                    <button 
                                      onClick={clearSelections}
                                      className="ml-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                                      title="Clear all selections"
                                    >
                                      {selectedPlayers.length > 0 ? (
                                        <CheckSquare className="w-4 h-4 text-blue-500" />
                                      ) : (
                                        <Square className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </th>
                              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left sticky left-8 sm:left-10 bg-neutral-50 dark:bg-neutral-700 z-10">
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                                  Rank
                                </span>
                              </th>
                              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                                  Name
                                </span>
                              </th>
                              {columnVisibility.avgPoints && (
                                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left sm:text-right">
                                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                                    Avg
                                  </span>
                                </th>
                              )}
                              {columnVisibility.team && (
                                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                                    Team
                                  </span>
                                </th>
                              )}
                              {columnVisibility.role && (
                                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                                    Role
                                  </span>
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
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
                                  selectedPlayers={selectedPlayers}
                                  onSelectPlayer={handleSelectPlayer}
                                  isMultiSelectMode={isMultiSelectMode}
                                  isRetained={retainedPlayerIds.has(player.id)}
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
            </>
          )}
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

export default MidSeasonDraftOrderModal;