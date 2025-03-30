import React, { useState, useEffect } from 'react';
import BaseLineChart from './BaseLineChart';
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
      
      setChartData(response.data);
      
      // Extract insights from data
      if (response.data && response.data.length > 0) {
        calculateInsights(response.data);
      }
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
      calculateInsights(chartDataPoints);
    } finally {
      setLoading(false);
    }
  };

  // Calculate insights from chart data
  const calculateInsights = (data) => {
    if (!data || data.length === 0 || !league?.squads) return;
    
    // Find current leading squad
    const lastDataPoint = data[data.length - 1];
    let maxTotal = 0;
    let leaderId = null;
    
    // Find highest single match score
    let highestMatchScore = 0;
    let highestScoreSquadId = null;
    let highestScoreMatch = null;
    
    selectedSquadIds.forEach(squadId => {
      const squadKey = `squad_${squadId}`;
      
      // Check for leading squad
      if (lastDataPoint[squadKey] > maxTotal) {
        maxTotal = lastDataPoint[squadKey];
        leaderId = squadId;
      }
      
      // Check each match for highest score
      data.forEach((matchData, index) => {
        if (index === 0) return; // Skip first match as it doesn't have previous data to compare
        
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
    
    // Set leading squad
    if (leaderId) {
      const leaderSquad = league.squads.find(s => s.id === leaderId);
      setLeadingSquad(leaderSquad || { id: leaderId, name: 'Unknown Squad' });
    }
    
    // Set highest score
    if (highestScoreSquadId) {
      const highScoreSquad = league.squads.find(s => s.id === highestScoreSquadId);
      setHighestScore({
        value: highestMatchScore.toFixed(1),
        squad: highScoreSquad || { id: highestScoreSquadId, name: 'Unknown Squad' },
        match: highestScoreMatch
      });
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
        <div className="bg-white dark:bg-black p-3 border border-neutral-200 dark:border-neutral-800 shadow-md rounded">
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

  // Prepare data keys for BaseLineChart
  const dataKeys = league?.squads
    ?.filter(squad => selectedSquadIds.includes(squad.id))
    .map(squad => ({
      dataKey: `squad_${squad.id}`,
      name: squad.name,
    }));

  return (
    <div className="space-y-4">
      {/* Insights Row (optional toggle) */}
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
      
      {/* Insights Cards */}
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
      
      {/* Chart Component */}
      <BaseLineChart
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
    </div>
  );
};

export default RunningTotalChart;