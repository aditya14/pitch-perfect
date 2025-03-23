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
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Table
            </h2>
          </div>
          <div className="p-1">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Squad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {league.squads?.sort((a, b) => b.total_points - a.total_points)
                  .map((squad, index) => (
                  <tr 
                    key={squad.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleSquadClick(squad.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="inline-block h-4 w-1 mr-1 rounded-sm" style={{backgroundColor: squad.color}}></span>
                        <span 
                          className="text-sm font-medium text-gray-800 dark:text-gray-200"
                        >
                          {squad.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {squad.total_points}
                    </td>
                  </tr>
                ))}
                {(!league.squads || league.squads.length === 0) && (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Matches
          </h2>
          
          {loadingMatches ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
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
            <div className="bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No recent matches available</p>
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