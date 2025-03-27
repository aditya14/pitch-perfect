import React, { Component } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../utils/axios';

class CreateLeague extends Component {
  state = {
    name: '',
    color: '#000000',
    maxTeams: 2,
    season: '',
    seasons: [],
    loading: true,
    error: null,
    redirect: false,
    leagueId: null
  };

  componentDidMount() {
    this.fetchSeasons();
  }

  fetchSeasons = async () => {
    try {
      const response = await api.get('/seasons/');
      const upcomingSeasons = response.data.filter(season => 
        season.status === 'UPCOMING'
      );
      this.setState({ 
        seasons: upcomingSeasons,
        season: upcomingSeasons[0]?.id || '',
        loading: false 
      });
    } catch (error) {
      console.error('Error fetching seasons:', error);
      this.setState({ 
        error: 'Failed to fetch seasons',
        loading: false
      });
    }
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/leagues/', {
        name: this.state.name,
        color: this.state.color,
        max_teams: parseInt(this.state.maxTeams),
        season: this.state.season
      });
      
      this.setState({ 
        redirect: true,
        leagueId: response.data.id
      });
    } catch (error) {
      console.error('Error creating league:', error);
      this.setState({ 
        error: error.response?.data?.detail || 'Failed to create league' 
      });
    }
  };

  render() {
    if (this.state.redirect && this.state.leagueId) {
      return <Navigate to={`/squads/create?league=${this.state.leagueId}`} />;
    }

    if (this.state.loading) {
      return <div className="text-center p-4 dark:text-white">Loading...</div>;
    }

    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Create a New League
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={this.handleSubmit}>
            {this.state.error && (
              <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded">
                {this.state.error}
              </div>
            )}
            
            <div className="rounded-md space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  League Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                    theme-transition
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white
                    focus:outline-none focus:ring-primary-500 focus:border-primary-500 
                    dark:border-gray-600"
                  value={this.state.name}
                  onChange={(e) => this.setState({ name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  League Color
                </label>
                <input
                  id="color"
                  type="color"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                    theme-transition
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white
                    focus:outline-none focus:ring-primary-500 focus:border-primary-500 
                    dark:border-gray-600"
                  value={this.state.color}
                  onChange={(e) => this.setState({ color: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="maxTeams" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Maximum Teams (2-10)
                </label>
                <input
                  id="maxTeams"
                  type="number"
                  min="2"
                  max="10"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                    theme-transition
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white
                    focus:outline-none focus:ring-primary-500 focus:border-primary-500 
                    dark:border-gray-600"
                  value={this.state.maxTeams}
                  onChange={(e) => this.setState({ maxTeams: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="season" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Season
                </label>
                <select
                  id="season"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-primary-500 focus:border-primary-500
                           dark:border-gray-600"
                  value={this.state.season}
                  onChange={(e) => this.setState({ season: e.target.value })}
                >
                  <option value="">Select a season</option>
                  {this.state.seasons.map(season => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({new Date(season.start_date).getFullYear()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium
                         text-white bg-primary-600 hover:bg-primary-700 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                         dark:focus:ring-offset-gray-900"
              >
                Create League
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default CreateLeague;