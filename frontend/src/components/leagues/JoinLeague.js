import React, { Component } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../utils/axios';

class JoinLeague extends Component {
  state = {
    leagueCode: '',
    error: null,
    isCreatingSquad: false,
    squadName: '',
    squadColor: '#000000',
    leagueDetails: null,
    redirect: false,
    squadId: null
  };

  handleJoinSubmit = async (e) => {
    e.preventDefault();
    this.setState({ error: null });

    try {
      const response = await api.post('/leagues/join/', {
        league_code: this.state.leagueCode.toUpperCase()
      });

      this.setState({ 
        isCreatingSquad: true,
        leagueDetails: response.data.league
      });
    } catch (error) {
      this.setState({ 
        error: error.response?.data?.error || 'Failed to join league'
      });
    }
  };

  handleSquadSubmit = async (e) => {
    e.preventDefault();
    this.setState({ error: null });

    try {
      console.log('Creating squad with data:', {
        name: this.state.squadName,
        color: this.state.squadColor,
        league: this.state.leagueDetails.id
      });

      const response = await api.post('/squads/', {
        name: this.state.squadName,
        color: this.state.squadColor,
        league: this.state.leagueDetails.id
      });

      console.log('Squad created successfully:', response.data);
      
      this.setState({ 
        redirect: true
      }, () => {
        console.log('State updated, redirect:', this.state.redirect);
      });
    } catch (error) {
      console.error('Error creating squad:', error);
      this.setState({ 
        error: error.response?.data?.error || 'Failed to create squad'
      });
    }
  };

  renderJoinForm() {
    return (
      <form className="mt-8 space-y-6" onSubmit={this.handleJoinSubmit}>
        <div>
          <label htmlFor="leagueCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            League Code
          </label>
          <input
            id="leagueCode"
            type="text"
            required
            maxLength="6"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
              theme-transition
              bg-white dark:bg-gray-700 
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
              dark:border-gray-600"
            placeholder="Enter 6-character code"
            value={this.state.leagueCode}
            onChange={(e) => this.setState({ leagueCode: e.target.value.toUpperCase() })}
          />
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium 
                   text-white bg-indigo-600 hover:bg-indigo-700 
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
        >
          Join League
        </button>
      </form>
    );
  }

  renderSquadForm() {
    return (
      <form className="mt-8 space-y-6" onSubmit={this.handleSquadSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="squadName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Squad Name
            </label>
            <input
              id="squadName"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                theme-transition
                bg-white dark:bg-gray-700 
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                dark:border-gray-600"
              placeholder="Enter squad name"
              value={this.state.squadName}
              onChange={(e) => this.setState({ squadName: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="squadColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Squad Color
            </label>
            <input
              id="squadColor"
              type="color"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                theme-transition
                bg-white dark:bg-gray-700 
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                dark:border-gray-600"
              value={this.state.squadColor}
              onChange={(e) => this.setState({ squadColor: e.target.value })}
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="button"
            className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium 
                     text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
            onClick={() => this.setState({ isCreatingSquad: false })}
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium 
                     text-white bg-indigo-600 hover:bg-indigo-700 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
          >
            Create Squad
          </button>
        </div>
      </form>
    );
  }

  render() {
    if (this.state.redirect) {
      return <Navigate to="/dashboard" />;
    }

    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {this.state.isCreatingSquad ? (
                `Create Squad for ${this.state.leagueDetails?.name}`
              ) : (
                'Join a League'
              )}
            </h2>
            {!this.state.isCreatingSquad && (
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                Enter the 6-character league code to join
              </p>
            )}
          </div>

          {this.state.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded">
              {this.state.error}
            </div>
          )}

          {this.state.isCreatingSquad ? this.renderSquadForm() : this.renderJoinForm()}
        </div>
      </div>
    );
  }
}

export default JoinLeague;