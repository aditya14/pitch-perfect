import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../utils/axios';
import { Shield, Users, AlertCircle } from 'lucide-react';
import { SquadForm } from '../squads/CreateSquad';

const JoinLeague = () => {
  const [leagueCode, setLeagueCode] = useState('');
  const [status, setStatus] = useState({
    error: null,
    isCreatingSquad: false,
    leagueDetails: null,
    redirect: false,
    isSubmitting: false
  });

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setStatus(prev => ({ ...prev, error: null, isSubmitting: true }));

    try {
      // Use the original endpoint from the old JoinLeague component
      const response = await api.post('/leagues/join/', {
        league_code: leagueCode.toUpperCase()
      });

      setStatus(prev => ({ 
        ...prev, 
        isCreatingSquad: true,
        leagueDetails: response.data.league,
        isSubmitting: false
      }));
    } catch (error) {
      console.error('Error joining league:', error);
      setStatus(prev => ({ 
        ...prev,
        error: error.response?.data?.error || 'Failed to join league',
        isSubmitting: false
      }));
    }
  };

  const handleSquadSubmit = async (formData) => {
    setStatus(prev => ({ ...prev, error: null, isSubmitting: true }));

    try {
      // Create the squad using the league ID from leagueDetails
      await api.post('/squads/', {
        name: formData.name,
        color: formData.color,
        league: status.leagueDetails.id
      });
      
      // Redirect on success
      setStatus(prev => ({ ...prev, redirect: true }));
    } catch (error) {
      console.error('Error creating squad:', error);
      setStatus(prev => ({ 
        ...prev,
        error: error.response?.data?.error || 'Failed to create squad',
        isSubmitting: false
      }));
    }
  };

  // Handle redirect
  if (status.redirect) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:py-12">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          {status.isCreatingSquad ? (
            <Shield className="h-12 w-12 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
          ) : (
            <Users className="h-12 w-12 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
          )}
          
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
            {status.isCreatingSquad ? (
              `Create Squad for ${status.leagueDetails?.name || 'League'}`
            ) : (
              'Join a League'
            )}
          </h2>
          
          {!status.isCreatingSquad && (
            <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
              Enter the league code to join
            </p>
          )}
        </div>
        
        {/* Main Card */}
        <div className="bg-white dark:bg-neutral-800 shadow-md rounded-lg p-6 mb-6">
          {/* Error Message */}
          {status.error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-800 dark:text-red-300 px-4 py-3 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{status.error}</span>
              </div>
            </div>
          )}
          
          {status.isCreatingSquad ? (
            // Squad creation form
            <SquadForm
              leagueId={status.leagueDetails?.id}
              leagueData={status.leagueDetails}
              existingSquads={status.leagueDetails?.squads || []}
              onSubmit={handleSquadSubmit}
              submitLabel="Create Squad"
              isProcessing={status.isSubmitting}
            />
          ) : (
            // League code input form
            <form onSubmit={handleJoinSubmit}>
              <div>
                <label htmlFor="leagueCode" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  League Code
                </label>
                <input
                  id="leagueCode"
                  type="text"
                  required
                  maxLength="6"
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm 
                    transition-colors duration-200
                    bg-white dark:bg-neutral-700 
                    text-neutral-900 dark:text-white
                    focus:outline-none focus:ring-primary-500 focus:border-primary-500 
                    dark:border-neutral-600"
                  placeholder="Enter league code"
                  value={leagueCode}
                  onChange={(e) => setLeagueCode(e.target.value.toUpperCase())}
                />
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={status.isSubmitting}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium 
                         text-white bg-primary-600 hover:bg-primary-700 
                         dark:bg-primary-700 dark:hover:bg-primary-800
                         transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-neutral-800
                         disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {status.isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    'Join League'
                  )}
                </button>
              </div>
            </form>
          )}
          
          {/* Back button when in squad creation mode */}
          {status.isCreatingSquad && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setStatus(prev => ({ ...prev, isCreatingSquad: false }))}
                className="w-full text-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400"
              >
                ← Back to league code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinLeague;