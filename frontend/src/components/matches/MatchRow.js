import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Info, Hourglass, Calendar, Clock } from 'lucide-react';
import api from '../../utils/axios';
import BoostInlineElement from '../elements/BoostInlineElement';
import CapIcon from '../elements/icons/CapIcon';
import { getTextColorForBackground } from '../../utils/colorUtils';

// Utility: hex to rgba
const hexToRgba = (hex, opacity) => {
  if (!hex || typeof hex !== 'string') return `rgba(107, 114, 128, ${opacity})`; // fallback to gray
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const capitalizeFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

const getTeamPillProps = (team) => {
  const hasColor = Boolean(team?.primary_color);

  if (!hasColor) {
    return {
      className: 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700/70 dark:text-slate-100 dark:border-slate-500',
      style: undefined,
    };
  }

  return {
    className: '',
    style: {
      backgroundColor: `#${team.primary_color}`,
      color: getTextColorForBackground(team.primary_color || ''),
    },
  };
};

const MatchRow = ({ match, leagueId }) => {
  const navigate = useNavigate();
  const [topPlayers, setTopPlayers] = useState([]);
  const [topSquads, setTopSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Batting order logic (same as MatchCardMin)
  let battingFirstTeam = match.team_1;
  let battingSecondTeam = match.team_2;
  if (match.toss_winner && match.toss_decision && match.team_1 && match.team_2) {
    if (match.toss_decision === 'BAT') {
      battingFirstTeam = match.toss_winner;
      battingSecondTeam = (match.team_1.id === match.toss_winner.id) ? match.team_2 : match.team_1;
    } else {
      battingFirstTeam = (match.team_1.id === match.toss_winner.id) ? match.team_2 : match.team_1;
      battingSecondTeam = match.toss_winner;
    }
  }

  useEffect(() => {
    setLoading(true);
    setTopPlayers([]);
    setTopSquads([]);
    setTimeRemaining(null);

    if (match && ['COMPLETED', 'LIVE', 'NO_RESULT'].includes(match.status)) {
      fetchFantasyStats();
    } else {
      setLoading(false);
    }

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
      setTimeRemaining(calculateTimeRemaining());
      const timer = setInterval(() => {
        const remaining = calculateTimeRemaining();
        setTimeRemaining(remaining);
        if (!remaining) clearInterval(timer);
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [match?.id, leagueId, match?.status, match?.date]);

  const fetchFantasyStats = async () => {
    try {
      setLoading(true);
      const endpoint = leagueId
        ? `/leagues/${leagueId}/matches/${match.id}/stats/`
        : `/matches/${match.id}/stats/`;
      const response = await api.get(endpoint);
      setTopPlayers(response.data.top_players || []);
      setTopSquads(response.data.top_squads || []);
    } catch (err) {
      // ignore error for now
    } finally {
      setLoading(false);
    }
  };

  const handleMatchClick = () => {
    if (!['COMPLETED', 'NO_RESULT', 'ABANDONED', 'LIVE'].includes(match.status)) return;
    if (leagueId) {
      navigate(`/leagues/${leagueId}/matches/${match.id}`);
    } else {
      navigate(`/matches/${match.id}`);
    }
  };

  // Formatters
  const formatMatchDateTime = () => {
    if (!match.date) return { date: '', time: '' };
    const matchDate = new Date(match.date);
    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    return {
      date: matchDate.toLocaleDateString(undefined, dateOptions),
      time: matchDate.toLocaleTimeString(undefined, timeOptions)
    };
  };
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
  const formatScore = (runs, wickets, overs) => {
    if (runs === undefined || runs === null || isNaN(runs)) return '';
    const wicketsDisplay = (wickets !== undefined && wickets !== null && !isNaN(wickets) && wickets < 10)
      ? `/${wickets}` : '';
    const oversDisplay = (overs !== undefined && overs !== null && overs !== '')
      ? ` (${overs} ov)` : '';
    return `${runs}${wicketsDisplay}${oversDisplay}`;
  };

  const formattedDateTime = formatMatchDateTime();
  const firstTeamPill = getTeamPillProps(battingFirstTeam);
  const secondTeamPill = getTeamPillProps(battingSecondTeam);

  // Determine winner id for styling
  const winnerId = (match.status === 'COMPLETED' && match.winner) ? match.winner.id : null;
  let winPhrase = '';
  if (match.status === 'COMPLETED' && match.winner) {
    if (match.win_type === 'RUNS') {
      winPhrase = `by ${match.win_margin} run${match.win_margin === 1 ? '' : 's'}`;
    } else if (match.win_type === 'WICKETS') {
      winPhrase = `by ${match.win_margin} wicket${match.win_margin === 1 ? '' : 's'}`;
    } else if (match.win_type === 'TIE') {
      winPhrase = 'Match tied';
    } else if (match.win_type === 'SUPER_OVER') {
      winPhrase = 'via Super Over';
    }
  }

  // Table row
  return (
    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition align-middle">
      {/* Match number + Stage (stacked, both text-xs) */}
      <td className="px-3 py-2 align-middle font-caption font-semibold text-neutral-900 dark:text-white text-xs w-32 min-w-[7rem]">
        <div className="flex flex-col">
          <span>Match {match.match_number}</span>
          {/* <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
            {capitalizeFirst(match.stage) || "League"}
          </span> */}
          {match.status === 'SCHEDULED' && timeRemaining && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-900 text-neutral-500 ml-0 mt-1 w-fit">
              <Hourglass className="h-2.5 w-2.5 mr-1 text-neutral-400 dark:text-neutral-600" />
              {formatCountdown()}
            </span>
          )}
        </div>
      </td>
      {/* Date + Time (stacked, both text-xs) */}
      <td className="px-3 py-2 align-middle text-xs text-neutral-700 dark:text-neutral-300 w-32 min-w-[7rem]">
        <div className="flex flex-col gap-1">
          <span>{formattedDateTime.date}</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{formattedDateTime.time}</span>
        </div>
      </td>
      {/* Teams & Scores (styled, with winner highlight and result phrase) */}
      <td className="px-3 py-2 align-middle text-xs w-64 min-w-[16rem]">
        <div className="flex flex-col">
          {/* SCHEDULED: Both teams on one row */}
          {match.status === 'SCHEDULED' ? (
            <div className="flex items-center gap-2 min-h-[1.75rem]">
              <span
                className={`px-2 py-0.5 rounded-md font-caption font-semibold text-xs ${firstTeamPill.className}`}
                style={firstTeamPill.style}
              >
                {battingFirstTeam?.short_name || battingFirstTeam?.name || 'TBD'}
              </span>
              <span className="mx-1 text-neutral-400 dark:text-neutral-600 font-bold">vs</span>
              <span
                className={`px-2 py-0.5 rounded-md font-caption font-semibold text-xs ${secondTeamPill.className}`}
                style={secondTeamPill.style}
              >
                {battingSecondTeam?.short_name || battingSecondTeam?.name || 'TBD'}
              </span>
            </div>
          ) : (
            <>
              {/* Batting first */}
              <div className="flex items-center gap-1 min-h-[1.75rem]">
                {battingFirstTeam && (
                  <span
                    className={`px-2 py-0.5 rounded-md font-caption font-semibold text-xs ${firstTeamPill.className}`}
                    style={firstTeamPill.style}
                  >
                    {battingFirstTeam.short_name || battingFirstTeam.name}
                  </span>
                )}
                {(match.status === 'COMPLETED' || match.status === 'LIVE' || match.status === 'NO_RESULT') && (
                  <span className={
                    `text-xs ${winnerId === battingFirstTeam?.id ? 'text-green-600 dark:text-green-500 font-semibold' : 'text-neutral-900 dark:text-white'}`
                  }>
                    {formatScore(match.inns_1_runs, match.inns_1_wickets, match.inns_1_overs)}
                  </span>
                )}
                {/* Show win phrase after the winning team's score */}
                {match.status === 'COMPLETED' && winnerId === battingFirstTeam?.id && winPhrase && (
                  <span className="text-xs">{winPhrase}</span>
                )}
              </div>
              {/* Batting second */}
              <div className="flex items-center gap-1 min-h-[1.75rem]">
                {battingSecondTeam && (
                  <span
                    className={`px-2 py-0.5 rounded-md font-caption font-semibold text-xs ${secondTeamPill.className}`}
                    style={secondTeamPill.style}
                  >
                    {battingSecondTeam.short_name || battingSecondTeam.name}
                  </span>
                )}
                {(match.status === 'COMPLETED' || match.status === 'LIVE' || match.status === 'NO_RESULT') && (
                  <span className={
                    `text-xs ${winnerId === battingSecondTeam?.id ? 'text-green-600 dark:text-green-500 font-semibold' : 'text-neutral-900 dark:text-white'}`
                  }>
                    {formatScore(match.inns_2_runs, match.inns_2_wickets, match.inns_2_overs)}
                  </span>
                )}
                {/* Show win phrase after the winning team's score */}
                {match.status === 'COMPLETED' && winnerId === battingSecondTeam?.id && winPhrase && (
                  <span className="text-xs">{winPhrase}</span>
                )}
              </div>
            </>
          )}
          {/* {(match.status === 'NO_RESULT' || match.status === 'ABANDONED') && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
              {match.status === 'NO_RESULT' ? 'No Result' : 'Match Abandoned'}
            </div>
          )} */}
          {match.status === 'LIVE' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 ml-0 mt-1 w-fit">
              LIVE
            </span>
          )}
        </div>
      </td>
      {/* Top Squads (stacked, fixed height for alignment) */}
      <td className="px-3 py-2 align-middle w-40 min-w-[10rem]">
        {!loading && topSquads.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {topSquads[0] && (
              <div className="flex items-center gap-1 min-h-[1.5rem]">
                <CapIcon
                  size={14}
                  strokeWidth={30}
                  color={topSquads[0]?.color || '#6B7280'} 
                  className="mr-1" 
                  style={{ minWidth: 14, minHeight: 14 }}
                />
                <span className="text-xs font-bold font-caption truncate max-w-[100px]">
                  {topSquads[0]?.name}
                </span>
                <span className="text-xs ml-2"><span className='font-number'>{topSquads[0]?.match_points}</span> pts</span>
              </div>
            )}
            {topSquads[1] && (
              <div className="flex items-center gap-1 min-h-[1.5rem]">
                <div 
                  className="h-3 w-1 rounded-sm"
                  style={{ backgroundColor: topSquads[1]?.color || '#6B7280' }}
                />
                <span className="text-xs truncate max-w-[100px]">{topSquads[1]?.name}</span>
                <span className="text-xs ml-2"><span className='font-number'>{topSquads[1]?.match_points}</span> pts</span>
              </div>
            )}
          </div>
        )}
      </td>
      {/* Top Performers (stacked, fixed height for alignment) */}
      <td className="px-3 py-2 align-middle w-40 min-w-[10rem]">
        {!loading && topPlayers.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {topPlayers[0] && (
              <div className="flex items-center gap-1 min-h-[1.5rem]">
                <span className="text-xs truncate max-w-[100px]">{topPlayers[0]?.player_name}</span>
                {topPlayers[0]?.boost_label ? (
                  <span className="flex items-center" style={{ minHeight: 14 }}>
                    <BoostInlineElement
                      boostName={topPlayers[0]?.boost_label} 
                      color={topPlayers[0]?.squad_color || '#6B7280'}
                      showLabel={false} 
                      size="XS" 
                    />
                  </span>
                ) : (
                  <span>
                    <div 
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: topPlayers[0]?.squad_color || '#6B7280' }}
                    />
                  </span>
                )}
                <span className="text-xs ml-2"><span className='font-number'>{topPlayers[0]?.fantasy_points}</span> pts</span>
              </div>
            )}
            {topPlayers[1] && (
              <div className="flex items-center gap-1 min-h-[1.5rem]">
                <span className="text-xs truncate max-w-[100px]">{topPlayers[1]?.player_name}</span>
                {topPlayers[1]?.boost_label ? (
                  <span className="flex items-center" style={{ minHeight: 14 }}>
                    <BoostInlineElement
                      boostName={topPlayers[1]?.boost_label} 
                      color={topPlayers[1]?.squad_color || '#6B7280'}
                      showLabel={false} 
                      size="XS" 
                    />
                  </span>
                ) : (
                  <span>
                    <div 
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: topPlayers[1]?.squad_color || '#6B7280' }}
                    />
                  </span>
                )}
                <span className="text-xs ml-2"><span className='font-number'>{topPlayers[1]?.fantasy_points}</span> pts</span>
              </div>
            )}
          </div>
        )}
      </td>
      {/* Link to match */}
      <td className="px-3 py-2 align-middle w-20 min-w-[4rem]">
        {['COMPLETED', 'NO_RESULT', 'LIVE'].includes(match.status) && (
          <button
            onClick={handleMatchClick}
            className="lg-button-ghost lg-rounded-md px-2 py-1 text-xs flex items-center transition-all duration-150 focus:lg-focus hover:bg-[rgba(31,190,221,0.08)] dark:hover:bg-[rgba(31,190,221,0.12)]"
            aria-label="View match details"
          >
            Details
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  );
};

export default MatchRow;
