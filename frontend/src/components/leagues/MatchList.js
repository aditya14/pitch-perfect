import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import MatchCard from '../matches/MatchCard';
import MatchCardMin from '../matches/MatchCardMin';

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
      setLoading(true);
      const response = await api.get(`/seasons/${league.season.id}/matches/`);
      console.log('Fetched matches:', response.data);
      setMatches(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
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

  // Group matches by phase, maintaining chronological order
  const getGroupedMatches = () => {
    const filteredMatches = getFilteredMatches();
    
    // Sort matches by date first to ensure chronological order
    const sortedMatches = [...filteredMatches].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Group the sorted matches by phase
    const groupedByPhase = sortedMatches.reduce((groups, match) => {
      const phase = match.phase || 1; // Default to phase 1 if not set
      if (!groups[phase]) {
        groups[phase] = [];
      }
      groups[phase].push(match);
      return groups;
    }, {});
    
    // Convert to array of phase groups for rendering
    return Object.entries(groupedByPhase).map(([phase, phaseMatches]) => ({
      phase: parseInt(phase, 10),
      matches: phaseMatches
    }));
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Matches
          </h2>
          <div className="flex gap-2">
            {['All', 'Upcoming', 'Completed'].map(label => (
              <div key={label} className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-md animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Matches
          </h2>
        </div>
        <div className="p-6">
          <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-md">
            {error}
          </div>
        </div>
      </div>
    );
  }

  const groupedMatches = getGroupedMatches();

  return (
    <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-wrap justify-between items-center">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Matches
        </h2>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'upcoming'
                ? 'bg-primary-600 text-white'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'completed'
                ? 'bg-primary-600 text-white'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`}
          >
            Completed
          </button>
        </div>
      </div>
      
      <div className="p-2">
        {groupedMatches.length > 0 ? (
          <div className="space-y-6">
            {groupedMatches.map((group) => (
              <div key={`phase-${group.phase}`} className="space-y-2">
                <div className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-md font-medium text-neutral-800 dark:text-neutral-200 border-l-2 border-primary-500">
                  Week {group.phase}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-2">
                  {group.matches.map((match) => (
                    <MatchCardMin 
                      key={match.id}
                      match={match}
                      leagueId={league.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-neutral-500 dark:text-neutral-400">
              No {filter !== 'all' ? filter : ''} matches found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchList;