import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../utils/axios';
import { Shield, Users, AlertCircle, ChevronRight, Hash } from 'lucide-react';
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
      await api.post('/squads/', {
        name: formData.name,
        color: formData.color,
        league: status.leagueDetails.id
      });

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

  if (status.redirect) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8 px-4 sm:py-12">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/6 w-56 h-56 rounded-full bg-gradient-to-br from-primary-400/10 to-primary-600/10 dark:from-primary-400/15 dark:to-primary-600/15 lg-float"></div>
        <div className="absolute bottom-1/4 right-1/6 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400/10 to-primary-500/10 dark:from-blue-400/15 dark:to-primary-500/15 lg-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-xl w-full mx-auto relative z-10">
        <div className="text-center mb-6">
          <div className="lg-glass-secondary lg-rounded-lg w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            {status.isCreatingSquad ? (
              <Shield className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            ) : (
              <Users className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-caption">
            {status.isCreatingSquad
              ? `Create Squad for ${status.leagueDetails?.name || 'League'}`
              : 'Join a League'}
          </h2>

          {!status.isCreatingSquad && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Enter your 6-character league code to get started.
            </p>
          )}
        </div>

        <div className="lg-glass lg-rounded-lg p-6 sm:p-7 lg-glow">
          {status.error && (
            <div className="lg-alert lg-glass-danger mb-6">
              <AlertCircle className="lg-alert-icon" />
              <span className="text-sm font-medium">{status.error}</span>
            </div>
          )}

          {status.isCreatingSquad ? (
            <>
              <div className="lg-glass-tertiary lg-rounded-md px-4 py-3 mb-5">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  You are joining <span className="font-semibold text-slate-900 dark:text-white">{status.leagueDetails?.name}</span>. Create your squad to finish setup.
                </p>
              </div>
              <SquadForm
                leagueId={status.leagueDetails?.id}
                leagueData={status.leagueDetails}
                existingSquads={status.leagueDetails?.squads || []}
                onSubmit={handleSquadSubmit}
                submitLabel="Create Squad"
                isProcessing={status.isSubmitting}
              />
            </>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-5">
              <div>
                <label htmlFor="leagueCode" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  League Code
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                  <input
                    id="leagueCode"
                    type="text"
                    required
                    maxLength="6"
                    className="w-full pl-10 pr-3 py-3 lg-rounded-md border border-slate-300/60 dark:border-slate-600/70 bg-white/80 dark:bg-slate-800/70 text-slate-900 dark:text-white uppercase tracking-[0.2em] font-semibold placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/60"
                    placeholder="ABC123"
                    value={leagueCode}
                    onChange={(e) => setLeagueCode(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status.isSubmitting}
                className="w-full lg-button lg-rounded-md py-3 font-semibold text-white inline-flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status.isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    Join League
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </form>
          )}

          {status.isCreatingSquad && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setStatus(prev => ({ ...prev, isCreatingSquad: false }))}
                className="w-full text-center text-sm text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {'<-'} Back to league code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinLeague;
