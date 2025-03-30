import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import api from '../../../utils/axios';

const LeagueRunningTotal = ({ league }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleSquads, setVisibleSquads] = useState({});

  useEffect(() => {
    if (league?.id && league?.season?.id) {
      // Initialize all squads as visible
      const initialVisibility = {};
      league.squads.forEach(squad => {
        initialVisibility[squad.id] = true;
      });
      setVisibleSquads(initialVisibility);
      
      fetchRunningTotalData();
    }
  }, [league?.id, league?.season?.id]);

  const fetchRunningTotalData = async () => {
    try {
      setLoading(true);
      
      // Fetch all completed matches for the season
      const matchesResponse = await api.get(`/seasons/${league.season.id}/matches/`);
      const matches = matchesResponse.data
        .filter(match => match.status === 'COMPLETED' || match.status === 'LIVE')
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (matches.length === 0) {
        setChartData([]);
        setLoading(false);
        return;
      }

      // Initialize data structure for chart
      const chartDataPoints = [];
      
      // Process each match sequentially
      for (const match of matches) {
        try {
          // Fetch match standings data (using the new endpoint)
          const standingsResponse = await api.get(`/matches/${match.id}/standings/?league_id=${league.id}`);
          const standings = standingsResponse.data;
          
          // Create a map of squad data for this match
          const matchSquadData = {};
          
          // Create a previous data point to get running totals
          const previousDataPoint = chartDataPoints.length > 0 
            ? chartDataPoints[chartDataPoints.length - 1] 
            : null;
          
          // Calculate running totals for each squad
          league.squads.forEach(squad => {
            // Find this squad's data in the standings
            const squadStanding = standings.find(s => s.fantasy_squad === squad.id);
            
            // If squad has data for this match
            if (squadStanding) {
              const matchPoints = squadStanding.total_points || 0;
              const previousTotal = previousDataPoint ? 
                (previousDataPoint[`squad_${squad.id}`] || 0) : 0;
              
              // Store both match points and running total
              matchSquadData[squad.id] = {
                matchPoints: matchPoints,
                runningTotal: previousTotal + matchPoints
              };
            } else {
              // Squad didn't participate in this match
              const previousTotal = previousDataPoint ? 
                (previousDataPoint[`squad_${squad.id}`] || 0) : 0;
              
              matchSquadData[squad.id] = {
                matchPoints: 0,
                runningTotal: previousTotal
              };
            }
          });
          
          // Create data point for chart
          const dataPoint = {
            name: match.match_number.toString(),
            match_id: match.id,
            date: new Date(match.date).toLocaleDateString(undefined, { 
              weekday: 'short', month: 'short', day: 'numeric' 
            }),
            match_name: `${match.team_1.short_name} vs ${match.team_2.short_name}`,
            matchData: matchSquadData,
          };
          
          // Add squad-specific running totals
          league.squads.forEach(squad => {
            dataPoint[`squad_${squad.id}`] = matchSquadData[squad.id].runningTotal;
          });
          
          chartDataPoints.push(dataPoint);
        } catch (err) {
          console.error(`Error fetching standings for match ${match.id}:`, err);
          // Continue with next match if this one fails
        }
      }
      
      setChartData(chartDataPoints);
    } catch (err) {
      console.error('Failed to fetch running total data:', err);
      setError('Failed to load running total data');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No match data available to display running totals.
        </p>
      </div>
    );
  }

  // Custom tooltip to show squad point details
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Get match name and date for this data point
      const matchName = payload[0]?.payload?.match_name || `Match ${label}`;
      const matchDate = payload[0]?.payload?.date || '';
      const matchData = payload[0]?.payload?.matchData || {};
      
      // Filter for visible squads and sort by running total in descending order
      const visibleEntries = payload
        .filter(entry => {
          const squadId = parseInt(entry.dataKey.replace('squad_', ''));
          return visibleSquads[squadId];
        })
        .sort((a, b) => b.value - a.value);
      
      return (
        <div className="bg-white dark:bg-black p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded">
          <p className="font-medium text-gray-900 dark:text-white">{matchName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
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
                    <span className="text-gray-800 dark:text-gray-200 text-sm">
                      {squad?.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-900 dark:text-white font-medium text-sm">
                      {entry.value.toFixed(1)}
                    </span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
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

  return (
    <div className="bg-white dark:bg-black shadow rounded-lg p-6 border border-gray-200 dark:border-gray-900">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Running Total
        </h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => toggleAllSquads(true)}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Show All
          </button>
          <button 
            onClick={() => toggleAllSquads(false)}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Hide All
          </button>
        </div>
      </div>
      
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis 
              dataKey="name" 
              label={{ 
                value: 'Match', 
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: '#4B5563' }
              }}
              tick={{ fill: '#4B5563' }}
              tickLine={{ stroke: '#6B7280' }}
            />
            <YAxis 
              tick={{ fill: '#4B5563' }}
              tickLine={{ stroke: '#6B7280' }}
              label={{
                value: 'Points',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#4B5563' }
              }}
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
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                  dot={true}
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Squad Filter Toggles */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {league?.squads?.map((squad) => (
          <div 
            key={squad.id}
            className={`
              flex items-center p-2 rounded-md cursor-pointer transition-colors
              ${visibleSquads[squad.id] 
                ? `bg-opacity-20 bg-gray-100 dark:bg-gray-800` 
                : `bg-gray-50 dark:bg-gray-900 bg-opacity-50 text-gray-400 dark:text-gray-600`}
            `}
            onClick={() => toggleSquadVisibility(squad.id)}
          >
            <div 
              className={`
                h-3 w-3 rounded-full mr-2
                ${visibleSquads[squad.id] ? 'opacity-100' : 'opacity-30'}
              `}
              style={{ backgroundColor: getSquadColor(squad.id) }}
            />
            <span className="text-sm truncate">
              {squad.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeagueRunningTotal;