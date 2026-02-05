import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/axios';
import { usePlayerModal } from '../../context/PlayerModalContext';
import useDocumentTitle from '../../hooks/useDocumentTitle'; // Add this import

const GROUP_OPTIONS = [
    { value: 'squad', label: 'By Squad' },
    { value: 'team', label: 'By Team' },
    { value: 'role', label: 'By Role' },
];

const roleColorClass = (role) => {
  switch (role) {
    case 'BAT': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'BOWL': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'ALL': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'WK': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const squadColorClass = (color) => ({
  backgroundColor: color || '#6B7280'
});

const useIsLargeScreen = () => {
  const [isLarge, setIsLarge] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const onResize = () => setIsLarge(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isLarge;
};

const MatchPreview = ({ leagueContext }) => {
  const { matchId, leagueId } = useParams();
  const [players, setPlayers] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [groupBy, setGroupBy] = useState(leagueContext ? 'squad' : 'team');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { openPlayerModal } = usePlayerModal();
  const isLargeScreen = useIsLargeScreen();

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

  // --- Set document title logic ---
  const getPageTitle = () => {
    if (!matchInfo) return 'Match Preview';
    const date = matchInfo.date ? new Date(matchInfo.date) : null;
    const formattedDate = date
      ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
      : '';
    const matchTitle = matchInfo.team_1 && matchInfo.team_2
      ? `${matchInfo.team_1.short_name || matchInfo.team_1.name || 'Team 1'} vs ${matchInfo.team_2.short_name || matchInfo.team_2.name || 'Team 2'}, ${formattedDate}`
      : 'Match Preview';
    if (leagueContext && matchInfo.league_name) {
      return `${matchTitle} (${matchInfo.league_name})`;
    }
    return matchTitle;
  };

  useDocumentTitle(getPageTitle());

  const grouped = React.useMemo(() => {
    let initialGrouped = {};
    if (groupBy === 'team') {
      initialGrouped = players.reduce((acc, p) => {
        const key = p.ipl_team || 'Unknown';
        acc[key] = acc[key] || [];
        acc[key].push(p);
        return acc;
      }, {});
    } else if (groupBy === 'role') {
      initialGrouped = players.reduce((acc, p) => {
        const key = p.role || 'Unknown';
        acc[key] = acc[key] || [];
        acc[key].push(p);
        return acc;
      }, {});
    } else if (groupBy === 'squad' && leagueContext) {
      initialGrouped = players.reduce((acc, p) => {
        const key = p.fantasy_squad || 'Unassigned';
        acc[key] = acc[key] || [];
        acc[key].push(p);
        return acc;
      }, {});
      // Sort squads by number of players descending
      initialGrouped = Object.fromEntries(
        Object.entries(initialGrouped).sort((a, b) => b[1].length - a[1].length)
      );
    } else {
      initialGrouped = { All: players };
    }
    Object.keys(initialGrouped).forEach(key => {
      initialGrouped[key].sort((a, b) => (b.base_points || 0) - (a.base_points || 0));
    });
    return initialGrouped;
  }, [players, groupBy, leagueContext]);

  const squadColors = React.useMemo(() => {
    const map = {};
    players.forEach(p => {
      if (p.fantasy_squad && p.squad_color) map[p.fantasy_squad] = p.squad_color;
    });
    return map;
  }, [players]);

  if (loading) return <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">Loading preview...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const showIPLTeamCol = groupBy !== 'team';

  const getReadableDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  const getReadableTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

  // Card for each group
  const PlayerGroupCard = ({ title, players, groupColor }) => (
    <div className="bg-white dark:bg-neutral-900 shadow rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col">
      <div className="px-2 py-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center">
        {groupColor && (
          <span
            className="mr-2 w-1.5 h-5 rounded-md inline-block"
            style={squadColorClass(groupColor)}
          />
        )}
        <span className="font-bold font-caption text-primary-700 dark:text-primary-300 text-sm uppercase tracking-wider">{title}</span>
      </div>
      <div className="overflow-x-auto flex-grow">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="sr-only">
            <tr>
              <th>Player</th>
              <th>Info</th>
              <th className="text-right">Stats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {players.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No players
                </td>
              </tr>
            ) : (
              players.map((p) => (
                <tr key={p.id}>
                  {/* Player Name and Info */}
                  <td className="px-2 py-1 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                        onClick={() => openPlayerModal(p.id, leagueId)}
                      >
                        {p.name}
                      </span>
                      {/* Show role chip only if not grouping by role */}
                      {groupBy !== 'role' && (
                        <span className={`inline-flex items-center px-1 rounded text-[9px] font-medium ${roleColorClass(p.role)}`}>
                          {p.role}
                        </span>
                      )}
                      {/* Show IPL team next to name only if grouping by role */}
                      {groupBy === 'role' && (
                        <span className="ml-2 text-xs text-neutral-600 dark:text-neutral-300">{p.ipl_team || '-'}</span>
                      )}
                    </div>
                    {/* Info row below name */}
                    {groupBy === 'squad' && leagueContext ? (
                      // By Fantasy Squad: show team only (no squad name)
                      <div className="text-[11px] font-caption text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {p.ipl_team || '-'}
                      </div>
                    ) : groupBy === 'role' ? (
                      // By Role: show squad name and color (if available)
                      p.fantasy_squad ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className="inline-block w-1 h-3 rounded-sm flex-shrink-0"
                            style={squadColorClass(p.squad_color)}
                            title={p.fantasy_squad}
                          />
                          <span className="text-[11px] font-caption text-neutral-500 dark:text-neutral-400 truncate">
                            {p.fantasy_squad}
                          </span>
                        </div>
                      ) : null
                    ) : (
                      // By Team: show squad name and color (if available)
                      p.fantasy_squad ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className="inline-block w-1 h-3 rounded-sm flex-shrink-0"
                            style={squadColorClass(p.squad_color)}
                            title={p.fantasy_squad}
                          />
                          <span className="text-[11px] font-caption text-neutral-500 dark:text-neutral-400 truncate">
                            {p.fantasy_squad}
                          </span>
                        </div>
                      ) : null
                    )}
                  </td>
                  {/* Info column is always empty (for 2-col layout) */}
                  <td></td>
                  {/* Points/matches stacked */}
                  <td className="px-2 py-1.5 text-right align-middle">
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-base font-semibold text-neutral-900 dark:text-white">
                        {Number(p.base_points || 0).toLocaleString()} <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">pts</span>
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {p.matches} mt{p.matches === 1 ? '' : 's'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Responsive dynamic columns for group cards
  // Use minmax to allow cards to grow but not shrink below 280px
  // On mobile: 1 col, tablet: 2, desktop: 3+, ultra-wide: 4+
  const gridColsClass = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4";
  const filteredGroups = Object.entries(grouped).filter(([_, groupPlayers]) => groupPlayers.length > 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-6">
      <div className="mb-4 px-2 sm:px-0">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white font-caption">
          Match Preview
        </h1>
        {matchInfo?.team_1?.name && matchInfo?.team_2?.name && (
          <div className="mt-1 text-neutral-500 dark:text-neutral-400 text-sm font-caption">
            {matchInfo.team_1.name} vs {matchInfo.team_2.name}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-neutral-950 shadow rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-caption font-bold text-lg text-neutral-900 dark:text-white">
              {matchInfo?.team_1?.short_name} vs {matchInfo?.team_2?.short_name}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 font-caption text-sm">
              {matchInfo?.stage}
            </span>
          </div>
          <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm">
            {matchInfo && (
              <>
                <span>{getReadableDate(matchInfo.date)}</span>
                <span>•</span>
                <span>{getReadableTime(matchInfo.date)}</span>
                {matchInfo.venue && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-xs">{matchInfo.venue}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b-0 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          {GROUP_OPTIONS.map(opt => (
            (opt.value !== 'squad' || leagueContext) && (
              <button
                key={opt.value}
                className={`px-3 py-1 rounded-full text-xs font-caption font-semibold border transition-colors
                  ${groupBy === opt.value
                    ? 'bg-primary-600 text-white border-primary-700 shadow'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                  }`}
                onClick={() => setGroupBy(opt.value)}
              >
                {opt.label}
              </button>
            )
          ))}
        </div>
      </div>
      <div className={gridColsClass}>
        {filteredGroups.length === 0 ? (
          <div className="col-span-full text-center text-neutral-500 dark:text-neutral-400 py-8">
            No players found for this match.
          </div>
        ) : (
          filteredGroups.map(([group, groupPlayers]) => (
            <PlayerGroupCard
              key={group}
              title={group}
              players={groupPlayers}
              groupColor={groupBy === 'squad' ? squadColors[group] : null}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MatchPreview;
