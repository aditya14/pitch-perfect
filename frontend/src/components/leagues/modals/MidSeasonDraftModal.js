import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import api from '../../../utils/axios';
import DraftList from '../DraftList';

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

const MidSeasonDraftModal = ({ isOpen, onClose, leagueId }) => {
  const [draftablePlayers, setDraftablePlayers] = useState([]);
  const [draftOrders, setDraftOrders] = useState({});
  const [activeRole, setActiveRole] = useState('BAT');
  const [draftWindows, setDraftWindows] = useState([]);
  const [selectedDraftWindowId, setSelectedDraftWindowId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
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
    const leagueResponse = await api.get(`/leagues/${leagueId}/`);
    const seasonId = leagueResponse.data?.season?.id;
    if (!seasonId) {
      setDraftWindows([]);
      setSelectedDraftWindowId(null);
      return null;
    }

    const windowsResponse = await api.get(
      `/draft-windows/?season=${seasonId}&kind=MID_SEASON&ordering=sequence`
    );
    const windows = Array.isArray(windowsResponse.data)
      ? windowsResponse.data.slice().sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      : [];

    setDraftWindows(windows);
    const preferredId = getPreferredWindowId(windows);
    setSelectedDraftWindowId(preferredId);
    return preferredId;
  }, [leagueId]);

  const fetchDraftWorkspace = useCallback(async (windowId = selectedDraftWindowId) => {
    if (!leagueId || !windowId) return;
    
    try {
      setIsLoading(true);
      setError(null);

      const [poolResponse, ...orderResponses] = await Promise.all([
        api.get(`/leagues/${leagueId}/mid-season-draft/pool/?draft_window=${windowId}`),
        ...ROLE_TABS.map(({ key }) => (
          api.get(`/leagues/${leagueId}/mid-season-draft/order/?draft_window=${windowId}&role=${key}`)
        )),
      ]);

      setDraftablePlayers(poolResponse.data);
      const nextOrders = {};
      orderResponses.forEach((response, idx) => {
        nextOrders[ROLE_TABS[idx].key] = response.data || null;
      });
      setDraftOrders(nextOrders);

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching draft data:', error);
      setError(error.response?.data?.error || 'Failed to load draft data');
      setIsLoading(false);
    }
  }, [leagueId, selectedDraftWindowId]);

  // Fetch draft data when modal is opened
  useEffect(() => {
    if (isOpen && leagueId) {
      (async () => {
        try {
          setIsLoading(true);
          setError(null);
          const windowId = await fetchDraftWindows();
          if (!windowId) {
            setDraftablePlayers([]);
            setDraftOrders({});
            setError('No mid-season draft windows are configured for this season.');
            setIsLoading(false);
            return;
          }
          await fetchDraftWorkspace(windowId);
        } catch (error) {
          console.error('Error initializing draft modal:', error);
          setError(error.response?.data?.error || 'Failed to load draft windows');
          setIsLoading(false);
        }
      })();
    }
  }, [isOpen, leagueId, fetchDraftWindows, fetchDraftWorkspace]);

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
      setError(null);
      
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
    } catch (error) {
      console.error('Error saving draft order:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save draft order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleDraftWindowChange = async (windowId) => {
    const parsedId = Number(windowId);
    if (!parsedId || parsedId === selectedDraftWindowId) return;
    setSelectedDraftWindowId(parsedId);
    await fetchDraftWorkspace(parsedId);
  };

  const selectedDraftWindow = draftWindows.find((window) => window.id === selectedDraftWindowId) || null;
  const activeDraftOrder = draftOrders[activeRole] || null;
  const rolePlayers = useMemo(
    () => draftablePlayers.filter((player) => player.role === activeRole),
    [draftablePlayers, activeRole]
  );
  const roleCounts = useMemo(
    () => ROLE_TABS.reduce((acc, { key }) => ({ ...acc, [key]: draftablePlayers.filter((p) => p.role === key).length }), {}),
    [draftablePlayers]
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

  // Only render if the modal is open
  if (!isOpen) return null;

  // Use React Portal to render the modal at the document root
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm p-3 md:p-6 overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto w-full max-w-6xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Mid-Season Draft</h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Rank players by role for this draft window. Snake execution uses current league standings.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {draftWindows.length > 0 && (
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Draft Window</label>
              <select
                value={selectedDraftWindowId || ''}
                onChange={(e) => handleDraftWindowChange(e.target.value)}
                className="mt-1 w-full md:w-auto rounded-md border-neutral-300 shadow-sm bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-900 dark:text-white"
              >
                {draftWindows.map((window) => (
                  <option key={window.id} value={window.id}>
                    {window.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Opens: {formatDateTime(selectedDraftWindow?.open_at)} | Closes: {formatDateTime(selectedDraftWindow?.lock_at)}
              </p>
            </div>
          )}

          <div className="lg-glass lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Role Draft Preferences</h3>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusPillClass}`}>
                    {statusLabel}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                  BAT/ALL start rank 1 to last, WK/BOWL start last to rank 1.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Time Remaining</p>
                <p className={`text-lg md:text-xl font-semibold ${canEdit ? 'text-emerald-700 dark:text-emerald-300' : 'text-neutral-800 dark:text-neutral-200'}`}>
                  {activeDraftOrder ? formatTimeRemaining(liveClosesIn) : '--'}
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
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-44">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (!error && !activeDraftOrder) ? (
            <div className="rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-800">
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
              />
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MidSeasonDraftModal;
