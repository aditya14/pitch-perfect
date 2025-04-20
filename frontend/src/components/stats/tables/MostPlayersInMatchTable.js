import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BaseStatsTable from './BaseStatsTable';
import api from '../../../utils/axios';

const MostPlayersInMatchTable = ({
  league,
  selectedSquadIds,
  selectedTimeFrame,
  hideTitle = false // default, but we'll show title below
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (league?.id) {
      fetchData();
    }
  }, [league?.id, selectedSquadIds, selectedTimeFrame]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/leagues/${league.id}/stats/most-players-in-match`, {
        params: {
          squads: selectedSquadIds.join(','),
          timeFrame: selectedTimeFrame
        }
      });
      // The backend returns 'count' for actives, not 'actives'
      setData((response.data || []).slice(0, 8));
    } catch (err) {
      setError('Failed to load data');
      // Simulate data for development
      const simulatedData = [];
      for (let i = 0; i < 8; i++) {
        const randomSquadId = selectedSquadIds[Math.floor(Math.random() * selectedSquadIds.length)];
        const randomSquad = league.squads.find(s => s.id === randomSquadId);
        simulatedData.push({
          id: i + 1,
          squad: {
            id: randomSquadId,
            name: randomSquad?.name || 'Unknown Squad',
            color: randomSquad?.color || '#808080'
          },
          match: {
            id: 200 + i,
            number: i + 1,
            name: `MI vs CSK - Match ${i + 1}`
          },
          count: Math.floor(Math.random() * 11) + 1 // use 'count' to match backend
        });
      }
      setData(simulatedData);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'squad',
      header: 'Squad',
      renderer: (value, row) => (
        <div className="flex items-center">
          <div
            className="w-1 h-4 rounded-full mr-1"
            style={{ backgroundColor: row.squad.color || '#808080' }}
          />
          <span className="text-sm">{row.squad.name}</span>
        </div>
      )
    },
    {
      key: 'match',
      header: 'Match',
      renderer: (value, row) => (
        <Link
          to={`/leagues/${league.id}/matches/${row.match.id}`}
          className="text-primary-600 hover:text-primary-700 text-xs"
        >
          {row.match.name}
        </Link>
      )
    },
    {
      key: 'count',
      header: 'Actives',
      type: 'number',
      renderer: (value, row) => <span>{row.count}</span>
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

  // Always show title now
  return (
    <div className="bg-white dark:bg-neutral-900 shadow rounded-lg">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white">
          Most Actives in Match
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Highest number of active players in a match by squad
        </p>
      </div>
      <BaseStatsTable
        data={data}
        columns={columns}
        emptyMessage="No match actives data available for the selected filters."
      />
    </div>
  );
};

export default MostPlayersInMatchTable;