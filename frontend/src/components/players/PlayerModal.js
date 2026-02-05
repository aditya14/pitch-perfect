import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';

const formatPoints = (value) => {
  if (Number.isFinite(value)) {
    return value.toFixed(1);
  }
  return '0.0';
};

const buildDrawerSummary = (seasonStats, matches) => {
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
  const totalBase = totals.basePoints || 0;
  const totalBoost = totals.boostPoints || 0;
  const totalPoints = totals.totalPoints || 0;

  const basePct = totalPoints ? Math.round(((totalPoints - totalBoost) / totalPoints) * 100) : 0;
  const boostPct = totalPoints ? Math.round((totalBoost / totalPoints) * 100) : 0;

  const boostRoleCounts = matches.reduce((acc, match) => {
    if (match.boost_label) {
      acc[match.boost_label] = (acc[match.boost_label] || 0) + 1;
    }
    return acc;
  }, {});

  const boostRoles = Object.entries(boostRoleCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    totalMatches,
    totalBase,
    totalBoost,
    totalPoints,
    avgTotal: totalMatches ? totalPoints / totalMatches : 0,
    avgBoost: totalMatches ? totalBoost / totalMatches : 0,
    basePct,
    boostPct,
    boostRoles,
  };
};

const PlayerModal = ({ playerId, leagueId, isOpen, onClose }) => {
  const [playerData, setPlayerData] = useState(null);
  const [seasonStats, setSeasonStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const summary = useMemo(
    () => buildDrawerSummary(seasonStats, matches),
    [seasonStats, matches]
  );

  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      
      return () => {
        const scrollY = document.body.style.top;
        document.body.style.overflow = originalStyle;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };
    }
  }, [isOpen]);

  // Handle touch events to prevent background scrolling on iOS
  useEffect(() => {
    if (!isOpen) return;
    
    const handleTouchMove = (e) => {
      if (contentRef.current && contentRef.current.contains(e.target)) {
        if (contentRef.current.scrollHeight > contentRef.current.clientHeight) {
          return;
        }
      }
      e.preventDefault();
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen]);

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setPlayerData(null);
        setSeasonStats([]);
        setMatches([]);
        
        const [playerResponse, performanceResponse] = await Promise.all([
          axios.get(`/leagues/${leagueId}/players/${playerId}/`),
          axios.get(`/leagues/${leagueId}/players/${playerId}/performance/`),
        ]);
        setPlayerData(playerResponse.data);
        setSeasonStats(performanceResponse.data.seasonStats || []);
        setMatches(performanceResponse.data.matches || []);
      } catch (err) {
        console.error('Error loading player data:', err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (playerId && leagueId && isOpen) {
      loadPlayerData();
    }
  }, [playerId, leagueId, isOpen]);

  const handleExpand = () => {
    if (!playerId || !leagueId) return;
    const from = `${location.pathname}${location.search}`;
    onClose();
    navigate(`/leagues/${leagueId}/players/${playerId}`, { state: { from } });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 dark:bg-black/50" 
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[env(safe-area-inset-bottom,12px)]">
        <div 
          ref={modalRef}
          className="relative w-full max-h-[85vh] lg:max-w-3xl lg:mx-auto rounded-t-2xl lg-rounded-xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                {playerData ? `${playerData.name}` : 'Player'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {playerData?.team || 'Team'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExpand}
                className="lg-glass-tertiary lg-rounded-full p-2 text-neutral-700 dark:text-neutral-200 hover:bg-white/60 dark:hover:bg-neutral-800/80"
                aria-label="Expand player page"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="lg-glass-tertiary lg-rounded-full p-2 text-neutral-700 dark:text-neutral-200 hover:bg-white/60 dark:hover:bg-neutral-800/80"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={contentRef} className="flex-grow overflow-y-auto overscroll-contain">
            <div className="px-4 py-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent dark:border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="text-red-600 dark:text-red-400 text-center py-8">
                  {error}
                </div>
              ) : (
                <>
                  <div className="lg-glass lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 font-caption">
                      Season Snapshot
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="lg-glass-tertiary lg-rounded-md px-3 py-2 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Matches</div>
                        <div className="text-lg font-number text-neutral-900 dark:text-white">{summary.totalMatches}</div>
                      </div>
                      <div className="lg-glass-tertiary lg-rounded-md px-3 py-2 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total</div>
                        <div className="text-lg font-number text-neutral-900 dark:text-white">{Math.round(summary.totalPoints)}</div>
                      </div>
                      <div className="lg-glass-tertiary lg-rounded-md px-3 py-2 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total/Game</div>
                        <div className="text-lg font-number text-neutral-900 dark:text-white">{formatPoints(summary.avgTotal)}</div>
                      </div>
                      <div className="lg-glass-tertiary lg-rounded-md px-3 py-2 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Boost/Game</div>
                        <div className="text-lg font-number text-neutral-900 dark:text-white">{formatPoints(summary.avgBoost)}</div>
                      </div>
                      <div className="lg-glass-tertiary lg-rounded-md px-3 py-2 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Boost Total</div>
                        <div className="text-lg font-number text-neutral-900 dark:text-white">{Math.round(summary.totalBoost)}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex h-2 rounded-full overflow-hidden bg-neutral-200/80 dark:bg-neutral-700/70">
                        <div className="h-full bg-neutral-800/70 dark:bg-neutral-200/60" style={{ width: `${summary.basePct}%` }}></div>
                        <div className="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-purple-500" style={{ width: `${summary.boostPct}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-2">
                        <span>Base {summary.basePct}%</span>
                        <span>Boost {summary.boostPct}%</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Boost Roles Used</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {summary.boostRoles.length === 0 && (
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">None</span>
                        )}
                        {summary.boostRoles.map((role) => (
                          <span
                            key={role.label}
                            className="text-[10px] px-2 py-1 rounded-full bg-white/70 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-200"
                          >
                            {role.label} x{role.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleExpand}
                    className="w-full lg-glass-tertiary lg-rounded-full py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200"
                  >
                    Expand Full Player Page
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlayerModal;
