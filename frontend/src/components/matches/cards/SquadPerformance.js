import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import api from '../../../utils/axios';

const SquadPerformance = ({ matchId, leagueId, activeSquadId }) => {
  const [squadData, setSquadData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch if we're in a league context
    if (matchId && leagueId) {
      fetchSquadStandings();
    } else {
      setLoading(false);
    }
  }, [matchId, leagueId]);

  const fetchSquadStandings = async () => {
    try {
      setLoading(true);
      
      // Use the new match_standings endpoint with league filter
      const response = await api.get(`/matches/${matchId}/standings/?league_id=${leagueId}`);
      
      // Format the data for display
      const formattedData = response.data.map(event => ({
        id: event.fantasy_squad,
        name: event.squad_name,
        color: event.squad_color || '#888888',
        points: event.total_points,
        basePoints: event.total_base_points,
        boostPoints: event.total_boost_points,
        rank: event.match_rank,
        playersCount: event.players_count
      }));
      
      // Sort by rank ascending (1st, 2nd, 3rd, etc.)
      const sortedData = formattedData.sort((a, b) => a.rank - b.rank);
      
      setSquadData(sortedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching squad standings:', err);
      setError('Failed to load squad standings');
    } finally {
      setLoading(false);
    }
  };

  // Get rank background color
  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 dark:bg-yellow-900";
      default:
        return "bg-white dark:bg-gray-800";
    }
  };

  // Get rank icon
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-4 h-full">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-4 h-full">
        <div className="text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  // If there are no squads to display
  if (squadData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 overflow-hidden h-full">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Match Standings
          </h2>
        </div>
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          No squad data available for this match
        </div>
      </div>
    );
  }

  // Determine layout based on number of squads
  const useGridLayout = squadData.length >= 4;
  
  return (
    <div className="bg-white dark:bg-gray-900 overflow-hidden h-full shadow rounded-lg">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Match Standings
        </h2>
      </div>
      
      <div className="p-1">
        <div className={`grid ${useGridLayout ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-1`}>
        {squadData.map((squad) => (
          <div 
            key={`squad-${squad.id}`}
            className={`transition-all py-2 px-3 ${squad.id === activeSquadId ? 'bg-blue-50 dark:bg-blue-900/20 rounded-md' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`flex items-center justify-center w-8 h-8 ${getRankStyle(squad.rank)} rounded-full text-sm font-bold`}>
                  {getRankIcon(squad.rank) || squad.rank}
                </div>
                <div 
                  className="h-10 w-2 mr-2 rounded-md"
                  style={{ backgroundColor: squad.color }}
                />
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <span className={`${squad.rank === 1 ? 'font-bold' : 'font-medium'} text-base truncate max-w-[140px] sm:max-w-[200px]`}>
                      {squad.name}
                    </span>
                  </div>
                  
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {squad.playersCount} player{squad.playersCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {squad.points.toFixed(1)}
                </span>
                {squad.basePoints > 0 || squad.boostPoints > 0 ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {squad.basePoints.toFixed(1)} {squad.boostPoints >= 0 && '+'}{squad.boostPoints.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};

export default SquadPerformance;