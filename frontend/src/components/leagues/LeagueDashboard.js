// The issue is likely the LeagueRunningTotal graph or another element overlaying the table
// Let's add z-index and isolation to prevent overlay issues

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import MatchCard from '../matches/MatchCard';
import LeagueRunningTotal from '../elements/graphs/LeagueRunningTotal';

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

  useEffect(() => {
    if (league?.season?.id) {
      fetchMatches();
    }
  }, [league?.season?.id]);

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
      const upcomingResponse = await api.get(`/seasons/${league.season.id}/matches/upcoming/`);
      setUpcomingMatches(upcomingResponse.data?.slice(0, 3) || []);
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

      {/* Main Content Grid - ADD ISOLATION AND Z-INDEX */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 isolate">
        {/* League Table - ADD RELATIVE POSITIONING AND Z-INDEX */}
        <div className="lg-glass lg-rounded-xl overflow-hidden lg-shine relative z-10">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl font-caption font-semibold text-neutral-900 dark:text-white">
              Table
            </h2>
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
      <div className="lg-glass lg-rounded-xl p-4 relative z-0">
        <LeagueRunningTotal league={league} />
      </div>
    </div>
  );
};

export default LeagueDashboard;