import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, Hourglass } from 'lucide-react';
import api from '../../utils/axios';
import { getTextColorForBackground } from '../../utils/colorUtils';
import BoostInlineElement from '../elements/BoostInlineElement';
import CapIcon from '../elements/icons/CapIcon';

// Utility function to convert hex color to rgba with opacity
const hexToRgba = (hex, opacity) => {
  // Remove the hash if it exists
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Return rgba format
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const MatchCard = ({ match, leagueId }) => {
  const navigate = useNavigate();
  const [topPlayers, setTopPlayers] = useState([]);
  const [topSquads, setTopSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Safely determine which team batted first based on toss winner and toss decision
  // Adding null checks to prevent "Cannot read properties of null" errors
  let battingFirstTeam = match.team_1;
  let battingSecondTeam = match.team_2;

  // Only attempt to determine batting order if we have all the required data
  if (match.toss_winner && match.toss_decision && match.team_1 && match.team_2) {
    if (match.toss_decision === 'BAT') {
      battingFirstTeam = match.toss_winner;
      battingSecondTeam = (match.team_1.id === match.toss_winner.id) ? match.team_2 : match.team_1;
    } else {
      // If toss winner chose to field/bowl
      battingFirstTeam = (match.team_1.id === match.toss_winner.id) ? match.team_2 : match.team_1;
      battingSecondTeam = match.toss_winner;
    }
  }

  const firstColorHex = battingFirstTeam?.primary_color ? `#${battingFirstTeam.primary_color}` : '#6B7280';
  const secondColorHex = battingSecondTeam?.primary_color ? `#${battingSecondTeam.primary_color}` : '#6B7280';

  useEffect(() => {
    // Reset state when match or leagueId changes before fetching
    setLoading(true);
    setTopPlayers([]);
    setTopSquads([]);
    setError(null);
    setTimeRemaining(null); // Reset countdown too

    if (match && ['COMPLETED', 'LIVE', 'NO_RESULT'].includes(match.status)) {
      fetchFantasyStats();
    } else {
      setLoading(false);
    }
    
    // Calculate time remaining for upcoming matches
    if (match && match.status === 'SCHEDULED' && match.date) {
      const calculateTimeRemaining = () => {
        const matchTime = new Date(match.date);
        const now = new Date();
        const difference = matchTime - now;
        
        if (difference <= 0) return null;
        
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        
        return { days, hours, minutes };
      };
      
      // Initial calculation
      setTimeRemaining(calculateTimeRemaining());
      
      // Update every minute
      const timer = setInterval(() => {
        const remaining = calculateTimeRemaining();
        setTimeRemaining(remaining);
        
        // Clear interval if time is up
        if (!remaining) clearInterval(timer);
      }, 60000);
      
      return () => clearInterval(timer);
    }
  }, [match?.id, leagueId, match?.status, match?.date]); // Use match.id and include status/date

  const fetchFantasyStats = async () => {
    try {
      setLoading(true);
      // Fetch fantasy stats for this match
      const endpoint = leagueId
        ? `/leagues/${leagueId}/matches/${match.id}/stats/`
        : `/matches/${match.id}/stats/`;
      const response = await api.get(endpoint);
      setTopPlayers(response.data.top_players || []);
      setTopSquads(response.data.top_squads || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching match fantasy stats:', err);
      setError('Failed to fetch fantasy stats');
    } finally {
      setLoading(false);
    }
  };

  const handleCTAClick = () => {
    if (match.status === 'SCHEDULED' && battingFirstTeam && battingSecondTeam) {
      if (leagueId) {
        navigate(`/leagues/${leagueId}/matches/${match.id}/preview`);
      } else {
        navigate(`/matches/${match.id}/preview`);
      }
    } else if (['COMPLETED', 'NO_RESULT', 'ABANDONED', 'LIVE'].includes(match.status)) {
      if (leagueId) {
        navigate(`/leagues/${leagueId}/matches/${match.id}`);
      } else {
        navigate(`/matches/${match.id}`);
      }
    }
  };

  // Format match date and time
  const formatMatchDateTime = () => {
    if (!match.date) return '';
    
    const matchDate = new Date(match.date);
    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    
    return {
      date: matchDate.toLocaleDateString(undefined, dateOptions),
      time: matchDate.toLocaleTimeString(undefined, timeOptions)
    };
  };

  const formatStageLabel = (stage) => {
    if (!stage) return 'League';
    return String(stage)
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  };

  // Format countdown based on how far away the match is
  const formatCountdown = () => {
    if (!timeRemaining) return '';
    
    if (timeRemaining.days > 0) {
      return `${timeRemaining.days}d ${timeRemaining.hours}h`;
    } else if (timeRemaining.hours > 0) {
      return `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    } else {
      return `${timeRemaining.minutes}m`;
    }
  };

  // Format score display (only display when runs are available)
  const formatScore = (runs, wickets, overs) => {
    // Return empty string if runs is undefined, null, or not a valid number
    if (runs === undefined || runs === null || isNaN(runs)) return '';
    
    // Format wickets (skip display if team is all out, i.e. 10 wickets)
    const wicketsDisplay = (wickets !== undefined && wickets !== null && !isNaN(wickets) && wickets < 10)
      ? `/${wickets}`
      : '';
    
    // Format overs
    const oversDisplay = (overs !== undefined && overs !== null && overs !== '')
      ? ` (${overs} ov)`
      : '';
    
    return `${runs}${wicketsDisplay}${oversDisplay}`;
  };

  const formattedDateTime = formatMatchDateTime();
  const formattedCountdown = formatCountdown();

  // Determine winner ID for conditional styling
  const winnerId = (match.status === 'COMPLETED' && match.winner) 
    ? match.winner.id 
    : null;

  const getCTAText = () => {
    if (match.status === 'SCHEDULED') return 'Match Preview';
    if (match.status === 'LIVE') return 'Live Updates';
    return 'Match Details';
  };

  return (
    <div className="lg-glass lg-rounded-lg overflow-hidden transition-all duration-300 hover:transform-gpu lg-shine">
      {/* Header: compact, single line, smaller */}
      <div className="flex items-center justify-between p-2 px-4 border-b border-neutral-200/50 dark:border-neutral-800/50 text-xs backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <span className="text-neutral-900 dark:text-white font-medium">Match {match.match_number}</span>
          <span className="text-neutral-500 dark:text-neutral-400">•</span>
          <span className="text-neutral-500 dark:text-neutral-400">{formatStageLabel(match.stage)}</span>
          {match.status === 'LIVE' && (
            <span className="px-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full animate-pulse">LIVE</span>
          )}
        </div>
        {match.date && (
          <div className="flex items-center space-x-1 text-neutral-500 dark:text-neutral-400">
            <Calendar className="h-4 w-4"/>
            <span>{formattedDateTime.date}</span>
            <span>•</span>
            <Clock className="h-4 w-4"/>
            <span>{formattedDateTime.time}</span>
          </div>
        )}
      </div>
      {/* Accent Line */}
      <div 
        className="h-1 w-full" 
        style={{ background: `linear-gradient(to right, ${firstColorHex}, ${secondColorHex})` }} 
      />

      {/* Main content area */}
      <div className="p-3 px-4">
        {/* Teams and scores */}
        <div className="flex items-center justify-between my-0.5">
          <div className="flex items-center space-x-2">
            {battingFirstTeam ? (
              <span
                className="px-2 py-0.5 text-xs font-caption font-semibold rounded-md lg-shine"
                style={{ backgroundColor: firstColorHex, color: getTextColorForBackground(firstColorHex) }}
              >
                {battingFirstTeam.short_name || battingFirstTeam.name}
              </span>
            ) : (
              <span className="text-neutral-900 dark:text-white text-xs">TBD</span>
            )}
            {(match.status === 'COMPLETED' || match.status === 'LIVE' || match.status === 'NO_RESULT') && (
              <span className={`text-md ${
                winnerId === battingFirstTeam?.id
                  ? 'text-green-600 dark:text-green-500 font-semibold'
                  : 'text-neutral-900 dark:text-white'
              }`}>
                {formatScore(match.inns_1_runs, match.inns_1_wickets, match.inns_1_overs)}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {(match.status === 'COMPLETED' || match.status === 'LIVE' || match.status === 'NO_RESULT') && (
              <span className={`text-md ${
                winnerId === battingSecondTeam?.id
                  ? 'text-green-600 dark:text-green-500 font-semibold'
                  : 'text-neutral-900 dark:text-white'
              }`}>
                {formatScore(match.inns_2_runs, match.inns_2_wickets, match.inns_2_overs)}
              </span>
            )}
            {battingSecondTeam ? (
              <span
                className="px-2 py-0.5 text-xs font-caption font-semibold rounded-md"
                style={{ backgroundColor: secondColorHex, color: getTextColorForBackground(secondColorHex) }}
              >
                {battingSecondTeam.short_name || battingSecondTeam.name}
              </span>
            ) : (
              <span className="text-neutral-900 dark:text-white text-xs">TBD</span>
            )}
          </div>
        </div>
        
        {/* CHANGE 4: Match Result - Removed Trophy icon */}
        {((match.status === 'COMPLETED' && match.winner) || match.status === 'ABANDONED' || match.status === 'NO_RESULT') && (
          <div className="flex items-center mb-3">
            <span className="text-neutral-700 dark:text-neutral-300 text-sm">
              {match.win_type === 'RUNS' && (
                <>{match.winner.name} won by {match.win_margin} {match.win_margin === 1 ? 'run' : 'runs'}</>
              )}
              {match.win_type === 'WICKETS' && (
                <>{match.winner.name} won by {match.win_margin} {match.win_margin === 1 ? 'wicket' : 'wickets'}</>
              )}
              {match.win_type === 'TIE' && (
                <>Match tied</>
              )}
              {match.win_type === 'SUPER_OVER' && (
                <>{match.winner.name} won via Super Over</>
              )}
              {match.win_type === 'NO_RESULT' && (
                <>No Result</>
              )}
              {match.status === 'ABANDONED' && (
                <>Match Abandoned</>
              )}
            </span>
          </div>
        )}
        
        {/* Countdown for upcoming matches */}
        {match.status === 'SCHEDULED' && timeRemaining && (
          <div className="flex items-center justify-center lg-glass-inset py-2 rounded-md mt-auto">
            <span className="text-sm text-neutral-500 dark:text-neutral-500 flex items-center">
              <Hourglass className="h-4 w-4 inline mr-1 text-neutral-400 dark:text-neutral-600" />
              {formattedCountdown}
            </span>
          </div>
        )}

        {/* Horizontal line separating match details from fantasy stats */}
        <div className="border-t border-neutral-200/50 dark:border-neutral-800/50 my-2" />

        {/* CHANGE 3: Top Squads - BOTH on ONE line */}
        {!loading && topSquads.length > 0 && (
          <div className="mb-3">
            <div className="text-neutral-500 dark:text-neutral-400 text-xs uppercase font-medium mb-2">
              {match.status === 'LIVE' ? 'LEADING' : 'TOP'} SQUADS
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-y-2">
              {/* Squad 1 */}
              {topSquads[0] && (
                <div className="flex items-center shrink-0">
                  <CapIcon
                    size={24}
                    strokeWidth={30}
                    color={topSquads[0].color || '#6B7280'} 
                    className="mr-1.5" 
                  />
                  <span className="text-neutral-900 dark:text-white text-md font-bold truncate max-w-[150px] font-caption">
                    {topSquads[0].name}
                  </span>
                  <span className="text-green-600 dark:text-green-500 text-md font-bold whitespace-nowrap ml-2">
                    <span className="font-number">{topSquads[0].match_points}</span> pts
                  </span>
                </div>
              )}
              
              {/* Squad 2 */}
              {topSquads[1] && (
                <div className="flex items-center shrink-0">
                  <div 
                    className="h-4 w-1 mr-1.5 rounded-sm"
                    style={{ backgroundColor: topSquads[1].color || '#6B7280' }}
                  />
                  <span className="text-neutral-900 dark:text-white text-sm truncate max-w-[150px]">
                    {topSquads[1].name}
                  </span>
                  <span className="text-neutral-900 dark:text-white text-sm whitespace-nowrap ml-2">
                    <span className="font-number">{topSquads[1].match_points}</span> pts
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Fantasy Stats Section - Top Performers */}
        {!loading && topPlayers.length > 0 && (
          <div className="mb-3">
            <div className="text-neutral-500 dark:text-neutral-400 text-xs uppercase font-medium mb-2">
              {match.status === 'LIVE' ? 'LEADING' : 'TOP'} PERFORMERS
            </div>
            
            {/* Player 1 */}
            {topPlayers.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-neutral-900 dark:text-white text-xs truncate max-w-[150px]">
                    {topPlayers[0]?.player_name}
                  </span>
                  {topPlayers[0]?.boost_label ? (
                      <span className='ml-1'>
                        <BoostInlineElement
                          boostName={topPlayers[0]?.boost_label} 
                          color={topPlayers[0]?.squad_color || '#6B7280'}
                          showLabel={true} 
                          size="XS" 
                        />
                      </span>
                    ) : (
                      <span className='ml-2'>
                        <div 
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: topPlayers[0]?.squad_color || '#6B7280' }}
                        />
                      </span>
                    )}
                </div>
                <span className="text-neutral-900 dark:text-white text-xs whitespace-nowrap ml-2">
                  <span className="font-number">{topPlayers[0]?.fantasy_points}</span> pts
                </span>
              </div>
            )}
            
            {/* Player 2 */}
            {topPlayers.length > 1 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-neutral-900 dark:text-white text-xs truncate max-w-[150px]">
                    {topPlayers[1]?.player_name}
                  </span>
                  {topPlayers[1]?.boost_label ? (
                      <span className='ml-1'>
                        <BoostInlineElement
                          boostName={topPlayers[1]?.boost_label} 
                          color={topPlayers[1]?.squad_color || '#6B7280'}
                          showLabel={true} 
                          size="XS" 
                        />
                      </span>
                    ) : (
                      <span className='ml-2'>
                        <div 
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: topPlayers[1]?.squad_color || '#6B7280' }}
                        />
                      </span>
                    )}
                </div>
                <span className="text-neutral-900 dark:text-white text-xs whitespace-nowrap ml-2">
                  <span className="font-number">{topPlayers[1]?.fantasy_points}</span> pts
                </span>
              </div>
            )}
          </div>
        )}

        {/* CHANGE 2: CTA Button added */}
        <button
          onClick={handleCTAClick}
          className="w-full py-2 px-4 lg-button text-white text-xs font-medium lg-rounded-md transition-all duration-200 flex items-center justify-center"
        >
          <span className='font-caption font-bold'>{getCTAText()}</span>
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MatchCard;
