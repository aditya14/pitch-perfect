import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../utils/axios';

const UpdatePointsButton = ({ matchId = null }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const updatePoints = async () => {
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
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setShowDetails(false);
      }, 5000);
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
        className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 dark:border-orange-600 rounded-md 
                  text-sm font-medium text-orange-700 dark:text-orange-200 bg-white dark:bg-gray-800 
                  hover:bg-orange-50 dark:hover:bg-gray-700 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 dark:focus:ring-offset-gray-900"
        onClick={updatePoints}
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Updating...' : 'Update Points'}
      </button>
      
      {showDetails && result && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-md shadow-lg 
                        border border-green-200 dark:border-green-800 z-10
                        max-w-xs sm:max-w-sm md:max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-green-600 dark:text-green-400 font-semibold">✓ Update Complete</h4>
            <button 
              onClick={() => setShowDetails(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
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
        <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-md shadow-lg 
                        border border-red-200 dark:border-red-800 z-10
                        max-w-xs sm:max-w-sm md:max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-red-600 dark:text-red-400 font-semibold">Error</h4>
            <button 
              onClick={() => setError(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
        </div>
      )}
    </div>
  );
};

export default UpdatePointsButton;