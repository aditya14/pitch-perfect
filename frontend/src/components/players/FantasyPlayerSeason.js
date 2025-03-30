import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { getRoleIcon } from '../../utils/roleUtils';

// Helper function to get appropriate text color based on background color
const getTextColor = (hexColor) => {
  if (!hexColor) return '#FFFFFF';
  
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Calculate luminance - simplified formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Use white text for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// Helper function to create a lighter version of the squad color for backgrounds
const getLighterColor = (hexColor, opacity = 0.2) => {
  if (!hexColor) return 'rgba(59, 130, 246, 0.2)'; // Default blue with opacity
  
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Helper function to create darker color for gradients
const getDarkerColor = (hexColor) => {
  if (!hexColor) return '#2563EB'; // Default darker blue
  
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Make it darker by reducing each component by 30%
  const darker = {
    r: Math.max(0, Math.floor(r * 0.7)),
    g: Math.max(0, Math.floor(g * 0.7)),
    b: Math.max(0, Math.floor(b * 0.7))
  };
  
  return `#${darker.r.toString(16).padStart(2, '0')}${darker.g.toString(16).padStart(2, '0')}${darker.b.toString(16).padStart(2, '0')}`;
};

// Format date from ISO string to a readable format
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Enhanced MatchCard component
const MatchCard = ({ match }) => {
  const squadColor = match.squad_color || '#3B82F6'; // Default to blue
  const textColor = getTextColor(squadColor);
  const darkerColor = getDarkerColor(squadColor);
  const matchDate = formatDate(match.match?.date);
  
  // Extract points data
  const basePoints = match.basePoints || 0;
  const boostPoints = match.boostPoints || 0;
  const totalPoints = match.totalPoints || match.points || 0;
  
  return (
    <div 
      className="rounded-xl overflow-hidden shadow-lg mb-4 bg-white dark:bg-neutral-800 relative"
      style={{ 
        boxShadow: `0 4px 6px ${getLighterColor(squadColor, 0.3)}, 0 1px 3px ${getLighterColor(squadColor, 0.2)}`
      }}
    >
      {/* Top accent bar */}
      <div 
        className="h-1.5 w-full"
        style={{ 
          background: `linear-gradient(90deg, ${squadColor}, ${darkerColor})`
        }}
      ></div>
      
      {/* Card Header */}
      <div className="px-4 pt-3 pb-2 flex justify-between items-center border-b"
           style={{ borderColor: getLighterColor(squadColor, 0.2) }}>
        <div>
          <h3 className="font-bold text-neutral-900 dark:text-white text-sm sm:text-base">
            {match.for_team}
          </h3>
          <div className="flex items-center">
            <div 
              className="w-1 h-4 rounded-sm mr-1.5"
              style={{ backgroundColor: squadColor }}
            ></div>
            <span className="text-sm text-neutral-600 dark:text-neutral-300">{match.squad}</span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1 justify-end">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            {matchDate}
          </div>
          
          {/* Opponent */}
          <div className="text-xs text-neutral-600 dark:text-neutral-300">
            vs {match.opponent}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {/* Points Summary Section */}
        <div className="mb-4 border rounded-md overflow-hidden">
          <div className="bg-neutral-50 dark:bg-neutral-700/50 px-3 py-2 flex justify-between items-center">
            <div className="text-xs font-light text-neutral-500 dark:text-neutral-500">Base Points</div>
            <div className={`text-sm font-medium ${basePoints >= 60 ? 'text-green-600 dark:text-green-400' :
                 basePoints >= 35 ? 'text-blue-600 dark:text-blue-400' :
                 basePoints < 10 ? 'text-red-600 dark:text-red-400' :
                 'text-yellow-600 dark:text-yellow-400'}`}>
              {basePoints}
            </div>
          </div>
          
          {/* Boosted Points - Emphasize with squad color */}
          {match.boost_label && (
            <div 
              className="px-3 py-2 flex justify-between items-center border-t border-b"
              style={{ 
                backgroundColor: getLighterColor(squadColor, 0.15),
                borderColor: getLighterColor(squadColor, 0.3)
              }}
            >
              <div className="flex items-center">
                <span className="text-xs font-semibold mr-1.5 text-neutral-800 dark:text-neutral-200">
                  Boost: {match.boost_label}
                </span>
                {getRoleIcon(match.boost_label, 16, squadColor)}
              </div>
              <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">+{boostPoints}</div>
            </div>
          )}
          
          <div className="bg-neutral-50 dark:bg-neutral-700/50 px-3 py-2 flex justify-between items-center">
            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">TOTAL POINTS</div>
            <div className="text-lg font-bold text-neutral-900 dark:text-white">{totalPoints}</div>
          </div>
        </div>
        
        {/* Performance Stats Section - Using CSS grid for consistent layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Batting Stats */}
          {match.batting && (
            <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-lg p-3 h-full">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400">BATTING</h4>
              </div>
              
              <div className="text-sm sm:text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                {match.batting.runs}({match.batting.balls})
                {match.batting.not_out && <span className="ml-1">*</span>}
              </div>
              
              <div className="flex flex-wrap gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                {match.batting.fours > 0 && (
                  <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                    <span>{match.batting.fours}×4</span>
                  </div>
                )}
                {match.batting.sixes > 0 && (
                  <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                    <span>{match.batting.sixes}×6</span>
                  </div>
                )}
                <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                  <span className="mr-0.5">SR: {match.batting.strike_rate?.toFixed(1) || '-'}</span>
                  {match.batting.strike_rate >= 150 ? <ArrowUp className="h-3 w-3 text-green-500" /> : 
                   match.batting.strike_rate < 100 ? <ArrowDown className="h-3 w-3 text-red-500" /> : null}
                </div>
              </div>
            </div>
          )}
          
          {/* Empty placeholder if no batting data */}
          {!match.batting && <div className="hidden sm:block"></div>}
          
          {/* Bowling Stats */}
          {match.bowling && (
            <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-lg p-3 h-full">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400">BOWLING</h4>
              </div>
              
              <div className="text-sm sm:text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                {match.bowling.wickets}/{match.bowling.runs} ({match.bowling.overs})
              </div>
              
              <div className="flex flex-wrap gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                {match.bowling.maidens > 0 && (
                  <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                    <span>{match.bowling.maidens}M</span>
                  </div>
                )}
                <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                  <span className="mr-0.5">Econ: {match.bowling.economy?.toFixed(2) || '-'}</span>
                  {match.bowling.economy < 6 ? <ArrowUp className="h-3 w-3 text-green-500" /> : 
                   match.bowling.economy > 9 ? <ArrowDown className="h-3 w-3 text-red-500" /> : null}
                </div>
              </div>
            </div>
          )}
          
          {/* Empty placeholder if no bowling data */}
          {!match.bowling && <div className="hidden sm:block"></div>}
          
          {/* Fielding Stats */}
          {match.fielding && (
            <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-lg p-3 h-full">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400">FIELDING</h4>
              </div>
              
              <div className="flex flex-wrap gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {match.fielding.catches > 0 && (
                  <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-2 py-1 rounded whitespace-nowrap">
                    <span>{match.fielding.catches} catch{match.fielding.catches > 1 ? 'es' : ''}</span>
                  </div>
                )}
                {match.fielding.stumpings > 0 && (
                  <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-2 py-1 rounded whitespace-nowrap">
                    <span>{match.fielding.stumpings} stump{match.fielding.stumpings > 1 ? 's' : ''}</span>
                  </div>
                )}
                {match.fielding.runouts > 0 && (
                  <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-2 py-1 rounded whitespace-nowrap">
                    <span>{match.fielding.runouts} run out{match.fielding.runouts > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Empty placeholder if no fielding data */}
          {!match.fielding && <div className="hidden sm:block"></div>}
        </div>
      </div>
      
      {/* Bottom stripe */}
      <div 
        className="h-1"
        style={{ 
          background: `linear-gradient(90deg, ${squadColor}, transparent)`
        }}
      ></div>
    </div>
  );
};

// Responsive grid layout for match cards
const MatchGrid = ({ matches }) => {
  if (matches.length === 0) {
    return (
      <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
        No match history available for this player.
      </div>
    );
  }

  // Sort matches by date, most recent first
  const sortedMatches = [...matches].sort((a, b) => {
    const dateA = a.match?.date ? new Date(a.match.date) : new Date(0);
    const dateB = b.match?.date ? new Date(b.match.date) : new Date(0);
    return dateB - dateA;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sortedMatches.map((match, index) => (
        <div key={`match-${index}`}>
          <MatchCard match={match} />
        </div>
      ))}
    </div>
  );
};

const SeasonOverviewTable = ({ seasonStats }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm ring-1 ring-neutral-900/5 dark:ring-neutral-700">
    <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-neutral-200 dark:border-neutral-700">
      <h3 className="text-xs sm:text-base font-semibold leading-6 text-neutral-900 dark:text-white">
        Season Overview
      </h3>
    </div>
    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
      <table className="w-full divide-y divide-neutral-200 dark:divide-neutral-700 table-fixed">
        <thead>
          <tr className="bg-neutral-50 dark:bg-neutral-900/50">
            <th className="px-1 sm:px-4 py-1 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[25%]">Squad</th>
            <th className="px-1 sm:px-4 py-1 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Match</th>
            <th className="px-1 sm:px-4 py-1 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Base</th>
            <th className="px-1 sm:px-4 py-1 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Boost</th>
            <th className="px-1 sm:px-4 py-1 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Total</th>
            <th className="px-1 sm:px-4 py-1 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Avg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {seasonStats.map((stat, index) => (
            <tr 
              key={index} 
              className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors
                ${index === seasonStats.length - 1 ? "font-semibold" : ""}`}
            >
              <td className="px-1 sm:px-4 py-1 sm:py-2 whitespace-nowrap text-[10px] sm:text-sm text-neutral-900 dark:text-white truncate">{stat.squad}</td>
              <td className="px-1 sm:px-4 py-1 sm:py-2 whitespace-nowrap text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">{stat.matches}</td>
              <td className="px-1 sm:px-4 py-1 sm:py-2 whitespace-nowrap text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">{stat.basePoints}</td>
              <td className="px-1 sm:px-4 py-1 sm:py-2 whitespace-nowrap text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">{stat.boostPoints}</td>
              <td className="px-1 sm:px-4 py-1 sm:py-2 whitespace-nowrap text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">{stat.totalPoints}</td>
              <td className={`px-1 sm:px-4 py-1 sm:py-2 whitespace-nowrap text-[10px] sm:text-sm font-medium 
                ${stat.average >= 60 ? 'text-green-600 dark:text-green-400' : 
                  stat.average >= 35 ? 'text-blue-600 dark:text-blue-400' : 
                  stat.average < 10 ? 'text-red-600 dark:text-red-400' : 
                  'text-yellow-600 dark:text-yellow-400'}`}>
                {stat.average?.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const FantasyPlayerSeason = ({ player, leagueId }) => {
  const [seasonStats, setSeasonStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/leagues/${leagueId}/players/${player.id}/performance/`);
        console.log("Player performance data:", response.data);
        setSeasonStats(response.data.seasonStats);
        setMatches(response.data.matches);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load player stats');
      } finally {
        setIsLoading(false);
      }
    };

    if (player.id && leagueId) {
      fetchData();
    }
  }, [player.id, leagueId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent dark:border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 text-center py-8">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SeasonOverviewTable seasonStats={seasonStats} />
      <div>
        <h3 className="text-sm sm:text-lg font-medium leading-6 text-neutral-900 dark:text-white mb-4">Match History</h3>
        <MatchGrid matches={matches} />
      </div>
    </div>
  );
};

export default FantasyPlayerSeason;