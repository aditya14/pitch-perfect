import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/axios';
import { usePlayerModal } from '../../context/PlayerModalContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import LoadingScreen from '../elements/LoadingScreen';

const GROUP_OPTIONS = [
  { value: 'squad', label: 'By Squad' },
  { value: 'team', label: 'By Team' },
  { value: 'role', label: 'By Role' },
];

const roleColorClass = (role) => {
  switch (role) {
    case 'BAT':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'BOWL':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'ALL':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case 'WK':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const squadColorStyle = (color) => {
  if (!color) return { backgroundColor: '#6B7280' };
  return { backgroundColor: String(color).startsWith('#') ? color : `#${color}` };
};

const formatStageLabel = (stage) => {
  if (!stage) return 'League';
  return String(stage)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
};

const getReadableDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getReadableTime = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MatchPreview = ({ leagueContext }) => {
  const { matchId, leagueId } = useParams();
  const [players, setPlayers] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [groupBy, setGroupBy] = useState(leagueContext ? 'squad' : 'team');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { openPlayerModal } = usePlayerModal();

  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = leagueId
          ? `/leagues/${leagueId}/matches/${matchId}/preview/`
          : `/matches/${matchId}/preview/`;
        const res = await api.get(endpoint);
        setPlayers(res.data.players || []);
        setMatchInfo(res.data.match || null);
      } catch (err) {
        setError('Failed to load match preview');
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [matchId, leagueId]);

  const pageTitle = useMemo(() => {
    if (!matchInfo) return 'Match Preview';
    const teamOne = matchInfo.team_1?.short_name || matchInfo.team_1?.name || 'Team 1';
    const teamTwo = matchInfo.team_2?.short_name || matchInfo.team_2?.name || 'Team 2';
    return `${teamOne} vs ${teamTwo} Preview`;
  }, [matchInfo]);
  useDocumentTitle(pageTitle);

  const grouped = useMemo(() => {
    let initialGrouped = {};

    if (groupBy === 'team') {
      initialGrouped = players.reduce((acc, player) => {
        const key = player.ipl_team || 'Unknown';
        acc[key] = acc[key] || [];
        acc[key].push(player);
        return acc;
      }, {});
    } else if (groupBy === 'role') {
      initialGrouped = players.reduce((acc, player) => {
        const key = player.role || 'Unknown';
        acc[key] = acc[key] || [];
        acc[key].push(player);
        return acc;
      }, {});
    } else if (groupBy === 'squad' && leagueContext) {
      initialGrouped = players.reduce((acc, player) => {
        const key = player.fantasy_squad || 'Unassigned';
        acc[key] = acc[key] || [];
        acc[key].push(player);
        return acc;
      }, {});
      initialGrouped = Object.fromEntries(
        Object.entries(initialGrouped).sort((a, b) => b[1].length - a[1].length)
      );
    } else {
      initialGrouped = { All: players };
    }

    Object.keys(initialGrouped).forEach((key) => {
      initialGrouped[key].sort((a, b) => (b.base_points || 0) - (a.base_points || 0));
    });

    return initialGrouped;
  }, [players, groupBy, leagueContext]);

  const squadColors = useMemo(() => {
    const map = {};
    players.forEach((player) => {
      if (player.fantasy_squad && player.squad_color) {
        map[player.fantasy_squad] = player.squad_color;
      }
    });
    return map;
  }, [players]);

  if (loading) {
    return <LoadingScreen message="Loading Preview" description="Preparing match groups and player stats" />;
  }

  if (error) {
    return <div className="lg-alert lg-glass-danger">{error}</div>;
  }

  const filteredGroups = Object.entries(grouped).filter(([_, groupPlayers]) => groupPlayers.length > 0);
  const teamOneColor = matchInfo?.team_1?.primary_color ? `#${matchInfo.team_1.primary_color}` : '#6B7280';
  const teamTwoColor = matchInfo?.team_2?.primary_color ? `#${matchInfo.team_2.primary_color}` : '#6B7280';

  const PlayerGroupCard = ({ title, groupPlayers, groupColor }) => (
    <div className="lg-glass lg-rounded-xl lg-shine overflow-hidden flex flex-col min-h-[220px]">
      <div className="lg-glass-tertiary px-3 py-2 border-b border-neutral-200/60 dark:border-neutral-700/70">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center min-w-0">
            {groupColor && (
              <span
                className="mr-2 w-1.5 h-5 rounded-md inline-block flex-shrink-0"
                style={squadColorStyle(groupColor)}
              />
            )}
            <span className="font-bold font-caption text-sm uppercase tracking-wider text-neutral-900 dark:text-white truncate">
              {title}
            </span>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
            {groupPlayers.length} players
          </span>
        </div>
      </div>

      <div className="overflow-x-auto flex-grow">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="lg-glass-tertiary border-b border-neutral-200/60 dark:border-neutral-700/70">
            <tr>
              <th className="px-2 py-1 text-left font-medium text-neutral-500 dark:text-neutral-300">Player</th>
              <th className="px-2 py-1 text-right font-medium text-neutral-500 dark:text-neutral-300">Stats</th>
            </tr>
          </thead>
          <tbody>
            {groupPlayers.map((player, index) => (
              <tr
                key={player.id}
                className={index % 2 === 0 ? 'bg-white/20 dark:bg-black/20' : 'bg-white/5 dark:bg-black/10'}
              >
                <td className="px-2 py-1.5 align-top">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-xs font-medium text-primary-700 dark:text-primary-300 hover:underline cursor-pointer truncate"
                      onClick={() => openPlayerModal(player.id, leagueId)}
                    >
                      {player.name}
                    </span>
                    {groupBy !== 'role' && (
                      <span className={`inline-flex items-center px-1 rounded text-[9px] font-medium ${roleColorClass(player.role)}`}>
                        {player.role}
                      </span>
                    )}
                    {groupBy === 'role' && (
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {player.ipl_team || '-'}
                      </span>
                    )}
                  </div>

                  {groupBy === 'squad' && leagueContext ? (
                    <div className="text-[11px] font-caption text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {player.ipl_team || '-'}
                    </div>
                  ) : player.fantasy_squad ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="inline-block w-1 h-3 rounded-sm flex-shrink-0"
                        style={squadColorStyle(player.squad_color)}
                        title={player.fantasy_squad}
                      />
                      <span className="text-[11px] font-caption text-neutral-500 dark:text-neutral-400 truncate">
                        {player.fantasy_squad}
                      </span>
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-1.5 text-right align-middle">
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {Number(player.base_points || 0).toLocaleString()}
                      <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400"> pts</span>
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {player.matches} mt{player.matches === 1 ? '' : 's'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-2 pt-8 pb-4 sm:px-4 lg:px-6 md:pt-2 space-y-4">
      <div className="lg-glass lg-rounded-xl lg-shine overflow-hidden">
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${teamOneColor}, ${teamTwoColor})` }}
        />
        <div className="px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white font-caption truncate">
                Match Preview
              </h1>
              <div className="mt-0.5 text-sm font-caption text-neutral-500 dark:text-neutral-400">
                {(matchInfo?.team_1?.name || '-') + ' vs ' + (matchInfo?.team_2?.name || '-')}
              </div>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300 lg:justify-end">
              <span className="whitespace-nowrap">{formatStageLabel(matchInfo?.stage)}</span>
              <span className="text-neutral-400 dark:text-neutral-500">•</span>
              <span className="whitespace-nowrap">{getReadableDate(matchInfo?.date)}</span>
              <span className="text-neutral-400 dark:text-neutral-500">•</span>
              <span className="whitespace-nowrap">{getReadableTime(matchInfo?.date)}</span>
              {matchInfo?.venue && (
                <>
                  <span className="text-neutral-400 dark:text-neutral-500">•</span>
                  <span className="truncate max-w-[220px]">{matchInfo.venue}</span>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/60">
            <div className="flex flex-wrap gap-2">
              {GROUP_OPTIONS.map((option) => (
                (option.value !== 'squad' || leagueContext) && (
                  <button
                    key={option.value}
                    type="button"
                    className={`px-3 py-1.5 text-xs lg-rounded-md transition-all duration-200 ${
                      groupBy === option.value
                        ? 'lg-glass-primary text-primary-700 dark:text-primary-300 font-medium'
                        : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
                    }`}
                    onClick={() => setGroupBy(option.value)}
                  >
                    {option.label}
                  </button>
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="lg-glass-secondary lg-rounded-xl p-6 text-center text-neutral-500 dark:text-neutral-400">
          No players found for this match.
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
        >
          {filteredGroups.map(([group, groupPlayers]) => (
            <PlayerGroupCard
              key={group}
              title={group}
              groupPlayers={groupPlayers}
              groupColor={groupBy === 'squad' ? squadColors[group] : null}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchPreview;
