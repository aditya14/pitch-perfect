// Add this to frontend/src/components/leagues/MidSeasonDraftPanel.js

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Info, Clock } from 'lucide-react';
import api from '../../utils/axios';
import { MidSeasonDraftOrderModal } from './modals/MidSeasonDraftOrderModal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

const MidSeasonDraftPanel = ({ leagueId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draftOrder, setDraftOrder] = useState(null);
  const [players, setPlayers] = useState([]);
  const [retainedPlayers, setRetainedPlayers] = useState([]);
  const [saveError, setSaveError] = useState(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
    percentComplete: 0
  });

  const draftDeadline = new Date('2025-04-22T13:00:00Z'); // April 22, 2025 1:00 PM UTC

  // Fetch draft order and players
  const fetchDraftOrder = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch retained players
      const retainedResponse = await api.get(`/leagues/${leagueId}/retained-players/`);
      setRetainedPlayers(retainedResponse.data.retained_players || []);
      
      // Fetch draft order
      const draftResponse = await api.get(`/leagues/${leagueId}/mid-season-draft-order/`);
      setDraftOrder(draftResponse.data);
      
      // Fetch draft pool (available players)
      const playersResponse = await api.get(`/leagues/${leagueId}/mid-season-draft-pool/`);
      setPlayers(playersResponse.data || []);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching mid-season draft data:', err);
      setError(err.response?.data?.error || 'Failed to load draft data');
      setLoading(false);
    }
  };
  
  // Save updated draft order
  const saveDraftOrder = async (newOrder) => {
    setSaveError(null);
    
    try {
      const response = await api.post(`/leagues/${leagueId}/mid-season-draft-order/`, {
        order: newOrder
      });
      
      setDraftOrder(response.data);
      return response.data;
    } catch (err) {
      console.error('Error saving draft order:', err);
      setSaveError(err.response?.data?.error || 'Failed to save draft order');
      throw err;
    }
  };
  
  // Calculate time remaining until draft deadline
  useEffect(() => {
    // Calculate total seconds between now and deadline for progress calculation
    const calculateTotalInitialSeconds = () => {
      // Start counting 7 days before deadline as 0%
      const startDate = new Date(draftDeadline);
      startDate.setDate(startDate.getDate() - 7);
      const now = new Date();
      return Math.max(0, Math.floor((draftDeadline - startDate) / 1000));
    };

    const totalInitialSeconds = calculateTotalInitialSeconds();

    const calculateTimeLeft = () => {
      try {
        const now = new Date();
        const difference = new Date(draftDeadline) - now;
        
        if (difference <= 0) {
          return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            expired: true,
            percentComplete: 100
          };
        }

        // Calculate percentage complete (inverted, since we want progress toward deadline)
        const startDate = new Date(draftDeadline);
        startDate.setDate(startDate.getDate() - 7);
        const elapsedSeconds = Math.floor((now - startDate) / 1000);
        const percentComplete = Math.min(100, Math.max(0, (elapsedSeconds / totalInitialSeconds) * 100));

        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          expired: false,
          percentComplete: percentComplete
        };
      } catch (error) {
        console.error("Error calculating time left:", error);
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: false,
          percentComplete: 0
        };
      }
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [draftDeadline]);

  // Format number with leading zero
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "00";
    return num < 10 ? `0${num}` : `${num}`;
  };

  const getDisplayUnits = () => {
    if (timeLeft.days > 0) {
      return [
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
      ];
    }
    if (timeLeft.hours > 0) {
      return [
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Mins', value: timeLeft.minutes },
      ];
    }
    return [
      { label: 'Mins', value: timeLeft.minutes },
      { label: 'Secs', value: timeLeft.seconds },
    ];
  };

  // Determine color based on time remaining
  const getProgressColor = () => {
    if (timeLeft.days >= 3) return "bg-emerald-500 dark:bg-emerald-600";
    if (timeLeft.days >= 1) return "bg-yellow-500 dark:bg-yellow-600";
    return "bg-red-500 dark:bg-red-600";
  };
  
  // Open the draft modal and fetch data
  const handleOpenModal = () => {
    fetchDraftOrder();
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Mid-Season Draft</h2>
      </div>
      
      <div className="p-4">
        {error ? (
          <ErrorMessage message={error} />
        ) : (
          <>
            {/* Countdown Timer */}
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-medium text-neutral-900 dark:text-white">
                  {timeLeft.expired ? "Draft Closed" : "Draft Closes In"}
                </h3>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full mb-3 overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor()} rounded-full transition-all duration-500 ease-in-out`}
                  style={{ width: `${timeLeft.percentComplete}%` }}
                ></div>
              </div>
              
              {/* Timer containers */}
              <div className="grid grid-cols-2 gap-2">
                {getDisplayUnits().map((unit) => (
                  <div key={unit.label} className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-2 text-center">
                    <div className="font-mono font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white">
                      {formatNumber(unit.value)}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">
                      {unit.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800 mb-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Mid-Season Draft Overview
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-200">
                    <li>Your Week 5 boost players will be <strong>automatically retained</strong></li>
                    <li>The draft opens <strong>April 19th</strong> and closes <strong>April 22nd</strong></li>
                    <li>The draft order is based on the standings, with the lowest-ranked teams picking first</li>
                    <li>A snake format is used, with the order reversing each round</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Action Button */}
            <div className="text-center">
              <button
                onClick={handleOpenModal}
                disabled={timeLeft.expired}
                className={`px-4 py-2 font-medium rounded-md ${
                  timeLeft.expired
                    ? 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                }`}
              >
                {timeLeft.expired ? 'Draft Closed' : 'Update Draft Preferences'}
              </button>
              
              {timeLeft.expired && (
                <div className="mt-2 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">The draft period has ended</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Draft Order Modal */}
      {isModalOpen && (
        <MidSeasonDraftOrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          leagueId={leagueId}
          players={players}
          fetchDraftOrder={fetchDraftOrder}
          saveDraftOrder={saveDraftOrder}
          draftOrder={draftOrder}
          isLoading={loading}
          saveError={saveError}
          retainedPlayers={retainedPlayers}
        />
      )}
    </div>
  );
};

export default MidSeasonDraftPanel;
