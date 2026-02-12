import React, { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import api from '../utils/axios';

const UpdatePointsButton = ({ matchId = null, variant = 'icon', onBeforeUpdate = null }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const updatePoints = async () => {
    if (onBeforeUpdate) onBeforeUpdate();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const payload = matchId 
        ? { match_id: matchId } 
        : { update_all: true };
      
      const response = await api.post('/update-match-points/', payload);
      setResult(response.data);
      setShowDetails(true);

      // Auto-refresh after 1 second if successful
      setTimeout(() => {
        setShowDetails(false);
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while updating points');
      console.error('Error updating points:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        className={
          variant === 'menu'
            ? 'lg-dropdown-item text-slate-800 dark:text-slate-200 flex items-center w-full disabled:opacity-60 disabled:cursor-not-allowed'
            : `
              flex items-center justify-center h-8 w-8 rounded-full
              bg-orange-600 hover:bg-orange-700 text-white
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-colors
            `
        }
        onClick={updatePoints}
        disabled={loading}
        title="Update Points"
        aria-label="Update Points"
        style={variant === 'menu' ? undefined : { minWidth: 0, minHeight: 0, padding: 0 }}
      >
        {variant === 'menu' ? (
          <>
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-3 animate-spin" />
            ) : result && showDetails ? (
              <Check className="h-4 w-4 mr-3 text-green-600 dark:text-green-400" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-3" />
            )}
            {loading ? 'Updating Points...' : 'Update Points'}
          </>
        ) : (
          <>
            {loading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : result && showDetails ? (
              <Check className="h-5 w-5 text-white" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </>
        )}
      </button>
      
      {showDetails && result && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-neutral-800 rounded-md shadow-lg 
                        border border-green-200 dark:border-green-800 z-10
                        max-w-xs sm:max-w-sm md:max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-green-600 dark:text-green-400 font-semibold">✓ Update Complete</h4>
            <button 
              onClick={() => setShowDetails(false)}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
            >
              ×
            </button>
          </div>
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            {result.matches_updated !== undefined ? (
              <p>
                Updated <span className="font-medium">{result.matches_updated}</span> matches with{' '}
                <span className="font-medium">{result.player_events_updated}</span> player events and{' '}
                <span className="font-medium">{result.fantasy_events_updated}</span> fantasy events.
              </p>
            ) : (
              <p>
                Updated match with <span className="font-medium">{result.player_events_updated}</span> player events and{' '}
                <span className="font-medium">{result.fantasy_events_updated}</span> fantasy events.
              </p>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-neutral-800 rounded-md shadow-lg 
                        border border-red-200 dark:border-red-800 z-10
                        max-w-xs sm:max-w-sm md:max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-red-600 dark:text-red-400 font-semibold">Error</h4>
            <button 
              onClick={() => setError(null)}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{error}</p>
        </div>
      )}
    </div>
  );
};

export default UpdatePointsButton;
