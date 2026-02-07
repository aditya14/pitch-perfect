import React, { useState, useEffect } from 'react';
import BaseStatsTable from './BaseStatsTable';
import api from '../../../utils/axios';

const RunningTotalActivesTable = ({ 
  league, 
  selectedSquadIds, 
  selectedTimeFrame
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (league?.id) {
      fetchSeasonTotalActivesData();
    }
  }, [league?.id, selectedSquadIds, selectedTimeFrame]);

  const fetchSeasonTotalActivesData = async () => {
    try {
      setLoading(true);
      
      // Fetch season total actives data
      const response = await api.get(`/leagues/${league.id}/stats/season-total-actives`, {
        params: {
          squads: selectedSquadIds.join(','),
          timeFrame: selectedTimeFrame
        }
      });
      
      // Defensive: ensure array and valid structure
      let arr = Array.isArray(response.data) ? response.data : [];
      arr = arr.filter(item => item && item.squad && typeof item.count === 'number');
      setData(arr);
    } catch (err) {
      console.error('Failed to fetch season total actives data:', err);
      setError('Failed to load season total actives data');
      setData([]);
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
            className="w-1 h-4 rounded-full mr-1"
            style={{ backgroundColor: value.color || '#808080' }}
          />
          <span>{value.name}</span>
        </div>
      ),
      sortable: false
    },
    {
      key: 'count',
      header: 'Actives',
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
    <div className="bg-white dark:bg-neutral-900 shadow rounded-lg">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white">
          Running Total Actives
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Total active players per squad across all matches
        </p>
      </div>
      
      <BaseStatsTable 
        data={data} 
        columns={columns}
        emptyMessage="No player active data available for the selected filters." 
      />
    </div>
  );
};

export default RunningTotalActivesTable;
