import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import FantasyPlayerView from './FantasyPlayerView';
import axios from '../../utils/axios';

const PlayerModal = ({ playerId, leagueId, isOpen, onClose }) => {
  const [playerData, setPlayerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('PlayerModal effect triggered with:', { playerId, leagueId, isOpen });
    
    const loadPlayerData = async () => {
      try {
        console.log('Attempting to load player data...');
        setIsLoading(true);
        setError(null);
        
        const url = `/leagues/${leagueId}/players/${playerId}/`;
        console.log('Making request to:', url);
        
        const response = await axios.get(url);
        console.log('Received player data:', response.data);
        setPlayerData(response.data);
      } catch (err) {
        console.error('Error loading player data:', err);
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
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 dark:bg-black/50" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 overflow-hidden p-4 sm:p-6">
        <div className="flex min-h-full items-start justify-center">
          {/* Modal Panel */}
          <div className="relative w-full max-w-4xl rounded-lg bg-white dark:bg-gray-800 shadow-xl transform transition-all">
            {/* Header - Fixed */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 rounded-t-lg">
              {playerData && (
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {playerData.name} - {playerData.team}
                </h3>
              )}
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div className="px-6 py-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent dark:border-blue-500"></div>
                  </div>
                ) : error ? (
                  <div className="text-red-600 dark:text-red-400 text-center py-8">
                    {error}
                  </div>
                ) : playerData && (
                  <FantasyPlayerView player={playerData} leagueId={leagueId} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlayerModal;