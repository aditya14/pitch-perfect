import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTextColorForBackground } from '../../utils/colorUtils';
import api from '../../utils/axios';
import MatchCard from '../matches/MatchCard';
import LeagueRunningTotal from '../elements/graphs/LeagueRunningTotal';

const LeagueDashboard = ({ league }) => {
  const navigate = useNavigate();
  const [recentMatches, setRecentMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  useEffect(() => {
    if (league?.season?.id) {
      fetchRecentMatches();
    }
  }, [league?.season?.id]);

  const fetchRecentMatches = async () => {
    try {
      setLoadingMatches(true);
      
      // Attempt to use the recent matches endpoint
      let response;
      try {
        response = await api.get(`/seasons/${league.season.id}/matches/recent/`);
      } catch (err) {
        // Fallback: If the recent endpoint fails, get all matches and filter
        console.log('Recent matches endpoint failed, using fallback method');
        response = await api.get(`/seasons/${league.season.id}/matches/`);
        const allMatches = response.data;
        
        // Filter to get recent or upcoming matches
        const recent = allMatches
          .filter(match => match.status === 'COMPLETED' || match.status === 'LIVE')
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 2);
        
        setRecentMatches(recent);
        return;
      }
      
      setRecentMatches(response.data);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setRecentMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleSquadClick = (squadId) => {
    navigate(`/squads/${squadId}`);
  };

  return (
    <div className="space-y-8">
      {/* League table and recent matches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* League Table */}
        <div className="bg-white dark:bg-neutral-950 shadow rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Table
            </h2>
          </div>
          <div className="p-1">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
              <thead className="bg-neutral-50 dark:bg-black">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                    Squad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-950 divide-y divide-neutral-200 dark:divide-neutral-900">
                {league.squads?.sort((a, b) => b.total_points - a.total_points)
                  .map((squad, index) => (
                  <tr 
                    key={squad.id} 
                    className="hover:bg-neutral-50 dark:hover:bg-black cursor-pointer"
                    onClick={() => handleSquadClick(squad.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="inline-block h-4 w-1 mr-1 rounded-sm" style={{backgroundColor: squad.color}}></span>
                        <span 
                          className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
                        >
                          {squad.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-900 dark:text-white">
                      {squad.total_points}
                    </td>
                  </tr>
                ))}
                {(!league.squads || league.squads.length === 0) && (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      No squads have joined this league yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Matches Section */}
        <div className="space-y-4">
          <div className="pt-4">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Recent Matches
            </h2>
          </div>
          
          {loadingMatches ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-40 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : recentMatches.length > 0 ? (
            <div className="space-y-4">
              {recentMatches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  leagueId={league.id} 
                  compact={true}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-800 shadow border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 text-center">
              <p className="text-neutral-500 dark:text-neutral-400">No recent matches available</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Running Total Graph */}
      <LeagueRunningTotal league={league} />
    </div>
  );
};

export default LeagueDashboard;