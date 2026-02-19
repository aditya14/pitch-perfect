import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Anchor,
  Calendar,
  ChevronLeft,
  Crown,
  Handshake,
  Shield,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Zap,
  Bomb,
} from 'lucide-react';
import axios from '../../utils/axios';

const normalizeRoleLabel = (label) => {
  if (!label) return 'No Boost';
  const clean = label.toLowerCase().replace(/[^a-z]/g, '');
  if (clean === 'vicecaptain') return 'Vice-Captain';
  if (clean === 'captain') return 'Captain';
  if (clean === 'safehands') return 'Safe Hands';
  return label;
};

const isLeadershipBoost = (label) => {
  const normalized = normalizeRoleLabel(label);
  return normalized === 'Captain' || normalized === 'Vice-Captain';
};

const getRoleIcon = (roleName, size = 16) => {
  switch (normalizeRoleLabel(roleName)) {
    case 'Captain':
      return <Crown size={size} className="text-amber-500" />;
    case 'Vice-Captain':
      return <Swords size={size} className="text-slate-500" />;
    case 'Slogger':
      return <Zap size={size} className="text-red-500" />;
    case 'Anchor':
      return <Anchor size={size} className="text-yellow-500" />;
    case 'Safe Hands':
      return <Handshake size={size} className="text-cyan-500" />;
    case 'Rattler':
      return <Bomb size={size} className="text-green-500" />;
    case 'Guardian':
      return <Shield size={size} className="text-emerald-500" />;
    default:
      return <Sparkles size={size} className="text-purple-500" />;
  }
};

const formatPoints = (value, fallback = '--') => {
  if (Number.isFinite(value)) {
    return value.toFixed(1);
  }
  return fallback;
};

const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const buildDecisionMetrics = (seasonStats, matches) => {
  const overall = seasonStats.find((stat) => stat.squad === 'Overall');
  const totals = overall || seasonStats.reduce(
    (acc, stat) => ({
      matches: acc.matches + (stat.matches || 0),
      basePoints: acc.basePoints + (stat.basePoints || 0),
      boostPoints: acc.boostPoints + (stat.boostPoints || 0),
      totalPoints: acc.totalPoints + (stat.totalPoints || 0),
    }),
    { matches: 0, basePoints: 0, boostPoints: 0, totalPoints: 0 }
  );

  const totalMatches = totals.matches || 0;
  const totalPoints = totals.totalPoints || 0;
  const totalBoost = totals.boostPoints || 0;
  const totalBase = totals.basePoints || 0;
  const avgPoints = totalMatches ? totalPoints / totalMatches : null;

  const pointsArray = matches
    .map((match) => match.totalPoints ?? match.points)
    .filter((value) => Number.isFinite(value));

  const p25 = percentile(pointsArray, 0.25);
  const p90 = percentile(pointsArray, 0.9);

  const boostedMatches = matches.filter((match) => (match.boostPoints || 0) > 0);
  const avgBoostDelta = boostedMatches.length
    ? boostedMatches.reduce((sum, match) => sum + (match.boostPoints || 0), 0) / boostedMatches.length
    : null;

  const boostRelianceRatio = totalPoints ? totalBoost / totalPoints : null;
  let boostReliance = '--';
  if (boostRelianceRatio !== null) {
    if (boostRelianceRatio < 0.1) boostReliance = 'Low';
    else if (boostRelianceRatio < 0.25) boostReliance = 'Medium';
    else boostReliance = 'High';
  }

  const mean = pointsArray.length
    ? pointsArray.reduce((sum, value) => sum + value, 0) / pointsArray.length
    : 0;
  const variance = pointsArray.length
    ? pointsArray.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / pointsArray.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const cv = mean ? stdDev / mean : null;

  let consistency = '--';
  if (cv !== null) {
    if (cv > 0.7) consistency = 'Volatile';
    else if (cv > 0.35) consistency = 'Medium';
    else consistency = 'High';
  }

  let captainValue = null;
  if (totalMatches >= 3 && avgPoints !== null) {
    if (avgPoints >= 70) captainValue = 5;
    else if (avgPoints >= 55) captainValue = 4;
    else if (avgPoints >= 40) captainValue = 3;
    else if (avgPoints >= 25) captainValue = 2;
    else captainValue = 1;
  }

  return {
    totalMatches,
    totalPoints,
    totalBase,
    totalBoost,
    avgPoints,
    p25,
    p90,
    avgBoostDelta,
    boostReliance,
    captainValue,
    consistency,
  };
};

const buildRoleRows = (matches) => {
  const grouped = matches.reduce((acc, match) => {
    const label = normalizeRoleLabel(match.boost_label);
    const entry = acc[label] || { label, used: 0, totalPoints: 0, boostPoints: 0 };
    entry.used += 1;
    entry.totalPoints += match.totalPoints ?? match.points ?? 0;
    entry.boostPoints += match.boostPoints || 0;
    acc[label] = entry;
    return acc;
  }, {});

  return Object.values(grouped)
    .map((entry) => ({
      ...entry,
      avgPoints: entry.used ? entry.totalPoints / entry.used : 0,
      avgBoostGain: entry.used ? entry.boostPoints / entry.used : 0,
    }))
    .sort((a, b) => b.avgPoints - a.avgPoints);
};

const VerdictChip = ({ label, value, children }) => (
  <div className="lg-glass-tertiary lg-rounded-full px-3 py-2 flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-200">
    <span className="uppercase tracking-wider text-[9px] text-neutral-500 dark:text-neutral-400">{label}</span>
    <span className="font-semibold">{value}</span>
    {children}
  </div>
);

const StarRating = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, index) => {
      const active = rating && index < rating;
      return (
        <Star
          key={`star-${index}`}
          size={14}
          className={active ? 'text-amber-500' : 'text-neutral-300 dark:text-neutral-600'}
          fill={active ? 'currentColor' : 'none'}
        />
      );
    })}
  </div>
);

const PlayerMatchCard = ({ match, p25, p90, average }) => {
  const totalPoints = match.totalPoints ?? match.points ?? 0;
  const basePoints = match.basePoints ?? totalPoints - (match.boostPoints || 0);
  const boostPoints = match.boostPoints || 0;
  const roleLabel = normalizeRoleLabel(match.boost_label);
  const isBoosted = boostPoints > 0;
  const isHigh = p90 !== null ? totalPoints >= p90 : average !== null && totalPoints >= average + 15;
  const isLow = p25 !== null ? totalPoints <= p25 : average !== null && totalPoints <= average - 15;

  return (
    <div
      className={`lg-glass lg-rounded-xl border border-white/20 dark:border-neutral-700/40 p-4 transition-all ${
        isHigh ? 'shadow-lg ring-1 ring-amber-300/50' : ''
      } ${isLow ? 'opacity-70' : ''} ${!isBoosted ? 'bg-white/70 dark:bg-neutral-800/60' : ''}`}
    >
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>{match.match?.date ? new Date(match.match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '--'}</span>
          <span className="uppercase tracking-wider">vs {match.opponent}</span>
        </div>
        <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
          roleLabel === 'No Boost' ? 'bg-neutral-200/70 text-neutral-600 dark:bg-neutral-700/70 dark:text-neutral-300' : 'bg-amber-200/80 text-amber-900'
        }`}>
          {roleLabel === 'No Boost' ? 'No Boost' : roleLabel}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-3xl font-number text-neutral-900 dark:text-white">{Math.round(totalPoints)}</div>
        <div className="flex items-center gap-2">
          {roleLabel !== 'No Boost' && getRoleIcon(roleLabel, 16)}
          {totalPoints >= 100 && <Trophy className="h-4 w-4 text-yellow-500" />}
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-neutral-600 dark:text-neutral-300">
        {match.batting && (
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wider text-[10px] text-neutral-500 dark:text-neutral-400">Bat</span>
            <span>
              {match.batting.runs}
              {match.batting.not_out ? '*' : ''} ({match.batting.balls}) SR {match.batting.strike_rate?.toFixed(1) || '-'}
            </span>
          </div>
        )}
        {match.bowling && (
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wider text-[10px] text-neutral-500 dark:text-neutral-400">Bowl</span>
            <span>
              {match.bowling.wickets}/{match.bowling.runs} ({match.bowling.overs}) Econ {match.bowling.economy?.toFixed(1) || '-'}
            </span>
          </div>
        )}
        {match.fielding && (
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wider text-[10px] text-neutral-500 dark:text-neutral-400">Field</span>
            <span>
              {match.fielding.catches || 0}C {match.fielding.stumpings || 0}St {match.fielding.runouts || 0}RO
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
        <span>Base {Math.round(basePoints)}</span>
        {isBoosted ? (
          <span className="text-emerald-600 dark:text-emerald-400">Boost +{Math.round(boostPoints)}</span>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-500">No Boost</span>
        )}
      </div>
    </div>
  );
};

const PlayerPage = () => {
  const { leagueId, playerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [player, setPlayer] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchFilter, setMatchFilter] = useState('all');

  useEffect(() => {
    const loadPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const performanceResponse = await axios.get(
          `/leagues/${leagueId}/players/${playerId}/performance/`
        );

        const leaguePlayer = performanceResponse.data;
        setPlayer({
          id: playerId,
          name: leaguePlayer.name || 'Player',
          team: leaguePlayer.team || 'Team',
          role: null,
        });
        setPerformance(performanceResponse.data);
      } catch (err) {
        console.error('Error loading player page:', err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (playerId && leagueId) {
      loadPlayer();
    }
  }, [playerId, leagueId]);

  const metrics = useMemo(() => {
    if (!performance) {
      return buildDecisionMetrics([], []);
    }
    return buildDecisionMetrics(performance.seasonStats || [], performance.matches || []);
  }, [performance]);

  const roleRows = useMemo(() => buildRoleRows(performance?.matches || []), [performance]);

  const filteredMatches = useMemo(() => {
    const matches = performance?.matches || [];
    if (matchFilter === 'boosted') {
      return matches.filter((match) => (match.boostPoints || 0) > 0);
    }
    if (matchFilter === 'leadership') {
      return matches.filter((match) => isLeadershipBoost(match.boost_label));
    }
    return matches;
  }, [matchFilter, performance]);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(-1);
    }
  };

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
    <div className="w-full">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200/70 dark:border-neutral-700/70">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="lg-glass-tertiary lg-rounded-full p-2 text-neutral-700 dark:text-neutral-200 hover:bg-white/60 dark:hover:bg-neutral-800/80"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
              {player?.name || 'Player'}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {player?.team || 'Team'} {player?.role ? `| ${player.role}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12 space-y-6">
        <section className="pt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <VerdictChip label="Captain Value" value={metrics.captainValue ? '' : '--'}>
              {metrics.captainValue ? <StarRating rating={metrics.captainValue} /> : null}
            </VerdictChip>
            <VerdictChip label="Consistency" value={metrics.consistency} />
            <VerdictChip label="Boost Reliance" value={metrics.boostReliance} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="lg-glass lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Avg Pts / Match</div>
              <div className="mt-2 text-2xl font-number text-neutral-900 dark:text-white">{formatPoints(metrics.avgPoints)}</div>
            </div>
            <div className="lg-glass lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Floor (P25)</div>
              <div className="mt-2 text-2xl font-number text-neutral-900 dark:text-white">{formatPoints(metrics.p25)}</div>
            </div>
            <div className="lg-glass lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Ceiling (P90)</div>
              <div className="mt-2 text-2xl font-number text-neutral-900 dark:text-white">{formatPoints(metrics.p90)}</div>
            </div>
            <div className="lg-glass lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Avg Boost Delta</div>
              <div className="mt-2 text-2xl font-number text-neutral-900 dark:text-white">
                {metrics.avgBoostDelta === null ? '--' : `+${formatPoints(metrics.avgBoostDelta)}`}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Role Effectiveness</h2>
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Role ROI</span>
          </div>
          <div className="lg-glass lg-rounded-xl border border-white/20 dark:border-neutral-700/40 overflow-hidden">
            <div className="grid grid-cols-12 text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-4 py-2 bg-white/60 dark:bg-neutral-800/60">
              <div className="col-span-5">Role</div>
              <div className="col-span-2 text-center">Used</div>
              <div className="col-span-3 text-center">Avg Pts</div>
              <div className="col-span-2 text-right">Avg Boost</div>
            </div>
            <div className="divide-y divide-neutral-200/70 dark:divide-neutral-700/70">
              {roleRows.length === 0 && (
                <div className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">No role data yet.</div>
              )}
              {roleRows.map((row) => {
                const smallSample = row.used < 2;
                return (
                  <div
                    key={row.label}
                    className={`grid grid-cols-12 px-4 py-3 text-sm items-center ${smallSample ? 'opacity-60' : ''}`}
                  >
                    <div className="col-span-5 flex items-center gap-2 text-neutral-900 dark:text-white">
                      {row.label !== 'No Boost' ? getRoleIcon(row.label, 16) : <Zap className="h-4 w-4 text-neutral-400" />}
                      <span>{row.label}</span>
                      {smallSample && <span className="text-[10px] uppercase text-neutral-400">Small sample</span>}
                    </div>
                    <div className="col-span-2 text-center text-neutral-700 dark:text-neutral-200">{row.used}</div>
                    <div className="col-span-3 text-center text-neutral-900 dark:text-white">{formatPoints(row.avgPoints)}</div>
                    <div className="col-span-2 text-right text-emerald-600 dark:text-emerald-400">+{formatPoints(row.avgBoostGain, '0.0')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <details className="lg-glass-tertiary lg-rounded-xl border border-white/20 dark:border-neutral-700/40 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-900 dark:text-white">
            Season breakdown
          </summary>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="lg-glass lg-rounded-md px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Matches</div>
              <div className="text-lg font-number text-neutral-900 dark:text-white">{metrics.totalMatches}</div>
            </div>
            <div className="lg-glass lg-rounded-md px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total</div>
              <div className="text-lg font-number text-neutral-900 dark:text-white">{Math.round(metrics.totalPoints)}</div>
            </div>
            <div className="lg-glass lg-rounded-md px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Base Points</div>
              <div className="text-lg font-number text-neutral-900 dark:text-white">{Math.round(metrics.totalBase)}</div>
            </div>
            <div className="lg-glass lg-rounded-md px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Boost Points</div>
              <div className="text-lg font-number text-neutral-900 dark:text-white">{Math.round(metrics.totalBoost)}</div>
            </div>
          </div>
        </details>

        <section className="space-y-3">
          <div className="sticky top-[60px] z-20 lg-glass-tertiary lg-rounded-full p-1 inline-flex gap-1">
            {['all', 'boosted', 'leadership'].map((filter) => (
              <button
                key={filter}
                onClick={() => setMatchFilter(filter)}
                className={`px-3 py-1 text-[11px] uppercase tracking-wider rounded-full ${
                  matchFilter === filter
                    ? 'bg-white/90 dark:bg-neutral-900 text-neutral-900 dark:text-white shadow'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-neutral-700/60'
                }`}
              >
                {filter === 'all' ? 'All' : filter === 'boosted' ? 'Boosted' : 'Leadership'}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {filteredMatches.length === 0 && (
              <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">No matches to show.</div>
            )}
            {filteredMatches.map((match, index) => (
              <PlayerMatchCard
                key={`${match.match?.id || 'match'}-${index}`}
                match={match}
                p25={metrics.p25}
                p90={metrics.p90}
                average={metrics.avgPoints}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PlayerPage;
