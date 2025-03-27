import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft } from 'lucide-react';
import FantasyPlayerView from './FantasyPlayerView';
import axios from '../../utils/axios';

const PlayerModal = ({ playerId, leagueId, isOpen, onClose }) => {
  const [playerData, setPlayerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
  const contentRef = useRef(null);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current body overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Prevent scrolling on the body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      
      // Restore original body overflow style when modal closes
      return () => {
        const scrollY = document.body.style.top;
        document.body.style.overflow = originalStyle;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };
    }
  }, [isOpen]);

  // Handle touch events to prevent background scrolling on iOS
  useEffect(() => {
    if (!isOpen) return;
    
    const handleTouchMove = (e) => {
      // Allow scrolling inside the modal content
      if (contentRef.current && contentRef.current.contains(e.target)) {
        // If content is scrollable (scrollHeight > clientHeight), don't prevent default
        if (contentRef.current.scrollHeight > contentRef.current.clientHeight) {
          return;
        }
      }
      
      // Prevent scrolling outside of scrollable content
      e.preventDefault();
    };
    
    // Add event listener for touchmove
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // Clean up
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen]);

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const url = `/leagues/${leagueId}/players/${playerId}/`;
        
        const response = await axios.get(url);
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
    <div className="fixed inset-0 z-50 touch-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 dark:bg-black/50" 
        onClick={onClose}
      />

      {/* Modal Container - positioned lower on mobile to avoid status bar */}
      <div className="fixed inset-x-0 bottom-0 top-[env(safe-area-inset-top,44px)] sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        {/* Modal Panel - Truly full width/height on mobile, 90% width on desktop */}
        <div 
          ref={modalRef}
          className="relative w-full h-full sm:w-[90%] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-lg bg-white dark:bg-gray-800 shadow-xl transform transition-all overflow-hidden flex flex-col touch-auto"
        >
          {/* Header - Fixed */}
          <div className="flex-shrink-0 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 sm:px-6 py-3 sm:py-4 sm:rounded-t-lg">
            {playerData && (
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate pr-2">
                {playerData.name} - {playerData.team}
              </h3>
            )}
            <button
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 flex-shrink-0 hidden sm:block"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* Mobile Back Button - Only visible on mobile */}
          <div className="sm:hidden sticky top-[53px] z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <button
              onClick={onClose}
              className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          </div>

          {/* Content - Scrollable div with flex-grow to take available height without overflowing viewport */}
          <div 
            ref={contentRef}
            className="flex-grow overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch"
          >
            <div className="px-4 sm:px-6 py-4 min-h-[calc(100vh-160px)] sm:min-h-0">
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
    </div>,
    document.body
  );
};

export default PlayerModal;