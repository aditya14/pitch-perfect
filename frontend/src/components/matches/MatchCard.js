import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, Calendar } from 'lucide-react';
import api from '../../utils/axios';
import { getTextColorForBackground } from '../../utils/colorUtils';
import BoostInlineElement from '../elements/BoostInlineElement';

const MatchCard = ({ match, leagueId }) => {
  const navigate = useNavigate();
  const [topPlayers, setTopPlayers] = useState([]);
  const [topSquads, setTopSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (match && ['COMPLETED', 'LIVE'].includes(match.status)) {
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
  }, [match]);

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

  const formattedDateTime = formatMatchDateTime();
  const formattedCountdown = formatCountdown();
  const isClickable = ['COMPLETED', 'NO_RESULT', 'ABANDONED', 'LIVE'].includes(match.status);

  return (
    <div 
      onClick={isClickable ? handleMatchClick : undefined}
      className={`
        bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-800
        ${isClickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
      `}
    >
      {/* Header: Match number + date/time */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center mb-2 sm:mb-0">
          <span className="text-gray-900 dark:text-white font-medium">Match {match.match_number}</span>
          <span className="text-gray-500 dark:text-gray-400 mx-2">•</span>
          <span className="text-gray-500 dark:text-gray-400 uppercase">
            {match.stage || "LEAGUE"}
          </span>
          
          {/* Live indicator */}
          {match.status === 'LIVE' && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </div>
        
        {match.date && (
          <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formattedDateTime.date}</span>
            <span className="mx-1">•</span>
            <Clock className="h-4 w-4 mr-1" />
            <span>{formattedDateTime.time}</span>
          </div>
        )}
      </div>
      
      {/* Main content area */}
      <div className="p-3">
        {/* Teams and scores - Team 1 */}
        <div className="flex items-center justify-between mb-3">
          {match.team_1 ? (
            <span 
              className="px-2 py-1 rounded text-sm font-bold w-16 text-center"
              style={{ 
                backgroundColor: '#' + match.team_1.primary_color,
                color: getTextColorForBackground(match.team_1.primary_color)
              }}
            >
              {match.team_1.short_name || match.team_1.name}
            </span>
          ) : (
            <span className="text-gray-900 dark:text-white font-bold">TBD</span>
          )}
          
          <div className="text-gray-900 dark:text-white text-sm">
            {(match.status === 'COMPLETED' || match.status === 'LIVE') && match.inns_1_runs !== undefined && (
              <span>
                {match.inns_1_runs}/{match.inns_1_wickets || 0} ({match.inns_1_overs} ov)
              </span>
            )}
          </div>
        </div>
        
        {/* Teams and scores - Team 2 */}
        <div className="flex items-center justify-between mb-3">
          {match.team_2 ? (
            <span 
              className="px-2 py-1 rounded text-sm font-bold w-16 text-center"
              style={{ 
                backgroundColor: '#' + match.team_2.primary_color,
                color: getTextColorForBackground(match.team_2.primary_color)
              }}
            >
              {match.team_2.short_name || match.team_2.name}
            </span>
          ) : (
            <span className="text-gray-900 dark:text-white font-bold">TBD</span>
          )}
          
          <div className="text-gray-900 dark:text-white text-sm">
            {(match.status === 'COMPLETED' || match.status === 'LIVE') && match.inns_2_runs !== undefined && (
              <span>
                {match.inns_2_runs}/{match.inns_2_wickets || 0} ({match.inns_2_overs} ov)
              </span>
            )}
          </div>
        </div>
        
        {/* Match Result */}
        {match.status === 'COMPLETED' && match.winner && (
          <div className="flex items-center mb-3">
            <Trophy className="h-4 w-4 text-yellow-500 mr-1.5" />
            <span className="text-gray-700 dark:text-gray-300 text-sm">
              {match.winner.name} won by {match.win_margin} {match.win_type === 'RUNS' ? 'runs' : 'wickets'}
            </span>
          </div>
        )}
        
        {/* Countdown for upcoming matches */}
        {match.status === 'SCHEDULED' && timeRemaining && (
          <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 py-2 rounded-md mb-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Starting in: {formattedCountdown}
            </span>
          </div>
        )}
        
        {/* Fantasy Stats Section - Top Performers */}
        {!loading && topPlayers.length > 0 && (
          <div className="mb-3">
            <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium mb-2">
              TOP PERFORMERS
            </div>
            
            {/* Player 1 */}
            {topPlayers.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-gray-900 dark:text-white text-sm truncate max-w-[150px]">
                    {topPlayers[0]?.player_name}
                  </span>
                  {topPlayers[0]?.boost_label && (
                    <span className='ml-1'>
                      <BoostInlineElement
                        boostName={topPlayers[0]?.boost_label} 
                        color={topPlayers[0]?.squad_color || '#6B7280'}
                        showLabel={true} 
                        size="S" 
                      />
                    </span>
                  )}
                </div>
                <span className="text-gray-900 dark:text-white text-sm whitespace-nowrap ml-2">
                  {topPlayers[0]?.fantasy_points} pts
                </span>
              </div>
            )}
            
            {/* Player 2 */}
            {topPlayers.length > 1 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-gray-900 dark:text-white text-sm truncate max-w-[150px]">
                    {topPlayers[1]?.player_name}
                  </span>
                  {topPlayers[1]?.boost_label && (
                    <span className='ml-1'>
                      <BoostInlineElement
                        boostName={topPlayers[1]?.boost_label} 
                        color={topPlayers[1]?.squad_color || '#6B7280'}
                        showLabel={true} 
                        size="S" 
                      />
                    </span>
                  )}
                </div>
                <span className="text-gray-900 dark:text-white text-sm whitespace-nowrap ml-2">
                  {topPlayers[1]?.fantasy_points} pts
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Fantasy Stats Section - Top Squads */}
        {!loading && topSquads.length > 0 && (
          <div>
            <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium mb-2">
              TOP SQUADS
            </div>
            
            {/* Squad 1 */}
            {topSquads.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div 
                    className="h-4 w-1 mr-1.5 rounded-sm"
                    style={{ backgroundColor: topSquads[0]?.color || '#6B7280' }}
                  />
                  <span className="text-gray-900 dark:text-white text-sm truncate max-w-[150px]">
                    {topSquads[0]?.name}
                  </span>
                </div>
                <span className="text-gray-900 dark:text-white text-sm whitespace-nowrap ml-2">
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
                  <span className="text-gray-900 dark:text-white text-sm truncate max-w-[150px]">
                    {topSquads[1]?.name}
                  </span>
                </div>
                <span className="text-gray-900 dark:text-white text-sm whitespace-nowrap ml-2">
                  {topSquads[1]?.match_points} pts
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchCard;