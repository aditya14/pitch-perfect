import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import FantasyPlayerView from './FantasyPlayerView';
import axios from '../../utils/axios';  // Make sure this points to your axios instance

const PlayerModal = ({ playerId, leagueId, isOpen, onClose }) => {
  const [playerData, setPlayerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axios.get(`/leagues/${leagueId}/players/${playerId}/`);
        setPlayerData(response.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (playerId && leagueId && isOpen) {
      loadPlayerData();
    }
  }, [playerId, leagueId, isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black opacity-30" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
          <div className="flex justify-between items-start">
            {playerData && (
              <h3 className="text-lg font-medium text-gray-900">
                {playerData.name} - {playerData.team}
              </h3>
            )}
            <button
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-4">
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-center py-8">
                Error loading player data: {error}
              </div>
            )}

            {!isLoading && !error && playerData && (
              <FantasyPlayerView player={playerData} leagueId={leagueId} />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlayerModal;