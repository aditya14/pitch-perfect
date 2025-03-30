import React, { useState, useEffect } from 'react';
import BaseLineChart from './BaseLineChart';
import api from '../../../utils/axios';

const RunningTotalChart = ({ 
  league, 
  selectedSquadIds, 
  selectedTimeFrame,
  includeBoost = true,
  title = "Running Total",
}) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      
      setChartData(response.data);
    } catch (err) {
      console.error('Failed to fetch running total data:', err);
      setError('Failed to load running total data');
      
      // Simulate data for development
      const simulatedMatches = Array.from({ length: 14 }, (_, i) => {
        return {
          id: 100 + i,
          number: i + 1,
          name: `Match ${i + 1}`,
          team_1: { short_name: 'MI' },
          team_2: { short_name: 'CSK' },
          date: new Date(2025, 2, i + 1).toISOString()
        };
      });
      
      // Initialize data structure for chart
      const chartDataPoints = [];
      
      // Initialize running totals
      const runningTotals = {};
      selectedSquadIds.forEach(squadId => {
        runningTotals[squadId] = 0;
      });
      
      // Create data points for each match
      simulatedMatches.forEach((match, index) => {
        const dataPoint = {
          name: match.number.toString(),
          match_id: match.id,
          date: new Date(match.date).toLocaleDateString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric'
          }),
          match_name: `${match.team_1.short_name} vs ${match.team_2.short_name}`,
          matchData: {}
        };
        
        // Add data for each squad
        selectedSquadIds.forEach(squadId => {
          // Generate random match points
          const matchPoints = Math.floor(Math.random() * 100) + 50;
          
          // Update running total
          runningTotals[squadId] += matchPoints;
          
          // Store data
          dataPoint.matchData[squadId] = {
            matchPoints: matchPoints,
            runningTotal: runningTotals[squadId]
          };
          
          // Add running total to data point
          dataPoint[`squad_${squadId}`] = runningTotals[squadId];
        });
        
        chartDataPoints.push(dataPoint);
      });
      
      setChartData(chartDataPoints);
    } finally {
      setLoading(false);
    }
  };

  // Get squad color with fallback to predefined colors
  const getSquadColor = (dataKey) => {
    const squadId = parseInt(dataKey.replace('squad_', ''));
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
          return selectedSquadIds.includes(squadId);
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

  // Prepare data keys for BaseLineChart
  const dataKeys = league?.squads
    ?.filter(squad => selectedSquadIds.includes(squad.id))
    .map(squad => ({
      dataKey: `squad_${squad.id}`,
      name: squad.name,
    }));

  return (
    <BaseLineChart
      title={title}
      data={chartData}
      dataKeys={dataKeys || []}
      xAxisDataKey="name"
      xAxisLabel="Match"
      height={400}
      getStrokeColor={getSquadColor}
      customTooltip={<CustomTooltip />}
      loading={loading}
      error={error}
      emptyMessage="No match data available to display running totals."
    />
  );
};

export default RunningTotalChart;