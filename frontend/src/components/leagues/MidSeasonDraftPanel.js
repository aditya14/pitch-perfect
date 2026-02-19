import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Info, Clock } from 'lucide-react';
import api from '../../utils/axios';
import MidSeasonDraftOrderModal from './modals/MidSeasonDraftOrderModal';

const MidSeasonDraftPanel = ({ leagueId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draftOrder, setDraftOrder] = useState(null);
  const [players, setPlayers] = useState([]);
  const [retainedPlayers, setRetainedPlayers] = useState([]);
  const [saveError, setSaveError] = useState(null);
  const [draftWindows, setDraftWindows] = useState([]);
  const [selectedDraftWindowId, setSelectedDraftWindowId] = useState(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
    percentComplete: 0
  });

  const selectedDraftWindow = useMemo(
    () => draftWindows.find((window) => window.id === selectedDraftWindowId) || null,
    [draftWindows, selectedDraftWindowId]
  );

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

  const fetchDraftWindows = async () => {
    if (!leagueId) return null;
    const leagueResponse = await api.get(`/leagues/${leagueId}/`);
    const seasonId = leagueResponse.data?.season?.id;
    if (!seasonId) return null;

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
  };

  const fetchDraftOrder = async (windowId = selectedDraftWindowId) => {
    if (!leagueId || !windowId) return;

    setLoading(true);
    setError(null);

    try {
      const query = `?draft_window=${windowId}`;
      const retainedResponse = await api.get(`/leagues/${leagueId}/mid-season-draft/retained-players/${query}`);
      setRetainedPlayers(retainedResponse.data?.retained_players || []);

      const draftResponse = await api.get(`/leagues/${leagueId}/mid-season-draft/order/${query}`);
      setDraftOrder(draftResponse.data);

      const playersResponse = await api.get(`/leagues/${leagueId}/mid-season-draft/pool/${query}`);
      setPlayers(playersResponse.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching mid-season draft data:', err);
      setError(err.response?.data?.error || 'Failed to load draft data');
      setLoading(false);
    }
  };
  
  const saveDraftOrder = async (newOrder) => {
    if (!selectedDraftWindowId) throw new Error('No draft window selected');

    setSaveError(null);

    try {
      const response = await api.post(`/leagues/${leagueId}/mid-season-draft/order/`, {
        order: newOrder,
        draft_window: selectedDraftWindowId,
      });
      setDraftOrder(response.data);
      return response.data;
    } catch (err) {
      console.error('Error saving draft order:', err);
      setSaveError(err.response?.data?.error || 'Failed to save draft order');
      throw err;
    }
  };

  useEffect(() => {
    if (!leagueId) return;
    (async () => {
      try {
        const windowId = await fetchDraftWindows();
        if (windowId) {
          await fetchDraftOrder(windowId);
        } else {
          setError('No mid-season draft windows are configured for this season.');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load draft windows');
      }
    })();
  }, [leagueId]);

  useEffect(() => {
    const lockAt = selectedDraftWindow?.lock_at ? new Date(selectedDraftWindow.lock_at) : null;
    if (!lockAt || Number.isNaN(lockAt.getTime())) {
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        expired: false,
        percentComplete: 0,
      });
      return undefined;
    }

    const calculateTotalInitialSeconds = () => {
      const startDate = new Date(lockAt);
      startDate.setDate(startDate.getDate() - 7);
      return Math.max(0, Math.floor((lockAt - startDate) / 1000));
    };

    const totalInitialSeconds = calculateTotalInitialSeconds();

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = lockAt - now;
      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
          percentComplete: 100
        };
      }

      const startDate = new Date(lockAt);
      startDate.setDate(startDate.getDate() - 7);
      const elapsedSeconds = Math.floor((now - startDate) / 1000);
      const percentComplete = Math.min(100, Math.max(0, (elapsedSeconds / totalInitialSeconds) * 100));

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
        percentComplete
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [selectedDraftWindow?.lock_at]);

  const formatNumber = (num) => (num < 10 ? `0${num}` : `${num}`);

  const getDisplayUnits = () => {
    if (timeLeft.days > 0) return [{ label: 'Days', value: timeLeft.days }, { label: 'Hours', value: timeLeft.hours }];
    if (timeLeft.hours > 0) return [{ label: 'Hours', value: timeLeft.hours }, { label: 'Mins', value: timeLeft.minutes }];
    return [{ label: 'Mins', value: timeLeft.minutes }, { label: 'Secs', value: timeLeft.seconds }];
  };

  const getProgressColor = () => {
    if (timeLeft.days >= 3) return 'bg-emerald-500 dark:bg-emerald-600';
    if (timeLeft.days >= 1) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-red-500 dark:bg-red-600';
  };

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

  const handleOpenModal = () => {
    if (selectedDraftWindowId) {
      fetchDraftOrder(selectedDraftWindowId);
    }
    setIsModalOpen(true);
  };

  const handleDraftWindowChange = async (windowId) => {
    const parsedId = Number(windowId);
    if (!parsedId || parsedId === selectedDraftWindowId) return;
    setSelectedDraftWindowId(parsedId);
    await fetchDraftOrder(parsedId);
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Mid-Season Draft</h2>
      </div>
      
      <div className="p-4">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        ) : (
          <>
            {draftWindows.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Draft Window</label>
                <select
                  value={selectedDraftWindowId || ''}
                  onChange={(e) => handleDraftWindowChange(e.target.value)}
                  className="mt-1 w-full rounded-md border-neutral-300 shadow-sm bg-white dark:bg-neutral-700 dark:border-neutral-600 text-neutral-900 dark:text-white"
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

            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-medium text-neutral-900 dark:text-white">
                  {timeLeft.expired ? 'Draft Closed' : 'Draft Closes In'}
                </h3>
              </div>
              
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full mb-3 overflow-hidden">
                <div className={`h-full ${getProgressColor()} rounded-full transition-all duration-500 ease-in-out`} style={{ width: `${timeLeft.percentComplete}%` }} />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {getDisplayUnits().map((unit) => (
                  <div key={unit.label} className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-2 text-center">
                    <div className="font-mono font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white">
                      {formatNumber(unit.value)}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">{unit.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800 mb-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Mid-Season Draft Overview</h3>
                  <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-200">
                    <li>Boost assignments from the configured retention phase are automatically retained</li>
                    <li>The draft pool is based on teams marked as remaining in admin</li>
                    <li>BAT/ALL drafts start from rank 1, WK/BOWL drafts start from last rank</li>
                    <li>Snake format reverses each round</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={handleOpenModal}
                disabled={timeLeft.expired || !selectedDraftWindowId}
                className={`px-4 py-2 font-medium rounded-md ${
                  timeLeft.expired || !selectedDraftWindowId
                    ? 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                }`}
              >
                {timeLeft.expired ? 'Draft Closed' : 'Update Draft Preferences'}
              </button>
              
              {timeLeft.expired && (
                <div className="mt-2 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">The selected draft window has ended</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {isModalOpen && (
        <MidSeasonDraftOrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          leagueId={leagueId}
          players={players}
          saveDraftOrder={saveDraftOrder}
          draftOrder={draftOrder}
          isLoading={loading}
          saveError={saveError}
          retainedPlayers={retainedPlayers}
          draftWindow={selectedDraftWindow}
          draftWindowOptions={draftWindows}
          selectedDraftWindowId={selectedDraftWindowId}
          onDraftWindowChange={handleDraftWindowChange}
        />
      )}
    </div>
  );
};

export default MidSeasonDraftPanel;
