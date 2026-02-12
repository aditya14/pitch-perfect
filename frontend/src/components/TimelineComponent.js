import React, { useState, useEffect } from 'react';
import { X, Clock, Check, ChevronDown, ChevronUp, AlertCircle, Calendar, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const TimelineComponent = () => {
  const [minimized, setMinimized] = useState(true);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');
  
  // Important dates - Using EDT timezone
  const dates = {
    draftRankingEnd: new Date('2025-03-21T10:00:00-04:00'),
    boostSetupEnd: new Date('2025-03-22T10:00:00-04:00'),
    seasonStart: new Date('2025-03-22T10:00:00-04:00')
  };
  
  // Define timeline phases
  const phases = [
    {
      title: "Player Ranking",
      description: "Rank players for the draft according to your preferences",
      deadline: dates.draftRankingEnd,
      icon: <Clock className="text-blue-400" size={20} />
    },
    {
      title: "Squad Management",
      description: "Assign player boosts and get ready for the season",
      deadline: dates.boostSetupEnd,
      icon: <Clock className="text-yellow-400" size={20} />
    },
    {
      title: "Season Start",
      description: "IPL 2025 kicks off! Week 1 boosts are locked",
      deadline: null,
      icon: <Check className="text-green-400" size={20} />
    }
  ];

  // Calculate current phase and time remaining
  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date();
      
      // Determine current phase
      if (now < dates.draftRankingEnd) {
        setCurrentPhase(0);
        const diff = dates.draftRankingEnd - now;
        formatTimeRemaining(diff);
      } else if (now < dates.boostSetupEnd) {
        setCurrentPhase(1);
        const diff = dates.boostSetupEnd - now;
        formatTimeRemaining(diff);
      } else {
        setCurrentPhase(2);
        setTimeRemaining('');
      }
    };
    
    const formatTimeRemaining = (milliseconds) => {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m left`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s left`);
      }
    };
    
    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, []);
  
  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    const now = new Date();
    
    if (now < dates.draftRankingEnd) {
      // In Phase 1: Calculate from season start to draft ranking end
      const totalTime = dates.draftRankingEnd - new Date('2025-03-16T00:00:00-04:00'); // Assuming March 16 as start date
      const elapsed = now - new Date('2025-03-16T00:00:00-04:00');
      return Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
    } else if (now < dates.boostSetupEnd) {
      // In Phase 2: Calculate between draft end and boost setup end
      const totalTime = dates.boostSetupEnd - dates.draftRankingEnd;
      const elapsed = now - dates.draftRankingEnd;
      return Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
    } else {
      // Phase 3 and beyond: 100%
      return 100;
    }
  };

  const progressPercentage = calculateProgress();

  return (
    <div className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-md mb-6 text-neutral-900 dark:text-white overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer bg-neutral-50 dark:bg-neutral-900"
        onClick={() => setMinimized(!minimized)}
      >
        <div className="flex items-center space-x-2">
          <Calendar className="text-blue-500 dark:text-blue-400" size={20} />
          <h3 className="font-bold">Set Your Boosts</h3>
          {timeRemaining && (
            <span className="hidden sm:inline-block text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded">
              {timeRemaining}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {timeRemaining && (
            <span className="sm:hidden text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded">
              {timeRemaining}
            </span>
          )}
          <Link 
            to="/how-it-works" 
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <HelpCircle size={18} />
          </Link>
          {minimized ? (
            <ChevronDown size={20} className="text-neutral-500 dark:text-neutral-400" />
          ) : (
            <ChevronUp size={20} className="text-neutral-500 dark:text-neutral-400" />
          )}
        </div>
      </div>
      
      {/* Timeline content */}
      {!minimized && (
        <div className="p-4">
          {/* Progress bar */}
          <div className="mb-6 relative pt-1">
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full">
              <div 
                className="h-2 rounded-full bg-blue-500" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            {/* Phase markers */}
            <div className="flex justify-between mt-1">
              <div className={`text-xs ${currentPhase > 0 ? 'text-neutral-500 dark:text-neutral-400' : 'text-blue-600 dark:text-blue-400'}`}>
                Now
              </div>
              <div className={`text-xs ${currentPhase > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                Mar 21
              </div>
              <div className={`text-xs ${currentPhase > 1 ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                Mar 22
              </div>
            </div>
          </div>
          
          {/* Desktop Timeline (horizontal) - hidden on mobile */}
          <div className="hidden md:block relative mb-8">
            {/* Horizontal timeline line */}
            <div className="absolute h-1 w-full bg-gradient-to-r from-blue-500 via-yellow-500 to-green-500 top-4 rounded-full"></div>
            
            <div className="flex justify-between relative">
              {phases.map((phase, index) => (
                <div 
                  key={index} 
                  className={`w-1/3 px-2 ${index < currentPhase ? 'opacity-70' : ''}`}
                >
                  {/* Phase indicator */}
                  <div className="flex justify-center mb-6">
                    <div 
                      className={`h-8 w-8 rounded-full flex items-center justify-center border-2 z-10
                      ${index === currentPhase 
                        ? 'bg-white dark:bg-neutral-800 border-blue-500 pulse-animation' 
                        : index < currentPhase 
                          ? 'bg-white dark:bg-neutral-800 border-green-500' 
                          : 'bg-white dark:bg-neutral-800 border-neutral-400 dark:border-neutral-600'}`}
                    >
                      {phase.icon}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <h4 className={`font-semibold text-lg ${
                        index === currentPhase 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : index < currentPhase 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {phase.title}
                      </h4>
                      
                      {index === currentPhase && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">{phase.description}</p>
                    
                    {phase.deadline && (
                      <div className="inline-flex items-center px-3 py-1 bg-neutral-100 dark:bg-neutral-900 rounded-full text-xs text-neutral-600 dark:text-neutral-300">
                        <Clock size={12} className="mr-1" />
                        <span>{formatDate(phase.deadline)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Mobile Timeline (vertical) - shown only on mobile */}
          <div className="md:hidden relative">
            {/* Timeline vertical line */}
            <div className="absolute h-full w-1 bg-gradient-to-b from-blue-500 via-yellow-500 to-green-500 left-3 top-0 rounded-full"></div>
            
            {phases.map((phase, index) => (
              <div 
                key={index} 
                className={`flex mb-8 last:mb-0 relative ${index < currentPhase ? 'opacity-70' : ''}`}
              >
                {/* Phase indicator */}
                <div className="flex-shrink-0 z-10">
                  <div 
                    className={`h-7 w-7 rounded-full flex items-center justify-center border-2 
                    ${index === currentPhase 
                      ? 'bg-white dark:bg-neutral-800 border-blue-500 pulse-animation' 
                      : index < currentPhase 
                        ? 'bg-white dark:bg-neutral-800 border-green-500' 
                        : 'bg-white dark:bg-neutral-800 border-neutral-400 dark:border-neutral-600'}`}
                  >
                    {phase.icon}
                  </div>
                </div>
                
                <div className="ml-6">
                  <div className="flex items-center flex-wrap">
                    <h4 className={`font-semibold text-lg ${
                      index === currentPhase 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : index < currentPhase 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {phase.title}
                    </h4>
                    
                    {index === currentPhase && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-full">
                        Active Now
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 mb-2">{phase.description}</p>
                  
                  {phase.deadline && (
                    <div className="inline-flex items-center px-3 py-1 bg-neutral-100 dark:bg-neutral-900 rounded-full text-xs text-neutral-600 dark:text-neutral-300">
                      <Clock size={12} className="mr-1" />
                      <span>{formatDate(phase.deadline)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Action prompt based on current phase */}
          <div className="mt-6 p-3 bg-neutral-100 dark:bg-neutral-900 rounded border-l-4 border-blue-500">
            {currentPhase === 0 && (
              <div className="flex items-start">
                <AlertCircle className="text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  <strong>Action required:</strong> Rank players according to your preferences. Squads are assigned on {formatDate(phases[0].deadline)}.
                </p>
              </div>
            )}
            {currentPhase === 1 && (
              <div className="flex items-start">
                <AlertCircle className="text-yellow-500 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  <strong>Action required:</strong> Review your squad, assign your Core Roles, and consider making trades before Week 1 starts on March 22nd at 10:00 AM EDT.
                </p>
              </div>
            )}
            {currentPhase === 2 && (
              <div className="flex items-start">
                <Check className="text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  <strong>Season in progress!</strong> Week 1 Core Roles are locked. Good luck with your fantasy squad!
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex">
            <Link to="/how-it-works" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm font-medium">
              <HelpCircle size={14} className="mr-1" />
              Learn more about Pitch Perfect fantasy rules
            </Link>
          </div>
        </div>
      )}
      
      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
        
        .pulse-animation {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default TimelineComponent;
