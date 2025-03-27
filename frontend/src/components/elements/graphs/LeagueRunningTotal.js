import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import api from '../../../utils/axios';
import { getEventData } from '../../../utils/matchUtils';

const LeagueRunningTotal = ({ league }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (league?.id && league?.season?.id) {
      fetchRunningTotalData();
    }
  }, [league?.id, league?.season?.id]);

  const fetchRunningTotalData = async () => {
    try {
      setLoading(true);
      
      // Create a map of squad names to squad IDs for lookup
      const squadMap = {};
      league.squads.forEach(squad => {
        squadMap[squad.name] = squad.id;
      });
      
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

      // Initialize running totals for each squad
      const runningTotals = {};
      league.squads.forEach(squad => {
        runningTotals[squad.id] = 0;
      });

      const chartDataPoints = [];
      
      // Process each match sequentially
      for (const match of matches) {
        try {
          // Fetch all events for this match
          const eventsResponse = await api.get(`/leagues/${league.id}/matches/${match.id}/events/`);
          const events = eventsResponse.data;
          
          // Calculate squad points for this match
          const matchSquadPoints = {};
          league.squads.forEach(squad => {
            matchSquadPoints[squad.id] = 0;
          });
          
          // Process each event to calculate fantasy points per squad
          events.forEach(event => {
            // Look up squad ID from squad name
            const squadId = squadMap[event.squad_name];
            
            // Only process events for squads in this league
            if (squadId && matchSquadPoints[squadId] !== undefined) {
              // Process event to get fantasy points
              const processedEvent = getEventData(event);
              matchSquadPoints[squadId] += processedEvent.fantasy_points;
            }
          });
          
          // Update running totals
          league.squads.forEach(squad => {
            runningTotals[squad.id] += matchSquadPoints[squad.id];
          });
          
          // Create data point for chart
          const dataPoint = {
            name: match.match_number.toString(),
            match_id: match.id,
            date: new Date(match.date).toLocaleDateString(),
            match_name: match.team_1.short_name + ' vs ' + match.team_2.short_name,
            // Store match points (not running total) for tooltip display
            matchPoints: {},
          };
          
          // Add running total for each squad
          league.squads.forEach(squad => {
            dataPoint[squad.name] = runningTotals[squad.id];
            dataPoint.matchPoints[squad.name] = matchSquadPoints[squad.id];
          });
          
          chartDataPoints.push(dataPoint);
        } catch (err) {
          console.error(`Error fetching events for match ${match.id}:`, err);
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
  const getSquadColor = (squadIndex) => {
    if (league?.squads?.[squadIndex]?.color) {
      return league.squads[squadIndex].color;
    }
    
    // Fallback colors
    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];
    
    return colors[squadIndex % colors.length];
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
      // Get match points and match name for this data point
      const matchPoints = payload[0]?.payload?.matchPoints || {};
      const matchName = payload[0]?.payload?.match_name || `Match ${label}`;
      
      // Sort squads by total points (running total) in descending order
      const sortedEntries = [...payload].sort((a, b) => {
        return b.value - a.value;
      });
      
      return (
        <div className="bg-white dark:bg-black p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded">
          <p className="font-medium text-gray-900 dark:text-white">{matchName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {payload[0]?.payload?.date}
          </p>
          <div className="space-y-1">
            {sortedEntries.map((entry, index) => {
              const matchPoint = matchPoints[entry.name] || 0;
              return (
                <div key={index} className="flex items-center justify-between gap-2">
                  <div className="flex items-center">
                    <div
                      className="h-3 w-3 rounded-full mr-1"
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-gray-800 dark:text-gray-200 text-sm">
                      {entry.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-900 dark:text-white font-medium text-sm">
                      {entry.value.toFixed(1)}
                    </span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      (+{matchPoint.toFixed(1)})
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
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Running Total
      </h3>
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
            />
            <Tooltip content={<CustomTooltip />} />
            {league?.squads?.map((squad, index) => (
              <Line
                key={squad.id}
                type="monotone"
                dataKey={squad.name}
                name={squad.name}
                stroke={getSquadColor(index)}
                activeDot={{ r: 6 }}
                strokeWidth={2}
                dot={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LeagueRunningTotal;
