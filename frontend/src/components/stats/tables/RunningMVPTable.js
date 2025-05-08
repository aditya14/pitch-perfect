import React, { useState, useEffect } from 'react';
import BaseStatsTable from './BaseStatsTable';
import api from '../../../utils/axios';

const RunningMVPTable = ({ 
  league, 
  selectedSquadIds, 
  selectedTimeFrame,
  includeBoost = true
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (league?.id) {
      fetchSeasonMVPData();
    }
  }, [league?.id, selectedSquadIds, selectedTimeFrame, includeBoost]);

  const fetchSeasonMVPData = async () => {
    try {
      setLoading(true);
      
      // Fetch season MVP data
      const response = await api.get(`/leagues/${league.id}/stats/season-mvp`, {
        params: {
          squads: selectedSquadIds.join(','),
          timeFrame: selectedTimeFrame,
          includeBoost: includeBoost
        }
      });

      // Map backend fields to expected frontend structure
      setData(
        (response.data || []).map(item => ({
          player: { id: item.player_id, name: item.player_name },
          squad: item.squad,
          base: item.base,
          boost: item.boost,
          total: item.total,
          match_count: item.match_count || 0  // Add this line
        }))
      );
    } catch (err) {
      console.error('Failed to fetch season MVP data:', err);
      setError('Failed to load season MVP data');
      
      // Simulate data for development
      const simulatedData = Array.from({ length: 10 }, (_, i) => {
        const randomSquadId = selectedSquadIds[Math.floor(Math.random() * selectedSquadIds.length)];
        const randomSquad = league.squads.find(s => s.id === randomSquadId);
        
        return {
          id: i + 1,
          player: {
            id: 100 + i,
            name: `Player ${i + 1}`
          },
          matches: Math.floor(Math.random() * 14) + 1,
          squad: {
            id: randomSquadId,
            name: randomSquad?.name || 'Unknown Squad',
            color: randomSquad?.color || '#808080'
          },
          base: Math.floor(Math.random() * 500) + 100,
          boost: Math.floor(Math.random() * 300) + 50,
          total: 0  // Will be calculated below
        };
      });
      
      // Calculate totals
      simulatedData.forEach(player => {
        player.total = player.base + player.boost;
      });
      
      setData(simulatedData);
    } finally {
      setLoading(false);
    }
  };

  // Define columns for the table
  const columns = [
    {
      key: 'playerSquad',
      header: 'Player/Squad',
      renderer: (_, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-neutral-900 dark:text-white">{row.player.name}</span>
          <div className="flex items-center mt-1">
            <div 
              className="w-1 h-4 rounded-full mr-1"
              style={{ backgroundColor: row.squad.color || '#808080' }}
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">{row.squad.name}</span>
          </div>
        </div>
      )
    },
    {
      key: 'match_count',
      header: 'Mts',
      type: 'number',
      sortable: true
    },
    {
      key: 'total',
      header: 'Total',
      type: 'number',
      renderer: (value, row) => (
        includeBoost ? (
          <div className="flex flex-col items-start">
            <span className="font-bold text-neutral-900 dark:text-white text-base">{row.total.toFixed(1)}</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {row.base.toFixed(1)} <span className="font-bold">+</span> {row.boost.toFixed(1)}
            </span>
          </div>
        ) : (
          <span className="font-bold text-neutral-900 dark:text-white text-base">{row.base.toFixed(1)}</span>
        )
      )
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
    <div className="bg-white dark:bg-neutral-900 shadow rounded-lg">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white">
          Running MVP
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Players with the most points across all matches
        </p>
      </div>
      
      <BaseStatsTable 
        data={data} 
        columns={columns} 
        emptyMessage="No player data available for the selected filters." 
      />
    </div>
  );
};

export default RunningMVPTable;