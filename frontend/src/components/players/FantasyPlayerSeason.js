import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { Calendar, ChevronUp, ChevronDown, Medal, Shield, Anchor, Zap, Handshake, Sparkles, Crown, Bomb, EarthLock, Swords } from 'lucide-react';

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
    r: Math.max(0, Math.floor(r * 0.85)),
    g: Math.max(0, Math.floor(g * 0.85)),
    b: Math.max(0, Math.floor(b * 0.85))
  };
  
  return `#${darker.r.toString(16).padStart(2, '0')}${darker.g.toString(16).padStart(2, '0')}${darker.b.toString(16).padStart(2, '0')}`;
};

// Format date from ISO string to a readable format
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper function to get role icon
const getRoleIcon = (roleName, size = 16, squadColor) => {
  // Add outline styles for better contrast
  const outlineStyle = {
    color: squadColor || 'currentColor',
    filter: 'drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.5))',
  };

  switch(roleName) {
    case 'Captain':
      return <Crown size={size} style={outlineStyle} className="text-primary-600 dark:text-primary-400" />;
    case 'Vice-Captain':
      return <Swords size={size} style={outlineStyle} className="text-primary-500 dark:text-primary-300" />;
    case 'Slogger':
      return <Zap size={size} style={outlineStyle} className="text-red-500 dark:text-red-400" />;
    case 'Accumulator':
      return <Anchor size={size} style={outlineStyle} className="text-yellow-500 dark:text-yellow-400" />;
    case 'Safe Hands':
      return <Handshake size={size} style={outlineStyle} className="text-cyan-500 dark:text-cyan-400" />;
    case 'Rattler':
      return <Bomb size={size} style={outlineStyle} className="text-green-500 dark:text-green-400" />;
    case 'Constrictor':
      return <EarthLock size={size} style={outlineStyle} className="text-emerald-500 dark:text-emerald-400" />;
    default: // Virtuoso
      return <Sparkles size={size} style={outlineStyle} className="text-purple-500 dark:text-purple-400" />;
  }
};

// Enhanced MatchCard component with our finalized design
const MatchCard = ({ match }) => {
  const squadColor = match.squad_color || '#3B82F6'; // Default to blue
  const darkerColor = getDarkerColor(squadColor);
  const lighterSquadColor = getLighterColor(squadColor, 0.8);
  const matchDate = formatDate(match.match?.date);
  
  // Extract points data
  const basePoints = match.basePoints || 0;
  const boostPoints = match.boostPoints || 0;
  const totalPoints = match.totalPoints || match.points || 0;
  const textColor = getTextColor(squadColor);
  
  // Function to render strike rate chevrons based on DetailedMatchPerformance implementation
  const renderSRChevrons = (sr, ballsFaced) => {
    if (!sr || ballsFaced < 10) return null;
    
    if (sr >= 200) {
      return (
        <span className="inline-flex flex-col text-green-500 ml-1">
          <ChevronUp className="h-2 w-2" />
          <ChevronUp className="h-2 w-2 -mt-1" />
          <ChevronUp className="h-2 w-2 -mt-1" />
        </span>
      );
    } else if (sr >= 175) {
      return (
        <span className="inline-flex flex-col text-green-500 ml-1">
          <ChevronUp className="h-2 w-2" />
          <ChevronUp className="h-2 w-2 -mt-1" />
        </span>
      );
    } else if (sr >= 150) {
      return (
        <span className="inline-flex flex-col text-green-500 ml-1">
          <ChevronUp className="h-2 w-2" />
        </span>
      );
    } else if (sr < 50) {
      return (
        <span className="inline-flex flex-col text-red-500 ml-1">
          <ChevronDown className="h-2 w-2" />
          <ChevronDown className="h-2 w-2 -mt-1" />
          <ChevronDown className="h-2 w-2 -mt-1" />
        </span>
      );
    } else if (sr < 75) {
      return (
        <span className="inline-flex flex-col text-red-500 ml-1">
          <ChevronDown className="h-2 w-2" />
          <ChevronDown className="h-2 w-2 -mt-1" />
        </span>
      );
    } else if (sr < 100) {
      return (
        <span className="inline-flex flex-col text-red-500 ml-1">
          <ChevronDown className="h-2 w-2" />
        </span>
      );
    }
    
    return null;
  };

  // Function to render economy chevrons based on DetailedMatchPerformance implementation
  const renderEconomyChevrons = (economy, ballsBowled) => {
    if (!economy || ballsBowled < 10) return null;
    
    if (economy <= 5) {
      return (
        <span className="inline-flex flex-col text-green-500 ml-1">
          <ChevronUp className="h-2 w-2" />
          <ChevronUp className="h-2 w-2 -mt-1" />
          <ChevronUp className="h-2 w-2 -mt-1" />
        </span>
      );
    } else if (economy <= 6) {
      return (
        <span className="inline-flex flex-col text-green-500 ml-1">
          <ChevronUp className="h-2 w-2" />
          <ChevronUp className="h-2 w-2 -mt-1" />
        </span>
      );
    } else if (economy <= 7) {
      return (
        <span className="inline-flex flex-col text-green-500 ml-1">
          <ChevronUp className="h-2 w-2" />
        </span>
      );
    } else if (economy >= 12) {
      return (
        <span className="inline-flex flex-col text-red-500 ml-1">
          <ChevronDown className="h-2 w-2" />
          <ChevronDown className="h-2 w-2 -mt-1" />
          <ChevronDown className="h-2 w-2 -mt-1" />
        </span>
      );
    } else if (economy >= 11) {
      return (
        <span className="inline-flex flex-col text-red-500 ml-1">
          <ChevronDown className="h-2 w-2" />
          <ChevronDown className="h-2 w-2 -mt-1" />
        </span>
      );
    } else if (economy >= 10) {
      return (
        <span className="inline-flex flex-col text-red-500 ml-1">
          <ChevronDown className="h-2 w-2" />
        </span>
      );
    }
    
    return null;
  };
  
  return (
    <div className="w-full mb-4 max-w-md">
      {/* Card container with subtle hover effect */}
      <div className="relative rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950">
        {/* Top accent strip */}
        <div 
          className="h-1.5 w-full"
          style={{ backgroundColor: squadColor }}
        ></div>
        
        {/* Header with squad info */}
        <div 
          className="px-3 py-2 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800"
          style={{ 
            background: `linear-gradient(to right, ${squadColor}, ${darkerColor})`,
            color: textColor
          }}
        >
          {/* Team branding with shield icon */}
          <div className="flex items-center">
            {/* <Shield size={16} className="mr-2 filter drop-shadow-sm" /> */}
            <span className="font-bold tracking-wide text-sm">{match.squad}</span>
          </div>
          
          {/* Match info in compact format */}
          <div className="flex items-center text-xs opacity-90">
            <Calendar size={12} className="mr-1" />
            <span>{matchDate}</span>
            <span className="mx-1.5">•</span>
            <span>vs {match.opponent}</span>
            
            {/* MVP Badge - only show if player of match */}
            {match.player_of_match && (
              <>
                <span className="mx-1.5">•</span>
                <div 
                  className="flex items-center text-xs px-2 py-0.5 rounded-full" 
                  style={{ backgroundColor: "#FFD700", color: '#000' }}
                >
                  <Medal size={12} className="mr-0.5" />
                  <span className="font-semibold">MVP</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-12">
          {/* Points Column */}
          <div className="col-span-4 row-span-2 border-r border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center p-2 relative overflow-hidden">
            {/* Role badge at top (if exists) */}
            {match.boost_label && (
              <div 
                className="inline-flex items-center px-2 py-1 text-xs rounded mb-2"
                style={{ 
                  background: `linear-gradient(135deg, ${lighterSquadColor}, ${squadColor})`,
                  color: textColor,
                  boxShadow: `0 2px 4px ${getLighterColor(squadColor, 0.3)}`
                }}
              >
                {getRoleIcon(match.boost_label, 12, textColor)}
                <span className="font-medium ml-1.5">{match.boost_label}</span>
              </div>
            )}
            
            {/* Points display with glow effect */}
            <div className="text-4xl font-bold text-neutral-900 dark:text-white relative">
              <span className="relative z-10">{totalPoints}</span>
              <div 
                className="absolute inset-0 rounded-full opacity-10" 
                style={{ 
                  background: `radial-gradient(circle, ${squadColor}, transparent)`,
                  transform: "scale(1.5)",
                  filter: "blur(8px)"
                }}
              ></div>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">points</div>
            
            {/* Points breakdown */}
            <div className="w-full flex justify-center items-center text-xs">
              <span className={`font-bold text-lg ${
                basePoints >= 60 ? 'text-green-600 dark:text-green-400' :
                basePoints >= 35 ? 'text-blue-600 dark:text-blue-400' :
                basePoints < 10 ? 'text-red-600 dark:text-red-400' :
                'text-yellow-600 dark:text-yellow-400'
              }`}>{basePoints}</span>
              {boostPoints > 0 && (
                <>
                  <span className="text-neutral-400 dark:text-neutral-500 font-medium text-lg mx-1">+</span>
                  <span className="text-neutral-800 dark:text-neutral-200 font-bold text-lg">{boostPoints}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Stats section header */}
          <div className="col-span-8 flex justify-evenly items-center border-b border-neutral-200 dark:border-neutral-800">
            <div className="text-xs uppercase font-medium py-1 px-3 tracking-wider text-neutral-600 dark:text-neutral-300">Batting</div>
            <div className="text-xs uppercase font-medium py-1 px-3 tracking-wider text-neutral-600 dark:text-neutral-300">Bowling</div>
            <div className="text-xs uppercase font-medium py-1 px-3 tracking-wider text-neutral-600 dark:text-neutral-300">Fielding</div>
          </div>
          
          {/* Performance Stats Section */}
          <div className="col-span-8 grid grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-800">
            {/* Batting Column */}
            <div className="flex flex-col items-center justify-center p-2 text-center">
              {match.batting ? (
                <>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {match.batting.runs}{match.batting.not_out ? '*' : ''}
                    </div>
                    <div className="text-xs text-neutral-400">({match.batting.balls} balls)</div>
                  </div>
                  
                  <div className="text-xs text-neutral-500 dark:text-neutral-500 my-2">
                    {match.batting.fours > 0 && `${match.batting.fours}×4`} 
                    {match.batting.fours > 0 && match.batting.sixes > 0 && ' • '}
                    {match.batting.sixes > 0 && `${match.batting.sixes}×6`}
                  </div>
                  
                  <div className="text-xs text-neutral-700 dark:text-neutral-300 flex items-center">
                    <span>SR {match.batting.strike_rate?.toFixed(2) || '-'}</span>
                    {renderSRChevrons(match.batting.strike_rate, match.batting.balls)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-neutral-500 dark:text-neutral-500">-</div>
              )}
            </div>
            
            {/* Bowling Column */}
            <div className="flex flex-col items-center justify-center p-2 text-center">
              {match.bowling ? (
                <>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {match.bowling.wickets}/{match.bowling.runs}
                    </div>
                    <div className="text-xs text-neutral-400">({match.bowling.overs})</div>
                  </div>
                  
                  <div className="text-xs text-neutral-500 dark:text-neutral-500 my-2">
                    {match.bowling.maidens || 0} maiden{match.bowling.maidens !== 1 ? 's' : ''}
                  </div>
                  
                  <div className="text-xs text-neutral-700 dark:text-neutral-300 flex items-center">
                    <span>Econ {match.bowling.economy?.toFixed(2) || '-'}</span>
                    {renderEconomyChevrons(match.bowling.economy, parseFloat(match.bowling.overs) * 6)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-neutral-500 dark:text-neutral-500">-</div>
              )}
            </div>
            
            {/* Fielding Column */}
            <div className="flex flex-col items-center justify-center p-2 text-center">
              {match.fielding && (match.fielding.catches > 0 || match.fielding.stumpings > 0 || match.fielding.runouts > 0) ? (
                <div className="flex flex-col space-y-1 my-2">
                  {match.fielding.catches > 0 && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-500">
                      {match.fielding.catches} Catch{match.fielding.catches !== 1 ? 'es' : ''}
                    </div>
                  )}
                  
                  {match.fielding.stumpings > 0 && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-500">
                      {match.fielding.stumpings} Stump{match.fielding.stumpings !== 1 ? 's' : ''}
                    </div>
                  )}
                  
                  {match.fielding.runouts > 0 && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-500">
                      {match.fielding.runouts} Run Out{match.fielding.runouts !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-neutral-500 dark:text-neutral-500">-</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom accent line with gradient */}
        <div 
          className="h-1 w-full" 
          style={{ background: `linear-gradient(to right, ${darkerColor}, ${squadColor}, ${darkerColor})` }}
        ></div>
      </div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
