import React, { Component } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../utils/axios';

class CreateSquad extends Component {
  state = {
    name: '',
    color: '#000000',
    league: null,
    loading: true,
    error: null,
    redirect: false,
    leagueDetails: null
  };

  componentDidMount() {
    this.getLeagueFromUrl();
  }

  getLeagueFromUrl = async () => {
    const params = new URLSearchParams(window.location.search);
    const leagueId = params.get('league');
    
    if (!leagueId) {
      this.setState({ 
        error: 'No league specified',
        loading: false
      });
      return;
    }

    try {
      const leagueResponse = await api.get(`/leagues/${leagueId}/`);
      this.setState({ 
        league: leagueId,
        leagueDetails: leagueResponse.data,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching league:', error);
      this.setState({ 
        error: 'Failed to fetch league details: ' + (error.response?.data?.detail || error.message),
        loading: false
      });
    }
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/squads/', {
        name: this.state.name,
        color: this.state.color,
        league: this.state.league
      });
      this.setState({ redirect: true });
    } catch (error) {
      console.error('Error creating squad:', error);
      this.setState({ 
        error: error.response?.data?.detail || 'Failed to create squad' 
      });
    }
  };

  render() {
    if (this.state.redirect) {
      return <Navigate to="/dashboard" />;
    }

    if (this.state.loading) {
      return <div className="text-center p-4 dark:text-white">Loading...</div>;
    }

    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Create Your Squad
            </h2>
            {this.state.leagueDetails && (
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                for {this.state.leagueDetails.name}
              </p>
            )}
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
                  Squad Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                    theme-transition
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white
                    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                    dark:border-gray-600"
                  value={this.state.name}
                  onChange={(e) => this.setState({ name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Squad Color
                </label>
                <input
                  id="color"
                  type="color"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                    theme-transition
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white
                    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                    dark:border-gray-600"
                  value={this.state.color}
                  onChange={(e) => this.setState({ color: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium 
                         text-white bg-indigo-600 hover:bg-indigo-700 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
              >
                Create Squad
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default CreateSquad;