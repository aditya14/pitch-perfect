import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { Calendar } from 'lucide-react';

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

// Format date from ISO string to a readable format
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Redesigned match card component with landscape orientation
const MatchCard = ({ match }) => {
  // Default color if squad_color is not provided
  const squadColor = match.squad_color || '#3B82F6'; // Default to blue
  const textColor = getTextColor(squadColor);
  const matchDate = formatDate(match.match?.date);
  
  return (
    <div 
      className="rounded-lg shadow-md overflow-hidden border flex flex-col h-full"
      style={{ 
        backgroundColor: getLighterColor(squadColor, 0.05),
        borderColor: getLighterColor(squadColor, 0.3)
      }}
    >
      {/* Header section with match details */}
      <div className="p-3 border-b" style={{ borderColor: getLighterColor(squadColor, 0.3) }}>
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">vs {match.opponent}</h3>
          
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="h-3 w-3 mr-1" />
            {matchDate}
          </div>
        </div>
        
        <div className="flex items-center">
          {/* Squad with color bar */}
          <div 
            className="w-1 h-4 rounded-sm mr-2"
            style={{ backgroundColor: squadColor }}
          ></div>
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{match.squad}</span>
          
          {/* Boost label if available */}
          {match.boost_label && (
            <div 
              className="ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{ 
                backgroundColor: squadColor,
                color: textColor
              }}
            >
              {match.boost_label}
            </div>
          )}
        </div>
      </div>
      
      {/* Content organized in a more landscape-friendly layout */}
      <div className="flex-grow flex flex-col sm:flex-row p-3">
        {/* Stats section */}
        <div className="flex-grow space-y-2">
          {/* Batting stats */}
          {match.batting && (
            <div>
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">BATTING</h4>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{match.batting.points} pts</span>
              </div>
              <div className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                {match.batting.runs}({match.batting.balls})
                {match.batting.not_out && <span className="ml-1">*</span>}
              </div>
              <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <div>
                  {match.batting.fours > 0 && <span>{match.batting.fours}×4</span>}
                  {match.batting.fours > 0 && match.batting.sixes > 0 && <span>, </span>}
                  {match.batting.sixes > 0 && <span>{match.batting.sixes}×6</span>}
                </div>
                <div>SR: {match.batting.strike_rate?.toFixed(1) || '-'}</div>
              </div>
            </div>
          )}
          
          {/* Bowling stats */}
          {match.bowling && (
            <div>
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">BOWLING</h4>
                <span className="text-xs font-medium text-right text-gray-600 dark:text-gray-400">{match.bowling.points} pts</span>
              </div>
              <div className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                {match.bowling.wickets}/{match.bowling.runs} ({match.bowling.overs})
              </div>
              <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <div>
                  {match.bowling.maidens > 0 ? `${match.bowling.maidens} maiden${match.bowling.maidens > 1 ? 's' : ''}` : ''}
                </div>
                <div>Econ: {match.bowling.economy?.toFixed(2) || '-'}</div>
              </div>
            </div>
          )}
          
          {/* Fielding stats */}
          {match.fielding && (
            <div>
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">FIELDING</h4>
                <span className="text-xs font-medium text-right text-gray-600 dark:text-gray-400">{match.fielding.points} pts</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                {match.fielding.catches > 0 && <span className="mr-1">{match.fielding.catches}c</span>}
                {match.fielding.stumpings > 0 && <span className="mr-1">{match.fielding.stumpings}st</span>}
                {match.fielding.runouts > 0 && <span>{match.fielding.runouts}ro</span>}
              </div>
            </div>
          )}
        </div>
        
        {/* Points summary - moved to the right for landscape orientation */}
        <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center mt-3 sm:mt-0 sm:ml-3 sm:border-l sm:pl-3" 
             style={{ borderColor: getLighterColor(squadColor, 0.3) }}>
          <div className="space-y-1">
            <div className="flex items-center">
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 w-10">Base</span>
              <span className="text-sm sm:text-lg font-bold text-gray-800 dark:text-gray-200">{match.basePoints}</span>
            </div>
            {match.boostPoints > 0 && (
              <div className="flex items-center">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 w-10">Boost</span>
                <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">+{match.boostPoints}</span>
              </div>
            )}
          </div>
          
          <div 
            className="flex flex-col items-center justify-center rounded-lg p-2 sm:p-3 w-16 sm:w-20 h-14 sm:h-16 ml-2 sm:ml-0 sm:mt-2"
            style={{ 
              backgroundColor: squadColor,
              color: textColor
            }}
          >
            <div className="text-lg sm:text-xl font-bold">{match.totalPoints}</div>
            <div className="text-xs">points</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Responsive grid layout for match cards
const MatchGrid = ({ matches }) => {
  if (matches.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
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
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700">
    <div className="px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-sm sm:text-base font-semibold leading-6 text-gray-900 dark:text-white">
        Season Overview
      </h3>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50">
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Squad</th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matches</th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Base</th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Boost</th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Average</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {seasonStats.map((stat, index) => (
            <tr 
              key={index} 
              className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
                ${index === seasonStats.length - 1 ? "font-semibold" : ""}`}
            >
              <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">{stat.squad}</td>
              <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-300">{stat.matches}</td>
              <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-300">{stat.basePoints}</td>
              <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-300">{stat.boostPoints}</td>
              <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-300">{stat.totalPoints}</td>
              <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">
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
        <h3 className="text-sm sm:text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Match History</h3>
        <MatchGrid matches={matches} />
      </div>
    </div>
  );
};

export default FantasyPlayerSeason;