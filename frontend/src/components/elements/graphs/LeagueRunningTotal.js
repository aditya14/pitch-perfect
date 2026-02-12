import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import api from '../../../utils/axios';

const LeagueRunningTotal = ({ league }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleSquads, setVisibleSquads] = useState({});
  const [viewMode, setViewMode] = useState('zoomed'); // 'zoomed' or 'all'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const Wrapper = ({ children }) => (
    <div className="lg-glass lg-rounded-xl p-4 relative z-0">
      {children}
    </div>
  );

  const hasSeasonStarted = (() => {
    const status = (league?.season?.status || '').toUpperCase();
    const startDateRaw = league?.season?.start_date;
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const now = new Date();
    if (startDate && !Number.isNaN(startDate.getTime())) {
      return now >= startDate;
    }
    return status !== 'UPCOMING';
  })();

  useEffect(() => {
    if (league?.id) {
      // Initialize all squads as visible
      const initialVisibility = {};
      league.squads.forEach(squad => {
        initialVisibility[squad.id] = true;
      });
      setVisibleSquads(initialVisibility);
      
      fetchRunningTotalData();
    }

    // Check for dark mode on mount and potentially on updates if theme can change dynamically
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();

    // Check for mobile on mount and on resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Optional: If theme can be toggled dynamically, observe class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect(); // Cleanup observer
      window.removeEventListener('resize', checkMobile);
    };

  }, [league?.id]);

  const fetchRunningTotalData = async () => {
    try {
      setLoading(true);
      
      // Use the optimized pre-computed stats endpoint
      // This replaces 70+ API calls with a single cached call
      const response = await api.get(`/leagues/${league.id}/stats/running-total/`);
      const runningTotalData = response.data;
      
      if (!runningTotalData || runningTotalData.length === 0) {
        setChartData([]);
        setError(null);
        setLoading(false);
        return;
      }

      // Data is already in the correct format from the backend
      setChartData(runningTotalData);
      
    } catch (err) {
      console.error('Failed to fetch running total data:', err);
      const errorMessage = err?.response?.data?.error || '';
      const isMissingStats = err?.response?.status === 404
        || errorMessage.toLowerCase().includes('fantasystats')
        || errorMessage.toLowerCase().includes('does not exist');

      if (isMissingStats) {
        setChartData([]);
        setError(null);
      } else {
        setError('Failed to load running total data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMatchNumber = (point, fallback) => {
    if (Number.isFinite(point?.match_number)) {
      return point.match_number;
    }

    if (Number.isFinite(point?.name)) {
      return point.name;
    }

    if (typeof point?.name === 'string') {
      const matchFromName = point.name.match(/(\d+)/);
      if (matchFromName) {
        return Number(matchFromName[1]);
      }
    }

    if (typeof point?.match_name === 'string') {
      const matchFromTitle = point.match_name.match(/match\s+#?(\d+)/i);
      if (matchFromTitle) {
        return Number(matchFromTitle[1]);
      }
    }

    return fallback;
  };

  const getMatchTimestamp = (point) => {
    if (!point?.date) return null;
    const timestamp = new Date(point.date).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  };

  const getSortedChartData = () => {
    const normalized = (chartData || []).map((point, idx) => ({
      ...point,
      _rawIndex: idx,
      _matchNumber: getMatchNumber(point, NaN),
      _timestamp: getMatchTimestamp(point),
    }));

    normalized.sort((a, b) => {
      const aHasMatchNumber = Number.isFinite(a._matchNumber);
      const bHasMatchNumber = Number.isFinite(b._matchNumber);
      if (aHasMatchNumber && bHasMatchNumber && a._matchNumber !== b._matchNumber) {
        return a._matchNumber - b._matchNumber;
      }

      const aHasTimestamp = Number.isFinite(a._timestamp);
      const bHasTimestamp = Number.isFinite(b._timestamp);
      if (aHasTimestamp && bHasTimestamp && a._timestamp !== b._timestamp) {
        return a._timestamp - b._timestamp;
      }

      if (a.match_id && b.match_id && a.match_id !== b.match_id) {
        return a.match_id - b.match_id;
      }

      return a._rawIndex - b._rawIndex;
    });

    return normalized.map((point, idx) => ({
      ...point,
      x_match_number: Number.isFinite(point._matchNumber) ? point._matchNumber : idx + 1,
    }));
  };

  // Get filtered data based on view mode
  const getFilteredData = () => {
    const sortedData = getSortedChartData();
    return (viewMode === 'all' || sortedData.length <= 10)
      ? sortedData
      : sortedData.slice(-10);
  };

  // Get squad color with fallback to predefined colors
  const getSquadColor = (squadId) => {
    const squad = league?.squads?.find(s => s.id === squadId);
    if (squad?.color) {
      return squad.color;
    }
    
    // Fallback colors
    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];
    
    // Get index of squad in league.squads
    const squadIndex = league?.squads?.findIndex(s => s.id === squadId) || 0;
    return colors[squadIndex % colors.length];
  };

  // Toggle squad visibility
  const toggleSquadVisibility = (squadId) => {
    setVisibleSquads(prev => ({
      ...prev,
      [squadId]: !prev[squadId]
    }));
  };

  // Select/deselect all squads
  const toggleAllSquads = (visible) => {
    const newVisibility = {};
    league.squads.forEach(squad => {
      newVisibility[squad.id] = visible;
    });
    setVisibleSquads(newVisibility);
  };

  // Get Y-axis tick values based on view mode
  const getYAxisTicks = () => {
    const dataToConsider = getFilteredData();
    if (!dataToConsider || dataToConsider.length === 0) return [0];

    let minValue = Infinity;
    let maxValue = -Infinity;

    dataToConsider.forEach(data => {
      league?.squads?.forEach(squad => {
        if (visibleSquads[squad.id]) { // Only consider visible squads
          const value = data[`squad_${squad.id}`] || 0;
          if (value < minValue) minValue = value;
          if (value > maxValue) maxValue = value;
        }
      });
    });
    
    // Handle case where no squads are visible or no data
    if (minValue === Infinity) minValue = 0;
    if (maxValue === -Infinity) maxValue = 0;

    const ticks = [];
    if (viewMode === 'all') {
      // For all view, ticks at 1000 intervals, starting from 0
      const roundedMax = Math.ceil(maxValue / 1000) * 1000;
      const roundedMin = Math.min(0, Math.floor(minValue / 1000) * 1000); 
      for (let i = roundedMin; i <= roundedMax; i += 1000) {
        ticks.push(i);
      }
    } else {
      // For zoomed view, ticks at 500 intervals
      const roundedMin = Math.floor(minValue / 500) * 500;
      const roundedMax = Math.ceil(maxValue / 500) * 500;
      for (let i = roundedMin; i <= roundedMax; i += 500) {
        ticks.push(i);
      }
    }
    // Ensure at least one tick (0) if range is empty or only negative
     if (ticks.length === 0 || (ticks.every(t => t < 0) && !ticks.includes(0))) {
       ticks.push(0);
       ticks.sort((a, b) => a - b); // Re-sort if 0 was added
     }
     // Remove duplicates and ensure sorted order
     return [...new Set(ticks)].sort((a, b) => a - b);
  };
  
  // Calculate minor gridlines for the y-axis
  const getMinorYAxisTicks = () => {
    const majorTicks = getYAxisTicks();
    const minorTicks = [];
    if (majorTicks.length < 2) return []; // Need at least two major ticks to draw minors between them

    const interval = viewMode === 'all' ? 250 : 100;
    const steps = viewMode === 'all' ? 3 : 4; // 3 minor lines for 1000 interval, 4 for 500 interval

    for (let i = 0; i < majorTicks.length - 1; i++) {
      const start = majorTicks[i];
      const end = majorTicks[i+1]; // End of the current major interval
      // Generate 'steps' minor ticks within this interval
      for (let j = 1; j <= steps; j++) {
        const tickValue = start + (j * interval);
        if (tickValue < end) { 
            minorTicks.push(tickValue);
        }
      }
    }
    const firstMajor = majorTicks[0];
    if (firstMajor > 0 && firstMajor % (interval * (steps + 1)) === 0) { 
        for (let j = 1; j <= steps; j++) {
            const tickValue = firstMajor - (j * interval);
            minorTicks.push(tickValue);
        }
    }

    return [...new Set(minorTicks)].sort((a, b) => a - b); // Remove duplicates and sort
  };

  // Calculate domain based on ticks to avoid extra space
  const yAxisDomain = () => {
    const ticks = getYAxisTicks();
    if (!ticks || ticks.length === 0) return [0, 1000]; // Default fallback
    return [ticks[0], ticks[ticks.length - 1]];
  };

  if (loading) {
    return (
      <Wrapper>
        <div className="space-y-4">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-1/4"></div>
          <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        </div>
      </Wrapper>
    );
  }

  if (error) {
    return (
      <Wrapper>
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </Wrapper>
    );
  }

  if (!hasSeasonStarted) {
    return null;
  }

  if (chartData.length === 0) {
    return (
      <Wrapper>
        <p className="text-neutral-500 dark:text-neutral-400">
          Running total will appear once points are on the board.
        </p>
      </Wrapper>
    );
  }

  // Custom tooltip to show squad point details
  const formatTooltipDate = (dateValue) => {
    if (!dateValue) return '';

    const dateObj = new Date(dateValue);
    if (!Number.isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    }

    // Handle pre-formatted backend values such as "Mon, Apr 07"
    const match = String(dateValue).match(/([A-Za-z]{3})\s+(\d{1,2})/);
    if (match) {
      return `${match[1]} ${String(match[2]).padStart(2, '0')}`;
    }

    return String(dateValue);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Get match name and date for this data point
      const matchName = payload[0]?.payload?.match_name || `Match ${label}`;
      const matchDate = formatTooltipDate(payload[0]?.payload?.date);
      const matchData = payload[0]?.payload?.matchData || {};
      
      // Filter for visible squads and sort by running total in descending order
      const visibleEntries = payload
        .filter(entry => {
          const squadId = parseInt(entry.dataKey.replace('squad_', ''));
          return visibleSquads[squadId];
        })
        .sort((a, b) => b.value - a.value);
      
      return (
        <div className="bg-white dark:bg-black p-3 border border-neutral-200 dark:border-neutral-700 shadow-lg rounded">
          <p className="font-medium text-neutral-900 dark:text-white">{matchName}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
            {matchDate}
          </p>
          <div className="space-y-1">
            {visibleEntries.map((entry, index) => {
              const squadId = parseInt(entry.dataKey.replace('squad_', ''));
              const squad = league.squads.find(s => s.id === squadId);
              const squadMatchData = matchData[squadId] || { matchPoints: 0 };
              
              return (
                <div key={index} className="flex items-center justify-between gap-2">
                  <div className="flex items-center">
                    <div
                      className="h-3 w-3 rounded-full mr-1"
                      style={{ backgroundColor: entry.stroke }}
                    ></div>
                    <span className="text-neutral-800 dark:text-neutral-200 text-sm">
                      {squad?.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-neutral-900 dark:text-white font-medium text-sm">
                      {entry.value.toFixed(1)}
                    </span>
                    <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">
                      (+{squadMatchData.matchPoints.toFixed(1)})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Get the calculated minor ticks once for rendering
  const minorTickValues = getMinorYAxisTicks();

  // Define gridline styles based on theme
  const majorGridStyles = {
    stroke: isDarkMode ? '#4b5563' : '#d1d5db', // Dark: gray-600, Light: gray-300
    opacity: isDarkMode ? 0.4 : 0.5,
  };
  const minorGridStyles = {
    stroke: isDarkMode ? '#374151' : '#e5e7eb', // Dark: gray-700, Light: gray-200
    opacity: isDarkMode ? 0.3 : 0.5,
    strokeDasharray: "2 6", // Adjusted dash array for subtlety
  };

  // Get dot size based on mobile status and view mode
  const getDotSize = () => {
    return (isMobile && viewMode === 'all') ? 0.5 : 2;
  };

  return (
    <Wrapper>
      <div className="py-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-caption font-semibold text-neutral-900 dark:text-white ml-2">
          Running Total
        </h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => setViewMode('zoomed')}
            className={`
              lg-button-secondary lg-rounded-md px-3 py-1 text-xs min-w-[90px]
              ${viewMode === 'zoomed' ? 'lg-button dark:text-white' : ''}
            `}
            tabIndex={0}
            type="button"
          >
            Last 10 Matches
          </button>
          <button 
            onClick={() => setViewMode('all')}
            className={`
              lg-button-secondary lg-rounded-md px-3 py-1 text-xs min-w-[90px]
              ${viewMode === 'all' ? 'lg-button dark:text-white' : ''}
            `}
            tabIndex={0}
            type="button"
          >
            All Matches
          </button>
        </div>
      </div>
      
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={getFilteredData()}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            {/* Draw major gridlines */}
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={majorGridStyles.stroke}
              opacity={majorGridStyles.opacity}
              horizontal={true}
              vertical={false}
            />
            
            {/* Draw minor gridlines using ReferenceLine - Conditional Styling */}
            {minorTickValues.map((tickValue) => (
              <ReferenceLine 
                key={`minor-${tickValue}`} 
                y={tickValue} 
                stroke={minorGridStyles.stroke}
                strokeDasharray={minorGridStyles.strokeDasharray}
                strokeOpacity={minorGridStyles.opacity}
              />
            ))}
            
            <XAxis 
              dataKey="x_match_number" 
              label={{ 
                value: 'Match', 
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: isDarkMode ? '#9ca3af' : '#4B5563' }
              }}
              tick={{ fill: isDarkMode ? '#9ca3af' : '#4B5563' }}
              tickLine={{ stroke: isDarkMode ? '#6B7280' : '#6B7280' }}
            />
            
            <YAxis 
              tick={{ fill: isDarkMode ? '#9ca3af' : '#4B5563', fontSize: 10 }} // Smaller font size for ticks
              tickLine={{ stroke: isDarkMode ? '#6B7280' : '#6B7280' }}
              ticks={getYAxisTicks()} // Use only major ticks for labels
              domain={yAxisDomain()} // Set domain based on calculated ticks
              allowDataOverflow={false} // Clip lines outside the domain
              allowDecimals={false} // Ensure integer labels
              interval={0} // Ensure interval is 0 to prevent skipping
            />
            <Tooltip content={<CustomTooltip />} />
            {league?.squads?.map((squad) => (
              visibleSquads[squad.id] && (
                <Line
                  key={squad.id}
                  type="monotone"
                  dataKey={`squad_${squad.id}`}
                  name={squad.name}
                  stroke={getSquadColor(squad.id)}
                  activeDot={{ r: 3 }}
                  strokeWidth={2}
                  dot={{ r: getDotSize() }}
                  isAnimationActive={false}
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Squad Filter Toggles */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {league?.squads?.map((squad) => (
          <button
            key={squad.id}
            className={`
              flex items-center w-full p-2 lg-glass-tertiary lg-rounded-md cursor-pointer transition-colors
              min-h-[36px] text-left
              ${visibleSquads[squad.id] 
                ? 'opacity-100' 
                : 'opacity-50 grayscale'}
              focus:lg-focus
            `}
            onClick={() => toggleSquadVisibility(squad.id)}
            tabIndex={0}
            type="button"
            aria-pressed={visibleSquads[squad.id]}
          >
            <span
              className={`
                h-3 w-3 rounded-full mr-2
                ${visibleSquads[squad.id] ? 'opacity-100' : 'opacity-30'}
              `}
              style={{ backgroundColor: getSquadColor(squad.id) }}
            />
            <span className="text-sm truncate">
              {squad.name}
            </span>
          </button>
        ))}
      </div>
      
      {/* Show/Hide All buttons */}
      <div className="mt-4 flex justify-center space-x-4">
        <button 
          onClick={() => toggleAllSquads(true)}
          className="lg-button-secondary lg-rounded-md px-3 py-1 text-sm min-w-[90px]"
          type="button"
        >
          Show All
        </button>
        <button 
          onClick={() => toggleAllSquads(false)}
          className="lg-button-secondary lg-rounded-md px-3 py-1 text-sm min-w-[90px]"
          type="button"
        >
          Hide All
        </button>
      </div>
      </div>
    </Wrapper>
  );
};

export default LeagueRunningTotal;
