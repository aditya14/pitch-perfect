// MidSeasonDraftOrderModal.js
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Info, 
  Calendar,
  Users,
  Clock, 
  AlertTriangle,
  Check
} from 'lucide-react';

const MidSeasonDraftOrderModal = ({ 
    isOpen, 
    onClose, 
    leagueId, 
    players, 
    fetchDraftOrder, 
    isLoading,
    retainedPlayers = []
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
    percentComplete: 0
  });

  const draftDeadline = new Date('2025-04-19T13:00:00Z'); // April 19, 2025 1:00 PM UTC

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

  // Function to safely format 2-digit numbers with leading zero
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "00";
    return num < 10 ? `0${num}` : `${num}`;
  };

  // Determine color based on time remaining
  const getProgressColor = () => {
    if (timeLeft.days >= 3) return "bg-emerald-500 dark:bg-emerald-600";
    if (timeLeft.days >= 1) return "bg-yellow-500 dark:bg-yellow-600";
    return "bg-red-500 dark:bg-red-600";
  };

  const LoadingPlaceholder = () => (
    <div className="animate-pulse space-y-6 w-full">
      <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-4"></div>
      <div className="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-7xl max-h-[90vh] flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Mid-Season Draft
          </h2>
          
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <LoadingPlaceholder />
          ) : (
            <>
              {/* Top row - Countdown and Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Countdown Timer */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-medium text-neutral-900 dark:text-white">
                      Draft Opens In
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
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-2 text-center">
                      <div className="font-mono font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white">
                        {formatNumber(timeLeft.days)}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">
                        Days
                      </div>
                    </div>
                    
                    <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-2 text-center">
                      <div className="font-mono font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white">
                        {formatNumber(timeLeft.hours)}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">
                        Hours
                      </div>
                    </div>
                    
                    <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-2 text-center">
                      <div className="font-mono font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white">
                        {formatNumber(timeLeft.minutes)}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">
                        Mins
                      </div>
                    </div>
                    
                    <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-2 text-center">
                      <div className="font-mono font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white">
                        {formatNumber(timeLeft.seconds)}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">
                        Secs
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Key Information */}
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                        Draft Overview
                      </h3>
                      <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-200">
                        <li>The mid-season draft runs <strong>April 19-22</strong> (between Matches 36-40)</li>
                        <li>Your Week 5 boost players are  <strong>automatically retained</strong></li>
                        <li>Draft order is based on standings after Match 39 with best teams picking first</li>
                        <li>Snake format means the draft order reverses each round</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom row - Timeline and Retained Players */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Timeline */}
                <div className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Draft Timeline
                  </h3>
                  
                  <div className="relative border-l-2 border-blue-300 dark:border-blue-700 ml-3 pl-6 pb-1">
                    <div className="mb-6 relative">
                      <div className="absolute w-4 h-4 bg-blue-500 rounded-full -left-8 top-0 border-2 border-white dark:border-neutral-800"></div>
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Draft Preparation (April 12 - 18)</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        Assign your boosts for Week 5 (which starts April 19). These players will be your retained players.
                      </p>
                    </div>
                    
                    <div className="mb-6 relative">
                      <div className="absolute w-4 h-4 bg-neutral-300 dark:bg-neutral-600 rounded-full -left-8 top-0 border-2 border-white dark:border-neutral-800"></div>
                      <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Draft Opens (April 19)</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        The draft opens at 6:30pm IST on April 19th. All non-retained players are available for selection and are default sorted by their average points per match this season. You may reorder players according to your preference.
                      </p>
                    </div>
                    
                    <div className="mb-6 relative">
                      <div className="absolute w-4 h-4 bg-neutral-300 dark:bg-neutral-600 rounded-full -left-8 top-0 border-2 border-white dark:border-neutral-800"></div>
                      <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Draft Closes (April 22)</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        The draft ordering is locked at 6:30pm IST on April 22nd, one hour prior to the start of Match 40. The snake draft is run and your squad is updated with your new players.
                      </p>
                    </div>

                    <div className="mb-6 relative">
                      <div className="absolute w-4 h-4 bg-neutral-300 dark:bg-neutral-600 rounded-full -left-8 top-0 border-2 border-white dark:border-neutral-800"></div>
                      <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Assign Week 6 Boosts (April 22-26)</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        Once squads have been updated, you can assign your boosts for Week 6 (which starts April 26) like any other week.
                      </p>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute w-4 h-4 bg-neutral-300 dark:bg-neutral-600 rounded-full -left-8 top-0 border-2 border-white dark:border-neutral-800"></div>
                      <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Rest of Season (April 22 - May 25)</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        Compete with your updated squad for the remainder of the season.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MidSeasonDraftOrderModal;