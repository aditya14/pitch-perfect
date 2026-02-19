import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m ${secs}s remaining`;
};

const MidSeasonDraftPage = ({ league, leagueId }) => {
  const [players, setPlayers] = useState([]);
  const [draftOrders, setDraftOrders] = useState({});
  const [activeRole, setActiveRole] = useState('BAT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draftWindow, setDraftWindow] = useState(null);
  const [selectedDraftWindowId, setSelectedDraftWindowId] = useState(null);
  const [liveClosesIn, setLiveClosesIn] = useState(null);

  const getPreferredWindowId = (windows) => {
    if (!windows?.length) return null;
    const now = new Date();
    const active = windows.find((window) => {
      const openAt = new Date(window.open_at);
      const lockAt = new Date(window.lock_at);
      return openAt <= now && now <= lockAt;
    });
    if (active) return active.id;

    const upcoming = windows
      .filter((window) => new Date(window.open_at) > now)
      .sort((a, b) => new Date(a.open_at) - new Date(b.open_at))[0];
    if (upcoming) return upcoming.id;

    return windows[windows.length - 1].id;
  };

  const fetchDraftWindows = useCallback(async () => {
    if (!league?.season?.id) return null;

    const response = await api.get(
      `/draft-windows/?season=${league.season.id}&kind=MID_SEASON&ordering=sequence`
    );
    const windows = Array.isArray(response.data)
      ? response.data.slice().sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      : [];

    const preferredId = getPreferredWindowId(windows);
    const preferredWindow = windows.find((window) => window.id === preferredId) || null;
    setDraftWindow(preferredWindow);
    setSelectedDraftWindowId(preferredId);
    return preferredId;
  }, [league?.season?.id]);

  const fetchDraftWorkspace = useCallback(async (windowId = selectedDraftWindowId) => {
    if (!leagueId || !windowId) return;

    try {
      setLoading(true);
      setError(null);

      const [playersResponse, ...draftResponses] = await Promise.all([
        api.get(`/leagues/${leagueId}/mid-season-draft/pool/?draft_window=${windowId}`),
        ...ROLE_TABS.map(({ key }) => (
          api.get(`/leagues/${leagueId}/mid-season-draft/order/?draft_window=${windowId}&role=${key}`)
        )),
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
        'Failed to load your mid-season draft workspace.'
      );
    } finally {
      setLoading(false);
    }
  }, [leagueId, selectedDraftWindowId]);

  useEffect(() => {
    if (!leagueId || !league?.season?.id) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const windowId = await fetchDraftWindows();
        if (!windowId) {
          setPlayers([]);
          setDraftOrders({});
          setError('No mid-season draft windows are configured for this season.');
          setLoading(false);
          return;
        }
        await fetchDraftWorkspace(windowId);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load draft windows');
        setLoading(false);
      }
    })();
  }, [leagueId, league?.season?.id, fetchDraftWindows, fetchDraftWorkspace]);

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

  const saveDraftOrder = async (newOrder) => {
    if (!selectedDraftWindowId) return false;

    try {
      await api.post(`/leagues/${leagueId}/mid-season-draft/order/`, {
        order: newOrder,
        draft_window: selectedDraftWindowId,
        role: activeRole,
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

  const activeDraftOrder = draftOrders[activeRole] || null;
  const canEdit = Boolean(activeDraftOrder?.can_edit);
  const roleCounts = useMemo(
    () => ROLE_TABS.reduce((acc, { key }) => ({ ...acc, [key]: players.filter((p) => p.role === key).length }), {}),
    [players]
  );
  const rolePlayers = useMemo(
    () => players.filter((player) => player.role === activeRole),
    [players, activeRole]
  );
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

  const formatDateTime = (dateValue) => {
    if (!dateValue) return 'TBD';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'TBD';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 pt-6">
      <div className="lg-glass lg-rounded-xl p-5 border border-white/20 dark:border-neutral-700/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{draftWindow?.label || 'Draft'}</h2>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusPillClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
              {league?.name}
            </p>
            {draftWindow && (
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Opens: {formatDateTime(draftWindow.open_at)} | Closes: {formatDateTime(draftWindow.lock_at)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Time Remaining</p>
            <p className={`${canEdit ? 'text-emerald-700 dark:text-emerald-300' : 'text-neutral-800 dark:text-neutral-200'} text-lg md:text-xl font-semibold`}>
              {activeDraftOrder ? formatTimeRemaining(liveClosesIn) : '--'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ROLE_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveRole(key)}
              className={`group relative inline-flex items-center gap-2 px-3 py-2 lg-rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeRole === key
                  ? 'lg-glass-secondary text-primary-600 dark:text-primary-300'
                  : 'text-slate-700 dark:text-slate-300 hover:lg-glass-tertiary hover:text-primary-600 dark:hover:text-primary-300'
              }`}
            >
              {label} ({roleCounts[key] ?? 0})
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-neutral-700 dark:text-neutral-300">
          Rank players separately for BAT, WK, ALL, and BOWL. BAT/ALL start rank 1 to last; WK/BOWL start last to rank 1 when the snake draft runs.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <div>{error}</div>
          <button
            onClick={() => fetchDraftWorkspace()}
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
          No mid-season draft order is available for role {activeRole}.
        </div>
      ) : (
        activeDraftOrder && (
          <DraftList
            players={rolePlayers}
            draftOrder={activeDraftOrder}
            onSaveOrder={saveDraftOrder}
            leagueId={leagueId}
            canEdit={canEdit}
            liquidGlass
          />
        )
      )}
    </div>
  );
};

export default MidSeasonDraftPage;
