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

const RunningTotalChart = ({
  league,
  selectedSquadIds,
  selectedTimeFrame,
  includeBoost = true
}) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leadingSquad, setLeadingSquad] = useState(null);
  const [highestScore, setHighestScore] = useState({ value: 0, squad: null, match: null });
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    if (league?.id && league?.season?.id) {
      fetchRunningTotalData();
    }
  }, [league?.id, league?.season?.id, selectedTimeFrame, includeBoost, selectedSquadIds]);

  const fetchRunningTotalData = async () => {
    try {
      setLoading(true);
      // Fetch running total data from the API
      const response = await api.get(`/leagues/${league.id}/stats/running-total`, {
        params: {
          squads: selectedSquadIds.join(','),
          timeFrame: selectedTimeFrame,
          includeBoost: includeBoost
        }
      });

      // Defensive: ensure array and structure
      let data = Array.isArray(response.data) ? response.data : [];
      data = data.filter(d => d && typeof d === 'object' && d.matchData);

      setChartData(data);

      // Extract insights from data
      if (data.length > 0) {
        calculateInsights(data);
      }
    } catch (err) {
      console.error('Failed to fetch running total data:', err);
      setError('Failed to load running total data');
    } finally {
      setLoading(false);
    }
  };

  const calculateInsights = (data) => {
    if (!data || data.length === 0 || !league?.squads) return;

    const lastDataPoint = data[data.length - 1];
    let maxTotal = 0;
    let leaderId = null;

    let highestMatchScore = 0;
    let highestScoreSquadId = null;
    let highestScoreMatch = null;

    selectedSquadIds.forEach(squadId => {
      const squadKey = `squad_${squadId}`;

      if (lastDataPoint[squadKey] > maxTotal) {
        maxTotal = lastDataPoint[squadKey];
        leaderId = squadId;
      }

      data.forEach((matchData, index) => {
        if (index === 0) return;

        const prevMatchData = data[index - 1];
        const currentPoints = matchData[squadKey];
        const prevPoints = prevMatchData[squadKey];
        const matchPoints = currentPoints - prevPoints;

        if (matchPoints > highestMatchScore) {
          highestMatchScore = matchPoints;
          highestScoreSquadId = squadId;
          highestScoreMatch = matchData.match_name || `Match ${matchData.name}`;
        }
      });
    });

    if (leaderId) {
      const leaderSquad = league.squads.find(s => s.id === leaderId);
      setLeadingSquad(leaderSquad || { id: leaderId, name: 'Unknown Squad' });
    }

    if (highestScoreSquadId) {
      const highScoreSquad = league.squads.find(s => s.id === highestScoreSquadId);
      setHighestScore({
        value: highestMatchScore.toFixed(1),
        squad: highScoreSquad || { id: highestScoreSquadId, name: 'Unknown Squad' },
        match: highestScoreMatch
      });
    }
  };

  const getSquadColor = (dataKey) => {
    const squadId = parseInt(dataKey.replace('squad_', ''));
    const squad = league?.squads?.find(s => s.id === squadId);

    if (squad?.color) {
      return squad.color;
    }

    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];

    const squadIndex = league?.squads?.findIndex(s => s.id === squadId) || 0;
    return colors[squadIndex % colors.length];
  };

  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const visibleSquads = {};
  league?.squads?.forEach(squad => {
    if (selectedSquadIds.includes(squad.id)) visibleSquads[squad.id] = true;
  });

  const prepareChartData = () => {
    if (!chartData || chartData.length === 0) return [];
    const processedData = JSON.parse(JSON.stringify(chartData));
    
    processedData.forEach(dataPoint => {
      league?.squads?.forEach(squad => {
        if (selectedSquadIds.includes(squad.id)) {
          // Convert squad.id to string to match the keys in matchData
          const squadIdStr = String(squad.id);
          const squadData = dataPoint.matchData?.[squadIdStr];
          
          if (squadData) {
            // Use the running total from the nested matchData
            dataPoint[`squad_${squad.id}`] = squadData.runningTotal;
          } else {
            // Fallback to direct property or set to 0
            dataPoint[`squad_${squad.id}`] = dataPoint[`squad_${squad.id}`] || 0;
          }
        }
      });
    });
    
    return processedData;
  };

  const getFilteredData = () => prepareChartData();

  const getYAxisTicks = () => {
    const dataToConsider = getFilteredData();
    if (!dataToConsider || dataToConsider.length === 0) return [0];
    let minValue = Infinity;
    let maxValue = -Infinity;
    dataToConsider.forEach(data => {
      league?.squads?.forEach(squad => {
        if (visibleSquads[squad.id]) {
          const value = data[`squad_${squad.id}`] || 0;
          if (value < minValue) minValue = value;
          if (value > maxValue) maxValue = value;
        }
      });
    });
    if (minValue === Infinity) minValue = 0;
    if (maxValue === -Infinity) maxValue = 0;
    const ticks = [];
    const roundedMax = Math.ceil(maxValue / 1000) * 1000;
    const roundedMin = Math.min(0, Math.floor(minValue / 1000) * 1000);
    for (let i = roundedMin; i <= roundedMax; i += 1000) {
      ticks.push(i);
    }
    if (ticks.length === 0 || (ticks.every(t => t < 0) && !ticks.includes(0))) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    return [...new Set(ticks)].sort((a, b) => a - b);
  };

  const getMinorYAxisTicks = () => {
    const majorTicks = getYAxisTicks();
    const minorTicks = [];
    if (majorTicks.length < 2) return [];
    const interval = 250;
    const steps = 3;
    for (let i = 0; i < majorTicks.length - 1; i++) {
      const start = majorTicks[i];
      const end = majorTicks[i + 1];
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
    return [...new Set(minorTicks)].sort((a, b) => a - b);
  };

  const yAxisDomain = () => {
    const ticks = getYAxisTicks();
    if (!ticks || ticks.length === 0) return [0, 1000];
    return [ticks[0], ticks[ticks.length - 1]];
  };

  const majorGridStyles = {
    stroke: isDarkMode ? '#4b5563' : '#d1d5db',
    opacity: isDarkMode ? 0.4 : 0.5,
  };
  const minorGridStyles = {
    stroke: isDarkMode ? '#374151' : '#e5e7eb',
    opacity: isDarkMode ? 0.3 : 0.5,
    strokeDasharray: "2 6",
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const matchName = payload[0]?.payload?.match_name || `Match ${label}`;
      const matchDate = payload[0]?.payload?.date || '';
      const matchData = payload[0]?.payload?.matchData || {};
      const visibleEntries = payload
        .filter(entry => {
          const squadId = parseInt(entry.dataKey.replace('squad_', ''));
          return selectedSquadIds.includes(squadId);
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
              // Use squad info from matchData if available, else fallback to league.squads
              const squadMatchData = matchData[squadId] || { matchPoints: 0, squad: null };
              const squad = squadMatchData.squad || league.squads.find(s => s.id === squadId);
              return (
                <div key={index} className="flex items-center justify-between gap-2">
                  <div className="flex items-center">
                    <div
                      className="h-3 w-3 rounded-full mr-1"
                      style={{ backgroundColor: squad?.color || entry.stroke }}
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
                      (+{squadMatchData.matchPoints?.toFixed(1) ?? '0.0'})
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="space-y-4">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-1/4"></div>
          <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <p className="text-neutral-500 dark:text-neutral-400 text-center">
          No match data available to display running totals.
        </p>
      </div>
    );
  }

  const minorTickValues = getMinorYAxisTicks();

  return (
    <div className="bg-white dark:bg-neutral-950 shadow rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
      {leadingSquad && (
        <div className="flex flex-wrap justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Points Progression
          </h3>
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline flex items-center"
          >
            {showInsights ? 'Hide Insights' : 'Show Insights'}
            <svg
              className={`ml-1 w-4 h-4 transform transition-transform ${showInsights ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
      )}

      {showInsights && leadingSquad && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center">
              <div
                className="w-4 h-10 rounded-full mr-3"
                style={{ backgroundColor: leadingSquad.color || '#808080' }}
              ></div>
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Current Leader
                </p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {leadingSquad.name}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center">
              <div
                className="w-4 h-10 rounded-full mr-3"
                style={{ backgroundColor: highestScore.squad?.color || '#808080' }}
              ></div>
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Highest Match Score
                </p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {highestScore.value} pts
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {highestScore.squad?.name} ({highestScore.match})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={getFilteredData()}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={majorGridStyles.stroke}
              opacity={majorGridStyles.opacity}
              horizontal={true}
              vertical={false}
            />
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
              dataKey="name"
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
              tick={{ fill: isDarkMode ? '#9ca3af' : '#4B5563', fontSize: 10 }}
              tickLine={{ stroke: isDarkMode ? '#6B7280' : '#6B7280' }}
              ticks={getYAxisTicks()}
              domain={yAxisDomain()}
              allowDataOverflow={false}
              allowDecimals={false}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />
            {league?.squads?.map((squad) =>
              selectedSquadIds.includes(squad.id) && (
                <Line
                  key={squad.id}
                  type="monotone"
                  dataKey={`squad_${squad.id}`}
                  name={squad.name}
                  stroke={getSquadColor(`squad_${squad.id}`)}
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                  dot={true}
                />
              )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RunningTotalChart;