import React from 'react';
import { Trophy, Calendar, Clock, Info, MapPin } from 'lucide-react';

// Helper function to safely convert to lowercase
const safeToLowerCase = (str) => {
  return str && typeof str === 'string' ? str.toLowerCase() : '';
};

// Utility function to convert hex color to rgba with opacity
const hexToRgba = (hex, opacity) => {
  const normalizedHex = (hex || '').replace('#', '');

  if (normalizedHex.length !== 6) {
    return `rgba(107, 114, 128, ${opacity})`;
  }

  const r = parseInt(normalizedHex.substring(0, 2), 16);
  const g = parseInt(normalizedHex.substring(2, 4), 16);
  const b = parseInt(normalizedHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getStatusLabel = (status) => {
  if (!status) return 'UNKNOWN';
  return status.replace(/_/g, ' ');
};

const getStatusClasses = (status) => {
  if (status === 'LIVE') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'SCHEDULED') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (status === 'ABANDONED' || status === 'NO_RESULT') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  }
  return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
};

const getResultText = (matchData) => {
  if (!matchData) return 'Result pending';

  if (matchData.status === 'ABANDONED') return 'Match abandoned';
  if (matchData.status === 'NO_RESULT') return 'No result';

  if (matchData.status === 'COMPLETED') {
    if (!matchData.winner) return 'Result pending';

    const winnerName = matchData.winner.short_name || matchData.winner.name;

    if (matchData.win_type === 'RUNS') {
      return `${winnerName} won by ${matchData.win_margin} ${matchData.win_margin === 1 ? 'run' : 'runs'}`;
    }

    if (matchData.win_type === 'WICKETS') {
      return `${winnerName} won by ${matchData.win_margin} ${matchData.win_margin === 1 ? 'wicket' : 'wickets'}`;
    }

    if (matchData.win_type === 'TIE') return 'Match tied';
    if (matchData.win_type === 'SUPER_OVER') return `${winnerName} won via Super Over`;
    if (matchData.win_type === 'NO_RESULT') return 'No result';

    return `${winnerName} won`;
  }

  if (matchData.status === 'LIVE') return 'Match in progress';
  if (matchData.status === 'SCHEDULED') return 'Match not started';

  return 'Result pending';
};

const ScoreBlock = ({ team, inningsLabel, runs, wickets, overs, winnerId }) => {
  const teamColorHex = team?.primary_color ? `#${team.primary_color}` : '#6B7280';
  const isWinner = Boolean(winnerId && team?.id === winnerId);
  const hasScore = runs !== null && runs !== undefined && runs !== '';

  return (
    <div className="p-3 flex items-start justify-between gap-3">
      <div className="flex items-center min-w-0">
        <div
          className="h-4 w-4 mr-3 rounded-sm shrink-0"
          style={{
            backgroundColor: teamColorHex,
            boxShadow: isWinner ? `1px 1px 5px ${hexToRgba(teamColorHex, 0.9)}` : 'none',
            opacity: winnerId ? (isWinner ? 1 : 0.45) : 1
          }}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className={`text-base truncate ${isWinner ? 'font-bold' : 'font-medium'} text-neutral-900 dark:text-white`}>
              {team?.name || 'TBD'}
            </span>
            {/* {isWinner && <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />} */}
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{inningsLabel}</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        {hasScore ? (
          <>
            <div className={`text-2xl font-bold ${isWinner ? 'text-green-600 dark:text-green-500' : 'text-neutral-900 dark:text-white'}`}>
              {runs}
              {wickets !== null && wickets !== undefined && wickets !== '' && wickets !== 10 && `/${wickets}`}
            </div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {overs !== null && overs !== undefined && overs !== '' ? `(${overs} overs)` : '(overs pending)'}
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-neutral-400 dark:text-neutral-500">-</div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Yet to bat</div>
          </>
        )}
      </div>
    </div>
  );
};

const MatchOverview = ({ matchData }) => {
  if (!matchData) {
    return (
      <div className="lg-glass lg-rounded-xl overflow-hidden h-full animate-pulse">
        <div className="px-4 py-3 border-b border-neutral-200/70 dark:border-neutral-700/70 flex justify-between items-center">
          <div className="h-5 w-36 rounded bg-neutral-200/70 dark:bg-neutral-700/70" />
          <div className="h-5 w-24 rounded bg-neutral-200/70 dark:bg-neutral-700/70" />
        </div>

        <div className="p-4 space-y-3">
          <div className="h-12 rounded-lg bg-neutral-200/60 dark:bg-neutral-700/60" />
          <div className="h-24 rounded-lg bg-neutral-200/60 dark:bg-neutral-700/60" />
          <div className="h-20 rounded-lg bg-neutral-200/60 dark:bg-neutral-700/60" />
        </div>
      </div>
    );
  }

  // Determine which team batted first based on toss winner and toss decision
  let battingFirstTeam = matchData.team_1;
  let battingSecondTeam = matchData.team_2;

  if (matchData.toss_winner && matchData.toss_decision && matchData.team_1 && matchData.team_2) {
    if (matchData.toss_decision === 'BAT') {
      battingFirstTeam = matchData.toss_winner;
      battingSecondTeam = matchData.team_1.id === matchData.toss_winner.id ? matchData.team_2 : matchData.team_1;
    } else {
      battingFirstTeam = matchData.team_1.id === matchData.toss_winner.id ? matchData.team_2 : matchData.team_1;
      battingSecondTeam = matchData.toss_winner;
    }
  }

  const getReadableDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const getReadableTime = (dateString) => new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const winnerId = matchData.winner?.id || null;
  const tossWinner = matchData.toss_winner?.short_name || matchData.toss_winner?.name;
  const tossSummary = tossWinner && matchData.toss_decision
    ? `${tossWinner} chose to ${safeToLowerCase(matchData.toss_decision)}`
    : 'Toss pending';

  const detailsRows = [
    { label: 'Toss', value: tossSummary },
    {
      label: matchData.status === 'COMPLETED' ? 'Result' : 'Status',
      value: getResultText(matchData)
    },
    matchData.player_of_match
      ? { label: 'Player of Match', value: matchData.player_of_match.name }
      : null
  ].filter(Boolean);

  return (
    <div className="lg-glass lg-rounded-xl overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-neutral-200/70 dark:border-neutral-700/70 flex justify-between items-center gap-3">
        <div className="flex items-center">
          <h2 className="text-lg font-caption font-semibold text-neutral-900 dark:text-white">
            {matchData.name || `${matchData.team_1?.short_name || matchData.team_1?.name || 'Team 1'} vs ${matchData.team_2?.short_name || matchData.team_2?.name || 'Team 2'}`}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="px-2 py-0.5 text-xs rounded-md bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            Match #{matchData.match_number}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-md bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 uppercase">
            {matchData.stage || 'League'}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-md uppercase ${getStatusClasses(matchData.status)}`}>
            {getStatusLabel(matchData.status)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 text-sm">
          <div className="flex flex-wrap items-center text-neutral-600 dark:text-neutral-300 lg-glass-tertiary rounded-lg px-3 py-2 border border-white/30 dark:border-white/10">
            <Calendar className="w-4 h-4 mr-1.5" />
            <span>{getReadableDate(matchData.date)}</span>
            <span className="mx-1.5">&bull;</span>
            <Clock className="w-4 h-4 mr-1.5" />
            <span className="shrink-0">{getReadableTime(matchData.date)}</span>
            <span className="mx-1.5">&bull;</span>
            <MapPin className="w-4 h-4 mr-1.5" />
            <span className="truncate">{matchData.venue}</span>
          </div>
        </div>

        <div className="mb-3 overflow-hidden lg-glass-secondary border border-white/40 dark:border-white/10 rounded-lg divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
          <ScoreBlock
            team={battingFirstTeam}
            inningsLabel="1st Innings"
            runs={matchData.inns_1_runs}
            wickets={matchData.inns_1_wickets}
            overs={matchData.inns_1_overs}
            winnerId={winnerId}
          />
          <ScoreBlock
            team={battingSecondTeam}
            inningsLabel="2nd Innings"
            runs={matchData.inns_2_runs}
            wickets={matchData.inns_2_wickets}
            overs={matchData.inns_2_overs}
            winnerId={winnerId}
          />
        </div>

        <div className="lg-glass-tertiary p-2.5 rounded-lg border border-white/40 dark:border-white/10">
          <div className="space-y-1.5">
            {detailsRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 shrink-0 min-w-[92px]">
                  {row.label}
                </span>
                <span className="text-sm leading-5 text-neutral-900 dark:text-white text-right">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchOverview;
