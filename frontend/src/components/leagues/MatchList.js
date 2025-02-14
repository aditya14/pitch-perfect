import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import api from '../../utils/axios';

const MatchList = ({ league }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'completed'
  const [error, setError] = useState(null);

  useEffect(() => {
    if (league?.season?.id) {
      fetchMatches();
    }
  }, [league?.season?.id]);

  const fetchMatches = async () => {
    try {
      const response = await api.get(`/seasons/${league.season.id}/matches/`);
      setMatches(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMatches = () => {
    if (filter === 'upcoming') {
      return matches.filter(match => ['SCHEDULED', 'LIVE'].includes(match.status));
    } else if (filter === 'completed') {
      return matches.filter(match => ['COMPLETED', 'NO_RESULT', 'ABANDONED'].includes(match.status));
    }
    return matches;
  };

  const getMatchSummary = (match) => {
    if (match.status === 'COMPLETED') {
      let summary = `${match.winner.name} won`;
      if (match.win_type === 'RUNS') {
        summary += ` by ${match.win_margin} runs`;
      } else if (match.win_type === 'WICKETS') {
        summary += ` by ${match.win_margin} wickets`;
      } else if (match.win_type === 'SUPER_OVER') {
        summary += ' in Super Over';
      }
      return summary;
    }
    return match.status;
  };

  const getInningsSummary = (match) => {
    if (!match.inns_1_runs && !match.inns_2_runs) return null;

    const inns1 = match.inns_1_runs ? 
      `${match.inns_1_runs}/${match.inns_1_wickets || 0} (${match.inns_1_overs} ov)` : '';
    const inns2 = match.inns_2_runs ? 
      `${match.inns_2_runs}/${match.inns_2_wickets || 0} (${match.inns_2_overs} ov)` : '';

    return (
      <div className="text-sm">
        <div>{inns1}</div>
        {inns2 && <div>{inns2}</div>}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeUntil = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      if (diffHours <= 1) {
        return 'Starting soon';
      }
      return `in ${diffHours} hours`;
    } else if (diffDays === 1) {
      return 'tomorrow';
    } else if (diffDays > 1) {
      return `in ${diffDays} days`;
    }
    return 'Live';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Matches
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'upcoming'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'completed'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {getFilteredMatches().map((match) => (
          <div 
            key={match.id} 
            className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Match {match.match_number} - {match.stage}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(match.date)} at {formatTime(match.date)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {match.venue}
                </div>
              </div>
              {match.status === 'LIVE' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                  LIVE
                </span>
              )}
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="flex-1">
                <div className="flex items-center">
                  <div 
                    className="h-8 w-8 rounded-full mr-3"
                    style={{ backgroundColor: match.team_1.primary_color }}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {match.team_1.name}
                  </span>
                </div>
                <div className="flex items-center mt-2">
                  <div 
                    className="h-8 w-8 rounded-full mr-3"
                    style={{ backgroundColor: match.team_2.primary_color }}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {match.team_2.name}
                  </span>
                </div>
              </div>

              {/* Match Result/Summary */}
              <div className="flex-1 text-right">
                {match.status === 'COMPLETED' && (
                  <>
                    {getInningsSummary(match)}
                    <div className="flex items-center justify-end mt-2 text-gray-900 dark:text-white">
                      {match.winner && (
                        <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                      )}
                      <span className="text-sm font-medium">
                        {getMatchSummary(match)}
                      </span>
                    </div>
                    {match.player_of_match && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Player of the Match: {match.player_of_match.name}
                      </div>
                    )}
                  </>
                )}
                {match.status === 'SCHEDULED' && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {getTimeUntil(match.date)}
                  </div>
                )}
                {match.status === 'LIVE' && getInningsSummary(match)}
              </div>
            </div>
          </div>
        ))}

        {getFilteredMatches().length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            No matches found
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchList;