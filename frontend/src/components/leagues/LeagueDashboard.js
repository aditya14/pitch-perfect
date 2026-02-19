// The issue is likely the LeagueRunningTotal graph or another element overlaying the table
// Let's add z-index and isolation to prevent overlay issues

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import MatchCard from '../matches/MatchCard';
import LeagueRunningTotal from '../elements/graphs/LeagueRunningTotal';
import { ArrowRight, Maximize2, Zap } from 'lucide-react';

// Simple Fireworks component using canvas
const Fireworks = ({ color }) => {
  useEffect(() => {
    // Only run on mount
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = 50;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    function randomBetween(a, b) {
      return a + Math.random() * (b - a);
    }

    function createFirework() {
      const x = randomBetween(0.2, 0.8) * canvas.width;
      const y = randomBetween(0.2, 0.5) * canvas.height;
      const count = 32;
      for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        const speed = randomBetween(2, 5);
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
        });
      }
    }

    let fireworkInterval = setInterval(createFirework, 800);
    createFirework();

    let stopped = false;
    // Stop fireworks after 20 seconds
    const stopTimeout = setTimeout(() => {
      clearInterval(fireworkInterval);
      stopped = true;
    }, 20000);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, idx) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // gravity
        p.alpha -= 0.012;
      });
      particles = particles.filter(p => p.alpha > 0);
      // Only keep animating if there are particles or not stopped
      if (!stopped || particles.length > 0) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Remove canvas when done
        document.body.removeChild(canvas);
      }
    }
    animate();

    // Resize handler
    function handleResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(fireworkInterval);
      clearTimeout(stopTimeout);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, [color]);
  return null;
};

const LeagueDashboard = ({ league }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentMatches, setRecentMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [matchTab, setMatchTab] = useState('recent');
  const [boostPhase, setBoostPhase] = useState(null);
  const [boostLockTimeRemaining, setBoostLockTimeRemaining] = useState(null);
  const [activeDraftWindow, setActiveDraftWindow] = useState(null);
  const [draftLockTimeRemaining, setDraftLockTimeRemaining] = useState(null);

  const parsePhaseDate = (dateValue) => {
    if (!dateValue) return null;
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  useEffect(() => {
    if (league?.season?.id) {
      fetchMatches();
    }
  }, [league?.season?.id]);

  useEffect(() => {
    if (league?.my_squad?.id) {
      fetchBoostPhase();
    } else {
      setBoostPhase(null);
    }
  }, [league?.my_squad?.id]);

  useEffect(() => {
    if (league?.my_squad?.id && league?.season?.id) {
      fetchDraftWindows();
    } else {
      setActiveDraftWindow(null);
    }
  }, [league?.my_squad?.id, league?.season?.id]);

  useEffect(() => {
    if (!boostPhase?.lockAt) {
      setBoostLockTimeRemaining(null);
      return undefined;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const difference = boostPhase.lockAt - now;

      if (difference <= 0) return null;

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    setBoostLockTimeRemaining(calculateTimeRemaining());

    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setBoostLockTimeRemaining(remaining);

      if (!remaining) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [boostPhase?.lockAt]);

  useEffect(() => {
    if (!activeDraftWindow?.lockAt) {
      setDraftLockTimeRemaining(null);
      return undefined;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const difference = activeDraftWindow.lockAt - now;
      if (difference <= 0) return null;

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      return { days, hours, minutes, seconds };
    };

    setDraftLockTimeRemaining(calculateTimeRemaining());

    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setDraftLockTimeRemaining(remaining);
      if (!remaining) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeDraftWindow?.lockAt]);

  const formatBoostLockUnit = value => (value < 10 ? `0${value}` : `${value}`);
  const getBoostLockUnits = (remaining) => {
    if (!remaining) return [];
    if (remaining.days > 0) {
      return [
        { label: `${remaining.days > 1 ? 'days' : 'day'}`, value: remaining.days },
        { label: `${remaining.hours > 1 ? 'hours' : 'hour'}`, value: remaining.hours },
      ];
    }
    if (remaining.hours > 0) {
      return [
        { label: `${remaining.hours > 1 ? 'hours' : 'hour'}`, value: remaining.hours },
        { label: `${remaining.minutes > 1 ? 'minutes' : 'minute'}`, value: remaining.minutes },
      ];
    }
    return [
      { label: `${remaining.minutes > 1 ? 'minutes' : 'minute'}`, value: remaining.minutes },
      { label: `${remaining.seconds > 1 ? 'seconds' : 'second'}`, value: remaining.seconds },
    ];
  };
  const formatBoostLockDateTime = lockAt => {
    if (!lockAt) return '';
    return lockAt.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const getPreferredWindow = (windows) => {
    if (!windows?.length) return null;
    const active = windows.find((window) => window.is_open === true);
    if (active) return active;

    const now = new Date();
    const upcoming = windows
      .filter((window) => window.openAt > now)
      .sort((a, b) => a.openAt - b.openAt)[0];
    if (upcoming) return upcoming;

    return windows[windows.length - 1];
  };

  const fetchBoostPhase = async () => {
    try {
      const response = await api.get(`/squads/${league.my_squad.id}/phase-boosts/`);
      const phases = response.data?.phases || [];
      const now = new Date();
      const phaseMeta = phases
        .map(phase => {
          const startAt = parsePhaseDate(phase.start);
          const endAt = parsePhaseDate(phase.end);
          const openAt = parsePhaseDate(phase.open_at);
          const lockAt = parsePhaseDate(phase.lock_at);
          const isCurrent = startAt && endAt ? now >= startAt && now <= endAt : false;
          const isUpcoming = startAt ? now < startAt : false;
          const status = isCurrent ? 'current' : isUpcoming ? 'upcoming' : 'completed';
          return {
            ...phase,
            startAt,
            endAt,
            openAt,
            lockAt,
            status,
          };
        })
        .filter(phase => phase.openAt && now >= phase.openAt)
        .filter(phase => !phase.lockAt || now < phase.lockAt)
        .sort((a, b) => (a.phase || 0) - (b.phase || 0));

      const activePhase =
        phaseMeta.find(phase => phase.status === 'upcoming') ||
        phaseMeta.find(phase => phase.status === 'current') ||
        phaseMeta[0] ||
        null;

      setBoostPhase(activePhase);
    } catch (err) {
      console.warn('Non-critical: Failed to load boost phases:', err);
      setBoostPhase(null);
    }
  };

  const fetchDraftWindows = async () => {
    try {
      const response = await api.get(
        `/draft-windows/?season=${league.season.id}&kind=MID_SEASON&ordering=sequence`
      );
      const windows = Array.isArray(response.data)
        ? response.data
            .map((window) => ({
              ...window,
              openAt: parsePhaseDate(window.open_at),
              lockAt: parsePhaseDate(window.lock_at),
            }))
            .filter((window) => window.openAt && window.lockAt)
            .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
        : [];
      setActiveDraftWindow(getPreferredWindow(windows));
    } catch (err) {
      console.warn('Non-critical: Failed to load mid-season draft windows:', err);
      setActiveDraftWindow(null);
    }
  };

  const fetchMatches = async () => {
    if (!league?.season?.id) return;

    setLoadingMatches(true);
    
    try {
      const recentResponse = await api.get(`/seasons/${league.season.id}/matches/recent/`);
      setRecentMatches(recentResponse.data || []);
    } catch (err) {
      console.error('Error fetching recent matches:', err);
      setRecentMatches([]);
    }

    try {
      const upcomingResponse = await api.get(`/seasons/${league.season.id}/matches/`);
      const upcoming = (upcomingResponse.data || [])
        .filter(match => match.status === 'SCHEDULED')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);
      setUpcomingMatches(upcoming);
    } catch (err) {
      console.error('Error fetching upcoming matches:', err);
      setUpcomingMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleSquadClick = useCallback((squadId) => {
    const clickedSquad = league?.squads?.find(s => s.id === squadId);
    if (!clickedSquad) return;

    const isMySquad = clickedSquad.user === user?.id;
    
    if (isMySquad) {
      navigate(`/leagues/${league.id}/my_squad`);
    } else {
      navigate(`/leagues/${league.id}/squads/${squadId}`);
    }
  }, [league, user, navigate]);

  const isSeasonCompleted = league?.season?.status === 'COMPLETED';
  const sortedSquads = league?.squads?.slice().sort((a, b) => b.total_points - a.total_points) || [];
  const firstSquad = sortedSquads[0];
  const isDraftWindowOpen = activeDraftWindow?.is_open === true;
  const canShowDraftPanel = Boolean(league?.my_squad && activeDraftWindow && isDraftWindowOpen);

  return (
    <div className="space-y-8 pt-8">
      {/* Winner Banner */}
      {isSeasonCompleted && firstSquad && (
        <div
          className="lg-glass-frosted lg-rounded-xl lg-shine flex flex-col sm:flex-row items-center justify-center shadow-lg mb-2 py-4 px-4 sm:py-5 sm:px-8 font-caption text-lg sm:text-xl text-center gap-2 sm:gap-0"
          style={{
            borderLeft: `4px solid ${firstSquad.color || '#FFD700'}`,
            background: `linear-gradient(90deg, ${firstSquad.color}10, rgba(255, 255, 255, 0.6))`,
          }}
        >
          <span style={{ fontSize: 28, marginRight: 8 }}>🏆</span>
          <span className="text-neutral-900 dark:text-white">
            Congratulations <span className="font-bold">{firstSquad.name}</span>! 
            Winner of <span className="font-bold">{league.name} {league.season.name}</span>!
          </span>
        </div>
      )}

      {/* Fireworks overlay if season is completed and there is a winner */}
      {isSeasonCompleted && firstSquad && (
        <Fireworks color={firstSquad.color || '#FFD700'} />
      )}

      {boostPhase && league?.my_squad && (
        <div className="lg-glass lg-rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200 flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-md font-semibold text-neutral-900 dark:text-white font-caption">
                {boostPhase.phase === 1 ? 'Set' : 'Update'} boosts for {boostPhase.label || `Phase ${boostPhase.phase || ''}`.trim()}
              </div>
              {boostPhase?.lockAt && boostLockTimeRemaining && (
                <div className="mt-2">
                  <div className="text-sm flex flex-wrap items-center gap-2">
                    {/* <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse"></span> */}
                    <span className="text-neutral-700 dark:text-neutral-300">
                      Locks in
                    </span>
                    <div className="flex gap-2 text-neutral-900 dark:text-white font-semibold">
                      {getBoostLockUnits(boostLockTimeRemaining).map((unit) => (
                        <div key={unit.label} className="text-center">
                          <span className="font-mono font-bold inline-block text-right">{formatBoostLockUnit(unit.value)}</span>
                          <span className="text-neutral-500 text-xs ml-1">{unit.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    <span>{formatBoostLockDateTime(boostPhase.lockAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/leagues/${league.id}/my_squad?tab=boosts`)}
            className="w-full sm:w-auto py-2 px-4 lg-button text-white text-xs font-medium lg-rounded-md transition-all duration-200 inline-flex items-center justify-center"
          >
            <span className="font-caption font-bold">{boostPhase.phase === 1 ? 'Set' : 'Update'} Boosts</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      )}

      {canShowDraftPanel && (
        <div className="lg-glass lg-rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200 flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-md font-semibold text-neutral-900 dark:text-white font-caption">
                Update draft order for {activeDraftWindow.label}
              </div>
              {draftLockTimeRemaining && (
                <div className="mt-2">
                  <div className="text-sm flex flex-wrap items-center gap-2">
                    <span className="text-neutral-700 dark:text-neutral-300">
                      Locks in
                    </span>
                    <div className="flex gap-2 text-neutral-900 dark:text-white font-semibold">
                      {getBoostLockUnits(draftLockTimeRemaining).map((unit) => (
                        <div key={unit.label} className="text-center">
                          <span className="font-mono font-bold inline-block text-right">{formatBoostLockUnit(unit.value)}</span>
                          <span className="text-neutral-500 text-xs ml-1">{unit.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    <span>{formatBoostLockDateTime(activeDraftWindow.lockAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/leagues/${league.id}/draft`)}
            className="w-full sm:w-auto py-2 px-4 lg-button text-white text-xs font-medium lg-rounded-md transition-all duration-200 inline-flex items-center justify-center"
          >
            <span className="font-caption font-bold">Update Draft Order</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      )}

      {/* Main Content Grid - ADD ISOLATION AND Z-INDEX */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 isolate">
        {/* League Table - ADD RELATIVE POSITIONING AND Z-INDEX */}
        <div className="lg-glass lg-rounded-xl overflow-hidden lg-shine relative z-10">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <h2 className="text-xl font-caption font-semibold text-neutral-900 dark:text-white">
              Table
            </h2>
            <button
              type="button"
              onClick={() => navigate(`/leagues/${league.id}/table`)}
              className="relative z-20 shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md bg-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
              aria-label="Open full standings"
              title="Open full standings"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <div className="p-1 relative">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
              <thead className="bg-white/30 dark:bg-black/30">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                    Squad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/20 dark:bg-black/20 divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
                {sortedSquads.map((squad, index) => {
                  const isFirst = index === 0;
                  
                  return (
                    <tr
                      key={squad.id}
                      onClick={() => handleSquadClick(squad.id)}
                      className="cursor-pointer hover:bg-white/30 dark:hover:bg-white/5 transition-colors relative"
                      style={isFirst ? { 
                        backgroundColor: `${squad.color}15`
                      } : {}}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-neutral-900 dark:text-white ${isFirst ? 'text-md font-semibold' : 'text-sm'}`}>
                        {isFirst && isSeasonCompleted ? (
                          <span 
                            role="img" 
                            aria-label="Trophy" 
                            title="Winner" 
                            style={{ 
                              fontSize: 28, 
                              verticalAlign: 'middle', 
                              color: firstSquad.color || '#FFD700',
                              filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.2))',
                              pointerEvents: 'none'
                            }}
                          >
                            🏆
                          </span>
                        ) : (
                          index + 1
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center pointer-events-none">
                          <span
                            className="inline-block h-4 w-1 mr-1 rounded-sm"
                            style={{ backgroundColor: squad.color }}
                          />
                          <span className={`font-medium font-caption text-neutral-800 dark:text-neutral-200 ${isFirst ? 'text-md font-semibold' : 'text-sm'}`}>
                            {squad.name}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap font-semibold text-neutral-900 dark:text-white font-number text-sm`}>
                        {squad.total_points}
                      </td>
                    </tr>
                  );
                })}
                {sortedSquads.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      No squads have joined this league yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matches Section - ADD Z-INDEX */}
        <div className="space-y-4 max-w-[560px] relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => setMatchTab('recent')}
                className={`px-3 py-1.5 text-sm lg-rounded-md transition-all duration-200 ${
                  matchTab === 'recent' 
                    ? 'lg-glass-primary text-primary-700 dark:text-primary-300 font-medium' 
                    : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                Live/Recent
              </button>
              <button
                onClick={() => setMatchTab('upcoming')}
                className={`px-3 py-1.5 text-sm lg-rounded-md transition-all duration-200 ${
                  matchTab === 'upcoming' 
                    ? 'lg-glass-primary text-primary-700 dark:text-primary-300 font-medium' 
                    : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                Upcoming
              </button>
            </div>
          </div>

          {loadingMatches ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 lg-glass-tertiary lg-rounded-lg lg-shimmer" />
              ))}
            </div>
          ) : matchTab === 'recent' ? (
            recentMatches.length > 0 ? (
              <div className="space-y-4">
                {recentMatches.map(match => (
                  <MatchCard 
                    key={match.id} 
                    match={match} 
                    leagueId={league.id} 
                    compact={true}
                  />
                ))}
              </div>
            ) : (
              <div className="lg-glass-secondary lg-rounded-lg p-6 text-center">
                <p className="text-neutral-500 dark:text-neutral-400">
                  No recent matches available
                </p>
              </div>
            )
          ) : (
            upcomingMatches.length > 0 ? (
              <div className="space-y-4">
                {upcomingMatches.map(match => (
                  <MatchCard 
                    key={match.id}
                    match={{
                      ...match,
                      team_1: match.team_1 || { name: 'TBD', short_name: 'TBD' },
                      team_2: match.team_2 || { name: 'TBD', short_name: 'TBD' }
                    }}
                    leagueId={league.id}
                    compact={true}
                  />
                ))}
              </div>
            ) : (
              <div className="lg-glass-secondary lg-rounded-lg p-6 text-center">
                <p className="text-neutral-500 dark:text-neutral-400">
                  No upcoming matches available
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Running Total Graph - ADD RELATIVE AND Z-INDEX */}
      <LeagueRunningTotal league={league} />
    </div>
  );
};

export default LeagueDashboard;
