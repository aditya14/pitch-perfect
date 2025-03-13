import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import UpdatePointsButton from './UpdatePointsButton';

const UserDashboard = () => {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      const response = await api.get('/leagues/my_leagues/');
      console.log('Leagues:', response.data);
      setLeagues(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leagues:', error);
      setError('Failed to fetch leagues');
      setLoading(false);
    }
  };

  // Check if current user is the admin (user ID 1)
  const isAdmin = user && user.id === 1;

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold dark:text-white">My Leagues</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
          {/* Admin-only Update Points Button */}
          {isAdmin && (
            <div className="mr-2">
              <UpdatePointsButton />
            </div>
          )}
          <Link
            to="/leagues/join"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-center"
          >
            Join League
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {leagues.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded">
          <p className="text-gray-600 dark:text-gray-300">You haven't joined any leagues yet.</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Create or join a league to get started!</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    League
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Your Squad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Squads
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Season
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {leagues.map(league => (
                  <tr key={league.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      style={{borderLeft: `4px solid ${league.color}`}}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        to={`/leagues/${league.id}`} 
                        className="text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {league.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {league.my_squad ? (
                        <div className="flex items-center">
                          <span className="inline-block h-4 w-1 mr-1 rounded-sm" style={{backgroundColor: league.my_squad.color}}></span>
                          <span>{league.my_squad.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {league.squads_count}/{league.max_teams}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {league.season?.name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;