import React, { useState, useEffect } from 'react';
import BaseStatsTable from './BaseStatsTable';
import api from '../../../utils/axios';

const RankBreakdownTable = ({ 
  league, 
  selectedSquadIds, 
  selectedTimeFrame
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (league?.id) {
      fetchRankBreakdownData();
    }
  }, [league?.id, selectedSquadIds, selectedTimeFrame]);

  const fetchRankBreakdownData = async () => {
    try {
      setLoading(true);
      
      // Fetch rank breakdown data
      const response = await api.get(`/leagues/${league.id}/stats/rank-breakdown`, {
        params: {
          squads: selectedSquadIds.join(','),
          timeFrame: selectedTimeFrame
        }
      });
      
      // Limit to top 10
      setData(response.data.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch rank breakdown data:', err);
      setError('Failed to load rank breakdown data');
      
      // Simulate data for development
      const simulatedData = selectedSquadIds.map(squadId => {
        const squad = league.squads.find(s => s.id === squadId);
        
        // Random ranks between 1 and squad count
        const highestRank = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        const lowestRank = Math.floor(Math.random() * 3) + (league.squads.length - 3); // One of the bottom 3
        const medianRank = Math.random() * (league.squads.length - 1) + 1; // Decimal value between 1 and squad count
        const modeRank = Math.floor(Math.random() * league.squads.length) + 1;
        const gamesAtHighestRank = Math.floor(Math.random() * 5) + 1; // Between 1 and 5 games
        
        return {
          id: squadId,
          squad: {
            id: squadId,
            name: squad?.name || 'Unknown Squad',
            color: squad?.color || '#808080'
          },
          highestRank: highestRank,
          gamesAtHighestRank: gamesAtHighestRank,
          lowestRank: lowestRank,
          medianRank: medianRank,
          modeRank: modeRank
        };
      });
      
      // Sort by highest rank ascending (best rank first)
      simulatedData.sort((a, b) => a.highestRank - b.highestRank);
      
      // Limit to top 10
      setData(simulatedData.slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  // Define columns for the table
  const columns = [
    {
      key: 'squad',
      header: 'Squad',
      renderer: (value) => (
        <div className="flex items-center">
          <div 
            className="w-1 h-5 rounded-full mr-2"
            style={{ backgroundColor: value.color || '#808080' }}
          />
          <span>{value.name}</span>
        </div>
      ),
      sortable: false
    },
    {
      key: 'highestRank',
      header: 'Highest',
      type: 'number',
      sortable: false
    },
    {
      key: 'gamesAtHighestRank',
      header: 'Mts at Highest',
      type: 'number',
      sortable: false
    },
    {
      key: 'lowestRank',
      header: 'Lowest',
      type: 'number',
      sortable: false
    },
    {
      key: 'medianRank',
      header: 'Median',
      type: 'number',
      sortable: false
    },
    {
      key: 'modeRank',
      header: 'Mode',
      type: 'number',
      sortable: false
    }
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
        <div className="space-y-4">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-1/4"></div>
          <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error && !data.length) {
    return (
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 shadow rounded-lg mb-3">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white">
          Rank Breakdown
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Squad ranking performance over time
        </p>
      </div>
      
      <BaseStatsTable 
        data={data} 
        columns={columns}
        emptyMessage="No rank breakdown data available for the selected filters." 
      />
    </div>
  );
};

export default RankBreakdownTable;