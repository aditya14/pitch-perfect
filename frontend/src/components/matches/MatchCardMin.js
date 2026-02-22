import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, Calendar, Hourglass, Info } from 'lucide-react';
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

const MatchCardMin = ({ match, leagueId }) => {
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

  useEffect(() => {
    // Reset state when match or leagueId changes before fetching
    setLoading(true);
    setTopPlayers([]);
    setTopSquads([]);
    setError(null);
    setTimeRemaining(null); // Reset countdown too

    // Fetch stats for COMPLETED, LIVE, or NO_RESULT matches
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

  const handleMatchClick = () => {
    if (!['COMPLETED', 'NO_RESULT', 'ABANDONED', 'LIVE'].includes(match.status)) {
      return;
    }
    
    if (leagueId) {
      navigate(`/leagues/${leagueId}/matches/${match.id}`);
    } else {
      navigate(`/matches/${match.id}`);
    }
  };

  const handlePreviewClick = (e) => {
    e.stopPropagation();
    if (leagueId) {
      navigate(`/leagues/${leagueId}/matches/${match.id}/preview`);
    } else {
      navigate(`/matches/${match.id}/preview`);
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
  const isClickable = ['COMPLETED', 'NO_RESULT', 'ABANDONED', 'LIVE'].includes(match.status);

  return (
    <div className="lg-list-item flex flex-col h-full min-h-[180px] transition-shadow">
      {/* Header section with match info */}
      <div className="pb-2 border-b border-white/10 dark:border-white/10 mb-2">
        {/* Mobile compact header */}
        <div className="flex flex-col sm:hidden">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
            <span>Match {match.match_number}</span>
            <span>•</span>
            <span>{formatStageLabel(match.stage)}</span>
            {match.date && (
              <>
                <span>•</span>
                <Calendar className="h-2 w-2 inline" />
                <span>{formattedDateTime.date}</span>
                <span>•</span>
                <Clock className="h-2 w-2 inline" />
                <span>{formattedDateTime.time}</span>
              </>
            )}
            {/* Live indicator with improved animation */}
            {match.status === 'LIVE' && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                <span className="px-3 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full border border-red-200 dark:border-red-800">
                  LIVE
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Original header for sm+ */}
        <div className="hidden sm:block">
          <div className="flex items-center mb-2">
            <span className="text-neutral-900 dark:text-white font-medium text-sm">Match {match.match_number}</span>
            <span className="text-neutral-500 dark:text-neutral-400 mx-2">•</span>
            <span className="text-neutral-500 dark:text-neutral-400 text-xs">
              {formatStageLabel(match.stage)}
            </span>
            
            {/* Live indicator with improved animation */}
            {match.status === 'LIVE' && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                <span className="px-3 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full border border-red-200 dark:border-red-800">
                  LIVE
                </span>
              </div>
            )}
          </div>
          {/* Date and time below the match number */}
          {match.date && (
            <div className="flex items-center text-neutral-500 dark:text-neutral-400 text-xs">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{formattedDateTime.date}</span>
              <span className="mx-1">•</span>
              <Clock className="h-4 w-4 mr-1" />
              <span>{formattedDateTime.time}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-grow flex flex-col">
        <div className="flex-grow">
          {/* Teams and scores - compact for mobile, improved alignment */}
          <div className="flex flex-col sm:hidden mb-2">
            <div className="grid grid-cols-2 gap-x-2">
              {/* Team 1: name + score */}
              <div className="flex items-center min-w-0">
                {battingFirstTeam ? (
                  <>
                    <div className='h-2 w-2 mr-2 rounded-sm'
                      style={{
                        backgroundColor: battingFirstTeam.primary_color ? `${'#' + battingFirstTeam.primary_color}` : '#6B7280',
                        opacity: match.winner 
                          ? (battingFirstTeam?.short_name === match?.winner?.short_name ? 1 : 0.1) 
                          : 1,
                        boxShadow: match.winner && battingFirstTeam?.short_name === match?.winner?.short_name 
                          ? `1px 1px 5px ${hexToRgba(battingFirstTeam.primary_color, 0.9)}` 
                          : 'none'
                      }}
                    />
                    <span className={`text-sm font-caption truncate text-neutral-900 dark:text-white ${battingFirstTeam?.short_name === match?.winner?.short_name ? 'font-bold' : ''}`}>
                      {battingFirstTeam.short_name || battingFirstTeam.name}
                    </span>
                    {(match.status === 'COMPLETED' || match.status === 'LIVE') && (
                      <span className="ml-2 text-sm text-neutral-900 dark:text-white whitespace-nowrap">
                        {formatScore(match.inns_1_runs, match.inns_1_wickets, match.inns_1_overs)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-neutral-900 dark:text-white text-xs">TBD</span>
                )}
              </div>
              {/* Team 2: color left, name right, then score */}
              <div className="flex items-center min-w-0 justify-end">
                {battingSecondTeam ? (
                  <>
                    <div className='h-2 w-2 mr-2 rounded-sm'
                      style={{
                        backgroundColor: battingSecondTeam.primary_color ? `${'#' + battingSecondTeam.primary_color}` : '#6B7280',
                        opacity: match.winner 
                          ? (battingSecondTeam?.short_name === match?.winner?.short_name ? 1 : 0.1) 
                          : 1,
                        boxShadow: match.winner && battingSecondTeam?.short_name === match?.winner?.short_name 
                          ? `1px 1px 5px ${hexToRgba(battingSecondTeam.primary_color, 0.9)}` 
                          : 'none'
                      }}
                    />
                    <span className={`text-sm font-caption truncate text-neutral-900 dark:text-white ${battingSecondTeam?.short_name === match?.winner?.short_name ? 'font-bold' : ''}`}>
                      {battingSecondTeam.short_name || battingSecondTeam.name}
                    </span>
                    {(match.status === 'COMPLETED' || match.status === 'LIVE') && (
                      <span className="ml-2 text-sm text-neutral-900 dark:text-white whitespace-nowrap">
                        {formatScore(match.inns_2_runs, match.inns_2_wickets, match.inns_2_overs)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-neutral-900 dark:text-white text-xs">TBD</span>
                )}
              </div>
            </div>
          </div>
          {/* Teams and scores - original for sm+ */}
          <div className="hidden sm:block">
            {/* Teams and scores - Batting First Team */}
            <div className="flex items-center justify-between mb-2">
              {battingFirstTeam ? (
                <div className="flex items-center">
                  <div className='h-2.5 w-2.5 mr-1.5 rounded-sm'
                    style={{
                      backgroundColor: battingFirstTeam.primary_color ? `${'#' + battingFirstTeam.primary_color}` : '#6B7280',
                      opacity: match.winner 
                        ? (battingFirstTeam?.short_name === match?.winner?.short_name ? 1 : 0.1) 
                        : 1,
                      boxShadow: match.winner && battingFirstTeam?.short_name === match?.winner?.short_name 
                        ? `1px 1px 5px ${hexToRgba(battingFirstTeam.primary_color, 0.9)}` 
                        : 'none'
                    }}
                  />
                  <span className={`text-sm font-caption text-center text-neutral-900 dark:text-white ${battingFirstTeam?.short_name === match?.winner?.short_name ? 'font-bold' : ''}`}>
                    {battingFirstTeam.short_name || battingFirstTeam.name}
                  </span>
                </div>
              ) : (
                <span className="text-neutral-900 dark:text-white">TBD</span>
              )}
              
              <div className="text-neutral-900 dark:text-white text-sm">
                {(match.status === 'COMPLETED' || match.status === 'LIVE') && (
                  <span>{formatScore(match.inns_1_runs, match.inns_1_wickets, match.inns_1_overs)}</span>
                )}
              </div>
            </div>
            {/* Teams and scores - Batting Second Team */}
            <div className="flex items-center justify-between mb-2">
              {battingSecondTeam ? (
                <div className="flex items-center">
                  <div className='h-2.5 w-2.5 mr-1.5 rounded-sm'
                    style={{
                      backgroundColor: battingSecondTeam.primary_color ? `${'#' + battingSecondTeam.primary_color}` : '#6B7280',
                      opacity: match.winner 
                        ? (battingSecondTeam?.short_name === match?.winner?.short_name ? 1 : 0.1) 
                        : 1,
                      boxShadow: match.winner && battingSecondTeam?.short_name === match?.winner?.short_name 
                        ? `1px 1px 5px ${hexToRgba(battingSecondTeam.primary_color, 0.9)}` 
                        : 'none'
                    }}
                  />
                  <span className={`text-sm font-caption text-center text-neutral-900 dark:text-white ${battingSecondTeam?.short_name === match?.winner?.short_name ? 'font-bold' : ''}`}>
                    {battingSecondTeam.short_name || battingSecondTeam.name}
                  </span>
                </div>
              ) : (
                <span className="text-neutral-900 dark:text-white">TBD</span>
              )}
              
              <div className="text-neutral-900 dark:text-white text-sm">
                {(match.status === 'COMPLETED' || match.status === 'LIVE') && (
                  <span>{formatScore(match.inns_2_runs, match.inns_2_wickets, match.inns_2_overs)}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Match Result */}
          {match.status === 'COMPLETED' && match.winner && (
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center">
                <Trophy className="h-3 w-3 text-yellow-500 mr-1.5" />
                <span className="text-neutral-700 dark:text-neutral-300 text-xs">
                  {match.win_type === 'RUNS' && (
                    <>{match.winner.short_name} won by {match.win_margin} {match.win_margin === 1 ? 'run' : 'runs'}</>
                  )}
                  {match.win_type === 'WICKETS' && (
                    <>{match.winner.short_name} won by {match.win_margin} {match.win_margin === 1 ? 'wicket' : 'wickets'}</>
                  )}
                  {match.win_type === 'TIE' && (
                    <>Match tied</>
                  )}
                  {match.win_type === 'SUPER_OVER' && (
                    <>{match.winner.short_name} won via Super Over</>
                  )}
                  {match.win_type === 'NO_RESULT' && (
                    <>No Result</>
                  )}
                </span>
              </div>
              
              {isClickable && (
                <button
                  onClick={handleMatchClick}
                  className="lg-button-ghost lg-rounded-md px-2 py-1 text-xs ml-2 flex items-center transition-all duration-150 focus:lg-focus hover:bg-[rgba(31,190,221,0.08)] dark:hover:bg-[rgba(31,190,221,0.12)]"
                  aria-label="View match details"
                >
                  Details
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* NO_RESULT or ABANDONED (with or without winner) */}
          {(match.status === 'NO_RESULT' || match.status === 'ABANDONED') && (
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center">
                <Info className="h-3 w-3 text-neutral-500 mr-1.5" />
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                  {match.status === 'NO_RESULT' ? 'No Result' : 'Match Abandoned'}
                </span>
              </div>
              {isClickable && (
                <button
                  onClick={handleMatchClick}
                  className="lg-button-ghost lg-rounded-md px-2 py-1 text-xs ml-2 flex items-center transition-all duration-150 focus:lg-focus hover:bg-[rgba(31,190,221,0.08)] dark:hover:bg-[rgba(31,190,221,0.12)]"
                  aria-label="View match details"
                >
                  Details
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Add subtle details link for LIVE matches */}
          {match.status === 'LIVE' && (
            <div className="text-right mb-1">
              <button
                onClick={handleMatchClick}
                className="lg-button-ghost lg-rounded-md px-2 py-1 text-xs flex items-center ml-auto transition-all duration-150 focus:lg-focus hover:bg-[rgba(31,190,221,0.08)] dark:hover:bg-[rgba(31,190,221,0.12)]"
                aria-label="View live match details"
              >
                Live Updates
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Horizontal line separating match details from fantasy stats */}
          <div className="border-t border-white/10 dark:border-white/10 my-2" />

          {/* Fantasy Stats Section - Top Squads */}
          {/* Mobile: both squads in one grid row for alignment */}
          {!loading && topSquads.length > 0 && (
            <div className="mb-2">
              {/* <div className="text-neutral-500 dark:text-neutral-400 text-xs uppercase font-medium mb-2">
                {match.status === 'LIVE' ? 'LEADING' : 'TOP'} SQUADS
              </div> */}
              <div className="sm:hidden">
                <div className="grid grid-cols-2 gap-x-2">
                  {/* Squad 1 */}
                  {topSquads[0] ? (
                    <div className="flex items-center min-w-0">
                      <CapIcon
                        size={16}
                        strokeWidth={30}
                        color={topSquads[0]?.color || '#6B7280'} 
                        className="mr-1" 
                      />
                      <span className="text-neutral-900 dark:text-white text-xs truncate max-w-[80px] font-bold font-caption">
                        {topSquads[0]?.name}
                      </span>
                      <span className="text-neutral-900 dark:text-white text-xs whitespace-nowrap ml-2">
                        {topSquads[0]?.match_points} pts
                      </span>
                    </div>
                  ) : <div />}
                  {/* Squad 2 */}
                  {topSquads[1] ? (
                    <div className="flex items-center min-w-0 justify-end">
                      <div 
                        className="h-3 w-1 mr-1 rounded-sm"
                        style={{ backgroundColor: topSquads[1]?.color || '#6B7280' }}
                      />
                      <span className="text-neutral-900 dark:text-white text-xs truncate max-w-[80px]">
                        {topSquads[1]?.name}
                      </span>
                      <span className="text-neutral-900 dark:text-white text-xs whitespace-nowrap ml-2">
                        {topSquads[1]?.match_points} pts
                      </span>
                    </div>
                  ) : <div />}
                </div>
              </div>
              {/* Original layout for sm+ */}
              <div className="hidden sm:block">
                {/* Squad 1 */}
                {topSquads.length > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <CapIcon
                        size={20}
                        strokeWidth={30}
                        color={topSquads[0]?.color || '#6B7280'} 
                        className="mr-1.5" 
                      />
                      <span className="text-neutral-900 dark:text-white text-sm truncate max-w-[150px] font-bold font-caption">
                        {topSquads[0]?.name}
                      </span>
                    </div>
                    <span className="text-neutral-900 dark:text-white text-sm whitespace-nowrap ml-2">
                      {topSquads[0]?.match_points} pts
                    </span>
                  </div>
                )}
                {/* Squad 2 */}
                {topSquads.length > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="h-4 w-1 mr-1.5 rounded-sm"
                        style={{ backgroundColor: topSquads[1]?.color || '#6B7280' }}
                      />
                      <span className="text-neutral-900 dark:text-white text-xs truncate max-w-[150px]">
                        {topSquads[1]?.name}
                      </span>
                    </div>
                    <span className="text-neutral-900 dark:text-white text-xs whitespace-nowrap ml-2">
                      {topSquads[1]?.match_points} pts
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {match.status !== 'SCHEDULED' &&
          <div className="border-t border-white/10 dark:border-white/10 my-2" />
          }
          
          {/* Fantasy Stats Section - Top Performers */}
          {/* Mobile: both performers in one grid row for alignment */}
          {!loading && topPlayers.length > 0 && (
            <div>
              {/* <div className="text-neutral-500 dark:text-neutral-400 text-xs uppercase font-medium mb-2">
                {match.status === 'LIVE' ? 'LEADING' : 'TOP'} PERFORMERS
              </div> */}
              <div className="sm:hidden">
                <div className="grid grid-cols-2 gap-x-2">
                  {/* Player 1 */}
                  {topPlayers[0] ? (
                    <div className="flex items-center min-w-0">
                      <span className="text-neutral-900 dark:text-white text-xs truncate max-w-[80px]">
                        {topPlayers[0]?.player_name}
                      </span>
                      {topPlayers[0]?.boost_label ? (
                        <span className='ml-1'>
                          <BoostInlineElement
                            boostName={topPlayers[0]?.boost_label} 
                            color={topPlayers[0]?.squad_color || '#6B7280'}
                            showLabel={false} 
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
                      <span className="text-neutral-900 dark:text-white text-xs whitespace-nowrap ml-2">
                        {topPlayers[0]?.fantasy_points} pts
                      </span>
                    </div>
                  ) : <div />}
                  {/* Player 2 */}
                  {topPlayers[1] ? (
                    <div className="flex items-center min-w-0 justify-end">
                      <span className="text-neutral-900 dark:text-white text-xs truncate max-w-[80px]">
                        {topPlayers[1]?.player_name}
                      </span>
                      {topPlayers[1]?.boost_label ? (
                        <span className='ml-1'>
                          <BoostInlineElement
                            boostName={topPlayers[1]?.boost_label} 
                            color={topPlayers[1]?.squad_color || '#6B7280'}
                            showLabel={false} 
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
                      <span className="text-neutral-900 dark:text-white text-xs whitespace-nowrap ml-2">
                        {topPlayers[1]?.fantasy_points} pts
                      </span>
                    </div>
                  ) : <div />}
                </div>
              </div>
              {/* Original layout for sm+ */}
              <div className="hidden sm:block">
                {/* Player 1 */}
                {topPlayers.length > 0 && (
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className="text-neutral-900 dark:text-white text-xs truncate max-w-[150px]">
                        {topPlayers[0]?.player_name}
                      </span>
                      {topPlayers[0]?.boost_label ? (
                        <span className='ml-1'>
                          <BoostInlineElement
                            boostName={topPlayers[0]?.boost_label} 
                            color={topPlayers[0]?.squad_color || '#6B7280'}
                            showLabel={false} 
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
                      {topPlayers[0]?.fantasy_points} pts
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
                            showLabel={false} 
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
                      {topPlayers[1]?.fantasy_points} pts
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Countdown for upcoming matches - Properly positioned at the bottom of the card */}
        {match.status === 'SCHEDULED' && timeRemaining && (
          <div className="flex items-center justify-center lg-glass-inset py-1 rounded-md mt-auto">
            <span className="text-xs text-neutral-500 dark:text-neutral-500 flex items-center">
              <Hourglass className="h-3 w-3 inline mr-1 text-neutral-400 dark:text-neutral-600" />
              {formattedCountdown}
            </span>
          </div>
        )}
        {/* For SCHEDULED matches, show Preview button as a subtle link */}
        {match.status === 'SCHEDULED' && battingFirstTeam && battingSecondTeam && (
          <div className="text-right mt-2">
            <button
              onClick={handlePreviewClick}
              className="lg-button-ghost lg-rounded-md px-2 py-1 text-xs flex items-center ml-auto transition-all duration-150 focus:lg-focus hover:bg-[rgba(31,190,221,0.08)] dark:hover:bg-[rgba(31,190,221,0.12)]"
              aria-label="Preview match"
            >
              <span className='font-caption font-bold'>Preview</span>
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );

};

export default MatchCardMin;
