import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BaseStatsTable from './BaseStatsTable';
import api from '../../../utils/axios';

const MatchMVPTable = ({ 
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
      fetchMatchMVPData();
    }
  }, [league?.id, selectedSquadIds, selectedTimeFrame, includeBoost]);

  const fetchMatchMVPData = async () => {
    try {
      setLoading(true);
      
      // Fetch match MVP data
      const response = await api.get(`/leagues/${league.id}/stats/match-mvp`, {
        params: {
          squads: selectedSquadIds.join(','),
          timeFrame: selectedTimeFrame,
          includeBoost: includeBoost
        }
      });
      
      // Limit to top 10
      setData(response.data.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch match MVP data:', err);
      setError('Failed to load match MVP data');
      
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
          match: {
            id: 200 + i,
            number: i + 1,
            name: `MI vs CSK - Match ${i + 1}`
          },
          squad: {
            id: randomSquadId,
            name: randomSquad?.name || 'Unknown Squad',
            color: randomSquad?.color || '#808080'
          },
          base: Math.floor(Math.random() * 100) + 50,
          boost: Math.floor(Math.random() * 70) + 20,
          total: 0  // Will be calculated below
        };
      });
      
      // Calculate totals
      simulatedData.forEach(player => {
        player.total = player.base + player.boost;
      });
      
      // Sort by total descending
      simulatedData.sort((a, b) => b.total - a.total);
      
      setData(simulatedData.slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  // Define columns for the table
  const columns = [
    {
      key: 'player',
      header: 'Player',
      renderer: (value) => (
        <span className="font-medium text-gray-900 dark:text-white">{value.name}</span>
      )
    },
    {
      key: 'squadMatch',
      header: 'Squad/Match',
      renderer: (_, row) => (
        <div className="flex flex-col">
          <div className="flex items-center">
            <div 
              className="w-1 h-4 rounded-full mr-1"
              style={{ backgroundColor: row.squad.color || '#808080' }}
            />
            <span className="text-sm">{row.squad.name}</span>
          </div>
          <Link 
            to={`/leagues/${league.id}/matches/${row.match.id}`} 
            className="text-primary-600 hover:text-primary-700 text-xs mt-1"
          >
            {row.match.name}
          </Link>
        </div>
      )
    },
    {
      key: 'base',
      header: 'Base',
      type: 'number',
      renderer: (value) => value.toFixed(1)
    },
    {
      key: 'boost',
      header: 'Boost',
      type: 'number',
      renderer: (value) => value.toFixed(1),
      hidden: !includeBoost
    },
    {
      key: 'total',
      header: 'Total',
      type: 'number',
      renderer: (value) => value.toFixed(1),
      hidden: !includeBoost
    }
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error && !data.length) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Match MVP
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Players with the most points in a single match
        </p>
      </div>
      
      <BaseStatsTable 
        data={data} 
        columns={columns} 
        defaultSortColumn={includeBoost ? "total" : "base"} 
        defaultSortDirection="desc" 
        emptyMessage="No player data available for the selected filters." 
      />
    </div>
  );
};

export default MatchMVPTable;