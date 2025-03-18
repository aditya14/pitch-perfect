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
import { X, Info, RefreshCw, Search, Eye, EyeOff, Check, GripVertical, CheckSquare, Square } from 'lucide-react';
import { usePlayerModal } from '../../../context/PlayerModalContext';

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

const CountdownTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
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
      } catch (error) {
        console.error("Error calculating time left:", error);
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: false
        };
      }
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

  // Function to safely format 2-digit numbers with leading zero
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "00";
    return num < 10 ? `0${num}` : `${num}`;
  };

  return (
    <div className="text-sm flex items-center gap-2 font-semibold whitespace-nowrap">
      <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse"></span>
      <span className="whitespace-nowrap">Draft order locks in:</span>
      <div className="flex gap-2">
        <div className="w-11 text-center">
          <span className="font-mono font-bold w-6 inline-block text-right">{formatNumber(timeLeft.days)}</span>
          <span className="text-gray-500 text-xs ml-1">d</span>
        </div>
        <div className="w-11 text-center">
          <span className="font-mono font-bold w-6 inline-block text-right">{formatNumber(timeLeft.hours)}</span>
          <span className="text-gray-500 text-xs ml-1">h</span>
        </div>
        <div className="w-11 text-center">
          <span className="font-mono font-bold w-6 inline-block text-right">{formatNumber(timeLeft.minutes)}</span>
          <span className="text-gray-500 text-xs ml-1">m</span>
        </div>
        <div className="w-11 text-center">
          <span className="font-mono font-bold w-6 inline-block text-right">{formatNumber(timeLeft.seconds)}</span>
          <span className="text-gray-500 text-xs ml-1">s</span>
        </div>
      </div>
    </div>
  );
};

// Compact countdown for smaller screens
const CompactCountdownTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
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
      } catch (error) {
        console.error("Error calculating time left:", error);
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: false
        };
      }
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
      <div className="text-red-600 font-medium flex items-center">
        <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse mr-1.5"></span>
        Locked
      </div>
    );
  }

  // Format time as days:hours:minutes:seconds safely
  const formatTime = () => {
    const pad = (num) => {
      if (num === undefined || num === null) return "00";
      return num < 10 ? `0${num}` : `${num}`;
    };
    return `${pad(timeLeft.days)}:${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  };

  return (
    <div className="text-sm flex items-center font-mono">
      <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse mr-1.5"></span>
      <span className="font-medium whitespace-nowrap">{formatTime()}</span>
    </div>
  );
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
  isMultiSelectMode
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

  // Only show checkboxes in multi-select mode
  const showCheckbox = isMultiSelectMode;

  return (
    <tr
      ref={setNodeRef}
      style={{
        ...style,
        pointerEvents: isDragging ? 'none' : undefined,
      }}
      className={`${
        isDragging 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 z-50' 
          : isSelected 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
            : 'bg-white dark:bg-gray-800'
      } hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 select-none touch-manipulation text-xs sm:text-sm`}
    >
      <td className="pl-2 pr-2 sm:pr-0 py-2 sm:py-3 sticky left-0 bg-inherit z-10 select-none flex items-center gap-1">
        {/* Grip handle */}
        <div 
          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 cursor-grab active:cursor-grabbing"
          {...attributes} 
          {...listeners}
        >
          <GripVertical className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
        </div>
        
        {/* Checkbox (only shown in multi-select mode) */}
        {showCheckbox && (
          <button 
            className="ml-1 flex items-center justify-center focus:outline-none"
            onClick={() => onSelectPlayer(player.id)}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-500" />
            ) : (
              <Square className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
      </td>
      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white sticky left-8 sm:left-10 bg-inherit z-10 select-none text-left">
        {index + 1}
      </td>
      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-white select-none text-left">
        <button 
          onClick={() => openPlayerModal(player.id, leagueId)}
          className="text-blue-600 dark:text-blue-400 hover:underline select-none"
        >
          {player.name}
        </button>
      </td>
      {columnVisibility.avgPoints && (
        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white text-left sm:text-right select-none">
          {player.avg_points?.toFixed(1) ?? '-'}
        </td>
      )}
      {columnVisibility.team && (
        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white text-left select-none">
          {player.team}
        </td>
      )}
      {columnVisibility.role && (
        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white text-left select-none">
          {player.role}
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

const LoadingPlaceholder = () => (
  <div className="animate-pulse space-y-6 w-full">
    {/* Header placeholder */}
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
    
    {/* Stats placeholders */}
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/3">
        <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>
      </div>
      <div className="lg:w-2/3">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // For multi-select feature
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  const tableRef = useRef(null);
  const tableContainerRef = useRef(null);
  const draftDeadline = new Date('2025-03-21T14:00:00Z'); // March 21, 2025 10:00 AM ET
  const isMobile = useRef(window.innerWidth < 1024);

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
    setSelectedPlayers(prev => {
      // If player is already selected, remove them from selection
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } 
      // Otherwise add to selection
      return [...prev, playerId];
    });
  }, []);

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

  if (!isOpen) return null;
  
  // Format the ordered players
  const orderedPlayers = draftOrder?.order
    ? draftOrder.order.map(id => getPlayerById(id)).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-7xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Update Draft Order
          </h2>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Show success message or countdown */}
            {saveSuccess ? (
              <div className="text-green-600 font-medium flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>Updated successfully</span>
              </div>
            ) : (
              <>
                {/* Show compact countdown on mobile, full countdown on larger screens */}
                <div className="hidden sm:block">
                  <CountdownTimer deadline={draftDeadline} />
                </div>
                <div className="sm:hidden">
                  <CompactCountdownTimer deadline={draftDeadline} />
                </div>
              </>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              {/* Info Card */}
              <div className="my-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
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
                    <p className="text-sm text-blue-700 dark:text-blue-200 mt-2">
                      <strong>New:</strong> You can now select multiple players using the checkboxes and move them together!
                    </p>
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
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
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
                    <div className="h-4 border-r border-gray-300 dark:border-gray-600"></div>
                    
                    <button
                      onClick={clearSelections}
                      disabled={selectedPlayers.length === 0}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        selectedPlayers.length === 0
                          ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Clear Selection
                    </button>
                    
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
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
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:flex lg:flex-col">
                    {/* Top section - controls */}
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
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                    {/* Visual indicator for dragging mode */}
                    {isDragging && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 text-xs flex items-center justify-center text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800">
                        <span>Reordering... release to drop player</span>
                      </div>
                    )}
                    
                    <div 
                      ref={tableContainerRef} 
                      className={`overflow-auto ${isDragging ? 'bg-gray-50 dark:bg-gray-900/40' : ''}`}
                      style={{ 
                        transition: 'background-color 0.2s ease',
                        maxHeight: '60vh',
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
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr className="border-b border-gray-200 dark:border-gray-600">
                              <th className="pl-2 pr-2 sm:pr-0 py-2 sm:py-3 sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">
                                {isMultiSelectMode && (
                                  <div className="flex items-center">
                                    <button 
                                      onClick={clearSelections}
                                      className="ml-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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
                              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left sticky left-8 sm:left-10 bg-gray-50 dark:bg-gray-700 z-10">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                  Rank
                                </span>
                              </th>
                              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                  Name
                                </span>
                              </th>
                              {columnVisibility.avgPoints && (
                                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left sm:text-right">
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                    Avg Pts
                                  </span>
                                </th>
                              )}
                              {columnVisibility.team && (
                                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                    IPL Team
                                  </span>
                                </th>
                              )}
                              {columnVisibility.role && (
                                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                    Role
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
                                  selectedPlayers={selectedPlayers}
                                  onSelectPlayer={handleSelectPlayer}
                                  isMultiSelectMode={isMultiSelectMode}
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

export default DraftOrderModal;