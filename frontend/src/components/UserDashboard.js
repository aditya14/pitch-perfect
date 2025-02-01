import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';

class UserDashboard extends Component {
  state = {
    leagues: [],
    loading: true,
    error: null
  };

  componentDidMount() {
    this.fetchLeagues();
  }

  fetchLeagues = async () => {
    try {
      const response = await api.get('/leagues/my_leagues/');
      this.setState({ leagues: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching leagues:', error);
      this.setState({ 
        error: 'Failed to fetch leagues', 
        loading: false 
      });
    }
  };

  render() {
    const { leagues, loading, error } = this.state;

    if (loading) {
      return <div className="text-center p-4">Loading...</div>;
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Leagues</h1>
          <div className="space-x-4">
            <Link
              to="/leagues/create"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create League
            </Link>
            <Link
              to="/leagues/join"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Join League
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {leagues.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded">
            <p className="text-gray-600">You haven't joined any leagues yet.</p>
            <p className="text-gray-500 mt-2">Create or join a league to get started!</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">League Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Squad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teams</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Season</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leagues.map(league => (
                  <tr key={league.id}
                      style={{borderLeft: `4px solid ${league.color}`}}>
                    <td className="px-6 py-4 whitespace-nowrap">{league.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {league.teams?.find(team => team.user === league.user_id)?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {league.teams?.length || 0}/{league.max_teams}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{league.season?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
}

export default UserDashboard;