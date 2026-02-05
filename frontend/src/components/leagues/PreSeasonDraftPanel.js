import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/axios';
import DraftList from './DraftList';

const ROLE_TABS = [
  { key: 'BAT', label: 'Batters' },
  { key: 'WK', label: 'Wicket Keepers' },
  { key: 'ALL', label: 'All-Rounders' },
  { key: 'BOWL', label: 'Bowlers' },
];

const formatTimeRemaining = (seconds) => {
  if (seconds === null || seconds === undefined) return 'No deadline set';
  if (seconds <= 0) return 'Draft locked';

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  if (minutes > 0) return `${minutes}m remaining`;
  return 'Locking soon';
};

const PreSeasonDraftPanel = ({ league, leagueId }) => {
  const [players, setPlayers] = useState([]);
  const [draftOrders, setDraftOrders] = useState({});
  const [activeRole, setActiveRole] = useState('BAT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveClosesIn, setLiveClosesIn] = useState(null);

  const fetchDraftWorkspace = useCallback(async () => {
    if (!league?.season?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [playersResponse, ...draftResponses] = await Promise.all([
        api.get(`/leagues/${leagueId}/players?season=${league.season.id}&no_cache=1`),
        ...ROLE_TABS.map(({ key }) => api.get(`/drafts/get_draft_order/?league_id=${leagueId}&role=${key}`)),
      ]);

      const roleOrders = {};
      draftResponses.forEach((response, idx) => {
        roleOrders[ROLE_TABS[idx].key] = response.data || null;
      });

      setPlayers(playersResponse.data || []);
      setDraftOrders(roleOrders);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to load your draft workspace.'
      );
    } finally {
      setLoading(false);
    }
  }, [league?.season?.id, leagueId]);

  useEffect(() => {
    fetchDraftWorkspace();
  }, [fetchDraftWorkspace]);

  useEffect(() => {
    const activeDraftOrder = draftOrders[activeRole];
    if (!activeDraftOrder) {
      setLiveClosesIn(null);
      return;
    }

    const initial = typeof activeDraftOrder.closes_in === 'number' ? activeDraftOrder.closes_in : null;
    setLiveClosesIn(initial);

    if (initial === null || initial <= 0) return;

    const timer = setInterval(() => {
      setLiveClosesIn((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRole, draftOrders]);

  const activeDraftOrder = draftOrders[activeRole] || null;
  const roleCounts = useMemo(
    () => ROLE_TABS.reduce((acc, { key }) => ({ ...acc, [key]: players.filter((p) => p.role === key).length }), {}),
    [players]
  );
  const rolePlayers = useMemo(
    () => players.filter((player) => player.role === activeRole),
    [players, activeRole]
  );

  const canEdit = Boolean(activeDraftOrder?.can_edit);
  const statusLabel = useMemo(() => {
    if (!activeDraftOrder) return 'Missing';
    if (canEdit) return 'Open';
    if (liveClosesIn === 0) return 'Locked';
    return 'Not Open';
  }, [activeDraftOrder, canEdit, liveClosesIn]);
  const statusPillClass = useMemo(() => {
    if (statusLabel === 'Open') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    if (statusLabel === 'Locked') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
    if (statusLabel === 'Not Open') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
  }, [statusLabel]);
  const remainingTextClass = canEdit
    ? 'text-emerald-700 dark:text-emerald-300'
    : 'text-neutral-800 dark:text-neutral-200';
  const timeRemainingText = activeDraftOrder ? formatTimeRemaining(liveClosesIn) : '--';

  const saveDraftOrder = async (newOrder) => {
    if (!activeDraftOrder?.id) return false;

    try {
      await api.patch(`/drafts/${activeDraftOrder.id}/update_order/`, {
        order: newOrder,
      });

      setDraftOrders((prev) => ({
        ...prev,
        [activeRole]: {
          ...prev[activeRole],
          order: newOrder,
        },
      }));
      return true;
    } catch (err) {
      throw new Error(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to save draft order'
      );
    }
  };

  return (
    <div className="space-y-6 pt-6">
      <div className="lg-glass lg-rounded-xl p-5 border border-white/20 dark:border-neutral-700/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Pre-Season Draft</h2>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusPillClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
              {league?.name} - {league?.season?.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Time Remaining</p>
            <p className={`text-lg md:text-xl font-semibold ${remainingTextClass}`}>
              {timeRemainingText}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ROLE_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveRole(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                activeRole === key
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white/80 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-700/70 dark:text-neutral-200 dark:border-neutral-600 dark:hover:bg-neutral-600'
              }`}
            >
              {label} ({roleCounts[key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <div>{error}</div>
          <button
            onClick={fetchDraftWorkspace}
            className="mt-2 text-sm underline text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (!error && !activeDraftOrder) ? (
        <div className="p-4 bg-amber-100 border border-amber-300 text-amber-800 rounded">
          No pre-season draft order is available for role {activeRole}.
        </div>
      ) : (
        activeDraftOrder && (
          <DraftList
            players={rolePlayers}
            draftOrder={activeDraftOrder}
            onSaveOrder={saveDraftOrder}
            leagueId={leagueId}
            canEdit={canEdit}
          />
        )
      )}
    </div>
  );
};

export default PreSeasonDraftPanel;
